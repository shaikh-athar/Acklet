package com.code.acklet.github.service;

import com.code.acklet.event.config.RabbitMqConfig;
import com.code.acklet.github.dto.RepoImportEvent;
import com.code.acklet.github.entity.*;
import com.code.acklet.github.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RepositoryImportWorkers {

    private final GitHubAccountRepository accountRepository;
    private final GitHubImportJobRepository jobRepository;
    private final RepositoryRepository repositoryRepository;
    private final RepositoryMetadataRepository metadataRepository;
    private final RepositoryStatisticsRepository statisticsRepository;
    private final RepositoryHealthRepository healthRepository;
    private final RepositoryTreeRepository treeRepository;
    private final RepositoryProjectRepository projectRepository;
    private final RepositoryKnowledgeGraphRepository knowledgeGraphRepository;
    
    private final GitHubExtendedApiClient gitHubApiClient;
    private final SelectiveFileFetchService selectiveFileFetchService;
    private final AiRepositoryAnalysisEngine aiRepositoryAnalysisEngine;
    private final TemporaryWorkspaceManager workspaceManager;
    private final RabbitTemplate rabbitTemplate;

    // ── STEP 2: METADATA WORKER ────────────────────────────────────────────────

    @RabbitListener(queues = RabbitMqConfig.IMPORT_METADATA_QUEUE)
    @Transactional
    public void processMetadataFetch(RepoImportEvent event) {
        log.info("Metadata worker received import event for repo: {}", event.getRepoFullName());
        
        GitHubImportJob job = jobRepository.findById(event.getJobId()).orElse(null);
        if (job == null) return;

        try {
            job.setStatus(GitHubImportJob.ImportStatus.CLONING); // Step: Fetching Metadata
            job.setCurrentStep("Fetching Repository Metadata");
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);

            GitHubAccount account = accountRepository.findById(event.getAccountId()).orElseThrow();
            Map<String, Object> meta = gitHubApiClient.fetchExtendedMetadata(event.getRepoFullName(), account.getAccessToken());

            if (meta.isEmpty()) {
                log.warn("Could not retrieve metadata from GitHub for {}. Constructing progressive fallback layout.", event.getRepoFullName());
                String repoName = event.getRepoFullName().substring(event.getRepoFullName().indexOf('/') + 1);
                meta = new HashMap<>();
                meta.put("externalId", "FALLBACK_" + UUID.randomUUID());
                meta.put("name", repoName);
                meta.put("fullName", event.getRepoFullName());
                meta.put("owner", event.getRepoFullName().substring(0, event.getRepoFullName().indexOf('/')));
                meta.put("ownerType", "User");
                meta.put("ownerAvatar", "");
                meta.put("htmlUrl", "https://github.com/" + event.getRepoFullName());
                meta.put("description", "Imported via progressive fallback (limited Git provider metadata available)");
                meta.put("homepage", "");
                meta.put("isPrivate", false);
                meta.put("isFork", false);
                meta.put("isArchived", false);
                meta.put("stars", 0);
                meta.put("forks", 0);
                meta.put("watchers", 0);
                meta.put("openIssues", 0);
                meta.put("sizeKb", 0);
                meta.put("defaultBranch", "main");
                meta.put("licenseName", "Unknown");
                meta.put("primaryLanguage", "Unknown");
                meta.put("languages", Collections.emptyMap());
                meta.put("topics", Collections.emptyList());
                meta.put("hasReleases", false);
                meta.put("contributorsCount", 1);
            }

            // Sync Core Repository Info
            Repository repo = repositoryRepository.findByUserIdAndFullName(job.getUser().getId(), event.getRepoFullName()).orElseThrow();
            repo.setExternalId(String.valueOf(meta.get("externalId")));
            repo.setName(String.valueOf(meta.get("name")));
            repo.setDefaultBranch(String.valueOf(meta.get("defaultBranch")));
            repo.setPrivate((Boolean) meta.get("isPrivate"));
            repo.setHtmlUrl(String.valueOf(meta.get("htmlUrl")));
            repo.setStatusMetadataFetched(true);
            repo.setUpdatedAt(Instant.now());
            repo = repositoryRepository.save(repo);

            // Store Detailed Repository Metadata
            final Repository finalRepo = repo;
            RepositoryMetadata repMeta = metadataRepository.findByRepositoryId(repo.getId())
                    .orElseGet(() -> RepositoryMetadata.builder().repository(finalRepo).build());
            repMeta.setRepository(finalRepo);
            repMeta.setDescription((String) meta.get("description"));
            repMeta.setHomepage((String) meta.get("homepage"));
            repMeta.setLicenseName((String) meta.get("licenseName"));
            repMeta.setPrimaryLanguage((String) meta.get("primaryLanguage"));
            repMeta.setLanguages((Map<String, Long>) meta.get("languages"));
            repMeta.setTopics((List<String>) meta.get("topics"));
            repMeta.setContributorsCount((Integer) meta.get("contributorsCount"));
            repMeta.setHasDiscussions((Boolean) meta.get("hasReleases")); // Release indicator fallback
            metadataRepository.save(repMeta);

            // Store Repository Stats
            RepositoryStatistics stats = statisticsRepository.findByRepositoryId(repo.getId())
                    .orElseGet(() -> RepositoryStatistics.builder().repository(finalRepo).build());
            stats.setStars((Integer) meta.get("stars"));
            stats.setForks((Integer) meta.get("forks"));
            stats.setWatchers((Integer) meta.get("watchers"));
            stats.setOpenIssues((Integer) meta.get("openIssues"));
            stats.setSizeKb((Integer) meta.get("sizeKb"));
            statisticsRepository.save(stats);

            // Calculate & Store Health Metrics (STEP 5)
            calculateHealthMetrics(repo, stats, repMeta);

            // Publish next event to RabbitMQ
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.IMPORT_EXCHANGE,
                    RabbitMqConfig.ROUTING_KEY_IMPORT_METADATA_FETCHED,
                    event
            );
            log.info("Metadata worker finished processing for repo: {}", event.getRepoFullName());

        } catch (Exception e) {
            log.error("Failed fetching metadata for job: {}", event.getJobId(), e);
            job.setStatus(GitHubImportJob.ImportStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);
        }
    }

    // ── STEP 6: TREE WORKER ────────────────────────────────────────────────────

    @RabbitListener(queues = RabbitMqConfig.IMPORT_TREE_QUEUE)
    @Transactional
    public void processTreeFetch(RepoImportEvent event) {
        log.info("Tree worker received import event for repo: {}", event.getRepoFullName());

        GitHubImportJob job = jobRepository.findById(event.getJobId()).orElse(null);
        if (job == null) return;

        try {
            job.setStatus(GitHubImportJob.ImportStatus.ANALYZING);
            job.setCurrentStep("Fetching Repository Git Tree Structure");
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);

            Repository repo = repositoryRepository.findByUserIdAndFullName(job.getUser().getId(), event.getRepoFullName()).orElseThrow();
            GitHubAccount account = accountRepository.findById(event.getAccountId()).orElseThrow();

            List<String> treePaths = gitHubApiClient.fetchRecursiveTree(event.getRepoFullName(), repo.getDefaultBranch(), account.getAccessToken());

            List<String> buildFiles = treePaths.stream()
                    .filter(path -> path.endsWith("package.json") ||
                                    path.endsWith("pom.xml") ||
                                    path.endsWith("build.gradle") ||
                                    path.endsWith("go.mod") ||
                                    path.endsWith("Cargo.toml") ||
                                    path.endsWith("requirements.txt") ||
                                    path.endsWith("Dockerfile") ||
                                    path.endsWith("docker-compose.yml") ||
                                    path.contains(".github/workflows"))
                    .toList();

            final Repository finalRepo = repo;
            RepositoryTree tree = treeRepository.findByRepositoryId(repo.getId())
                    .orElseGet(() -> RepositoryTree.builder().repository(finalRepo).build());
            tree.setTreeStructure(treePaths);
            tree.setDetectedBuildFiles(buildFiles);
            tree.setUpdatedAt(Instant.now());
            treeRepository.save(tree);

            // DETECT MONOREPO & PROJECTS (STEPS 3, 4, 7, 8)
            detectProjectsAndFrameworks(repo, treePaths, buildFiles);
            
            repo.setStatusTreeAnalyzed(true);
            repo = repositoryRepository.save(repo);

            // Phase 3: Selective File Fetching
            job.setStatus(GitHubImportJob.ImportStatus.PENDING); // Set intermediate state to fetch
            job.setCurrentStep("Phase 3: Selective File Fetching");
            jobRepository.save(job);
            
            java.nio.file.Path workspace = null;
            try {
                workspace = selectiveFileFetchService.fetchSelectedFiles(
                        event.getRepoFullName(),
                        repo.getDefaultBranch(),
                        treePaths,
                        account.getAccessToken()
                );

                // Phase 4: AI Repository Analysis
                job.setStatus(GitHubImportJob.ImportStatus.AI_GENERATION);
                job.setCurrentStep("Phase 4: Running AI Analysis");
                jobRepository.save(job);

                RepositoryMetadata meta = metadataRepository.findByRepositoryId(repo.getId()).orElseThrow();
                RepositoryKnowledgeGraph kg = aiRepositoryAnalysisEngine.analyzeRepository(repo, meta, workspace);
                knowledgeGraphRepository.save(kg);
                
                repo.setStatusAiAnalyzed(true);
                repositoryRepository.save(repo);

            } finally {
                // Securely delete workspace (Clean up)
                if (workspace != null) {
                    workspaceManager.cleanWorkspace(workspace);
                }
            }

            // Complete the Job
            job.setStatus(GitHubImportJob.ImportStatus.DONE);
            job.setCurrentStep("Import Completed Successfully");
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);

            log.info("Tree worker finished processing for repo: {}", event.getRepoFullName());

        } catch (Exception e) {
            log.error("Failed fetching git tree for job: {}", event.getJobId(), e);
            job.setStatus(GitHubImportJob.ImportStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);
        }
    }

    // ── Helper Math & Heuristics ──────────────────────────────────────────────

    private void calculateHealthMetrics(Repository repo, RepositoryStatistics stats, RepositoryMetadata meta) {
        RepositoryHealth health = healthRepository.findByRepositoryId(repo.getId())
                .orElseGet(() -> RepositoryHealth.builder().repository(repo).build());

        // Popularity: Stars, forks, watchers
        double popularity = Math.min(100.0, (stats.getStars() * 0.5) + (stats.getForks() * 0.3) + (stats.getWatchers() * 0.2));
        
        // Activity: Stars count and contributor status
        double activity = meta.getContributorsCount() > 10 ? 90.0 : 40.0;
        
        // Maintenance: Having license, readme, open issues ratio
        double maintenance = 50.0;
        if (meta.getLicenseName() != null && !meta.getLicenseName().equalsIgnoreCase("None")) {
            maintenance += 25.0;
        }
        if (meta.getDescription() != null && !meta.getDescription().isBlank()) {
            maintenance += 25.0;
        }

        double totalHealth = (popularity * 0.3) + (activity * 0.3) + (maintenance * 0.4);

        health.setPopularityScore(popularity);
        health.setActivityScore(activity);
        health.setMaintenanceScore(maintenance);
        health.setHealthScore(totalHealth);
        health.setCalculatedAt(Instant.now());
        healthRepository.save(health);
    }

    private void detectProjectsAndFrameworks(Repository repo, List<String> tree, List<String> buildFiles) {
        // Clear previous projects if re-running
        List<RepositoryProject> existing = projectRepository.findAllByRepositoryId(repo.getId());
        projectRepository.deleteAll(existing);
        projectRepository.flush();

        // Detect monorepo pattern
        boolean isMonorepo = buildFiles.stream().anyMatch(f -> f.contains("apps/") || f.contains("packages/") || f.contains("pnpm-workspace.yaml"));

        if (isMonorepo) {
            // Register monorepo workspaces/projects
            buildFiles.forEach(file -> {
                if (file.contains("apps/") || file.contains("packages/")) {
                    String path = file.substring(0, file.lastIndexOf('/') + 1);
                    String name = path.substring(0, path.length() - 1);
                    name = name.substring(name.lastIndexOf('/') + 1);

                    RepositoryProject project = RepositoryProject.builder()
                            .repository(repo)
                            .path(path)
                            .name(name)
                            .framework(detectFrameworkFromPath(file))
                            .packageManager(detectPackageManagerFromBuildFile(file))
                            .build();
                    projectRepository.save(project);
                }
            });
        }

        // Add root workspace mapping anyway
        RepositoryProject root = RepositoryProject.builder()
                .repository(repo)
                .path("/")
                .name(repo.getName())
                .framework(detectFrameworkFromBuildFiles(buildFiles))
                .packageManager(detectPackageManagerFromTree(tree))
                .build();
        projectRepository.save(root);
    }

    private String detectFrameworkFromPath(String buildFile) {
        if (buildFile.contains("package.json")) return "Node.js";
        if (buildFile.contains("pom.xml")) return "Spring Boot";
        if (buildFile.contains("Cargo.toml")) return "Rust";
        return "Unknown";
    }

    private String detectPackageManagerFromBuildFile(String buildFile) {
        if (buildFile.contains("pom.xml")) return "maven";
        if (buildFile.contains("build.gradle")) return "gradle";
        if (buildFile.contains("package.json")) return "npm";
        return "Unknown";
    }

    private String detectFrameworkFromBuildFiles(List<String> buildFiles) {
        if (buildFiles.stream().anyMatch(f -> f.endsWith("pom.xml"))) return "Spring Boot";
        if (buildFiles.stream().anyMatch(f -> f.endsWith("package.json"))) return "React/NextJS";
        if (buildFiles.stream().anyMatch(f -> f.endsWith("Cargo.toml"))) return "Rust";
        return "Unknown";
    }

    private String detectPackageManagerFromTree(List<String> tree) {
        if (tree.contains("pnpm-lock.yaml")) return "pnpm";
        if (tree.contains("yarn.lock")) return "yarn";
        if (tree.contains("package-lock.json")) return "npm";
        if (tree.contains("pom.xml")) return "maven";
        if (tree.contains("Cargo.toml")) return "cargo";
        return "Unknown";
    }
}
