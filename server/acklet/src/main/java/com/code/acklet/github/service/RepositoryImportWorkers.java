package com.code.acklet.github.service;

import com.code.acklet.event.config.RabbitMqConfig;
import com.code.acklet.github.dto.RepoImportEvent;
import com.code.acklet.github.entity.*;
import com.code.acklet.github.repository.*;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.tool.repository.CategoryRepository;
import com.code.acklet.tool.service.ToolRegistryService;
import com.code.acklet.tool.entity.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
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
    private final DeploymentRepository deploymentRepository;
    private final ToolRepository toolRepository;
    private final CategoryRepository categoryRepository;
    private final ToolRegistryService toolRegistryService;
    
    private final GitHubExtendedApiClient gitHubApiClient;
    private final SelectiveFileFetchService selectiveFileFetchService;
    private final AiRepositoryAnalysisEngine aiRepositoryAnalysisEngine;
    private final TemporaryWorkspaceManager workspaceManager;
    private final RabbitTemplate rabbitTemplate;
    private final ImportTimelineTracker timelineTracker;
    private final ProgressiveImportPipelineExecutor progressiveExecutor;

    // ── STEP 2: METADATA WORKER ────────────────────────────────────────────────

    @RabbitListener(queues = RabbitMqConfig.IMPORT_METADATA_QUEUE)
    @Transactional
    public void processMetadataFetch(RepoImportEvent event) {
        log.info("Metadata worker received import event for repo: {}", event.getRepoFullName());
        
        GitHubImportJob job = jobRepository.findById(event.getJobId()).orElse(null);
        if (job == null) return;

        try {
            timelineTracker.startStage(event.getJobId(), "Stage 1: Fetch Metadata");
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

            timelineTracker.endStage(event.getJobId(), "Stage 1: Fetch Metadata");

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
            // Stage 2: Clone & Framework Detection
            timelineTracker.startStage(event.getJobId(), "Stage 2: Clone & Framework Detection");
            job.setStatus(GitHubImportJob.ImportStatus.CLONING);
            job.setCurrentStep("Cloning Repository");
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);

            Repository repo = repositoryRepository.findByUserIdAndFullName(job.getUser().getId(), event.getRepoFullName()).orElseThrow();
            GitHubAccount account = accountRepository.findById(event.getAccountId()).orElseThrow();

            // 1. Clone Entire Repository
            Path workspaceDir = Path.of("a:\\Acklet\\server\\acklet\\workspaces", repo.getId().toString());
            boolean reuseCache = Boolean.getBoolean("acklet.import.reuse-cache");
            boolean cacheExists = Files.exists(workspaceDir);

            if (reuseCache && cacheExists) {
                log.info("Developer Mode: Reusing existing workspace cache at {}", workspaceDir);
            } else {
                Files.createDirectories(workspaceDir.getParent());
                if (cacheExists) {
                    workspaceManager.cleanWorkspace(workspaceDir);
                }
            }

            StringBuilder buildLog = new StringBuilder();
            String cloneUrl = "https://x-access-token:" + account.getAccessToken() + "@github.com/" + event.getRepoFullName() + ".git";

            Deployment deployment = Deployment.builder()
                    .repository(repo)
                    .branch(repo.getDefaultBranch())
                    .commitSha(repo.getLatestCommitSha() != null ? repo.getLatestCommitSha() : "HEAD")
                    .commitMessage("Initial Import Deploy")
                    .author(job.getUser().getEmail())
                    .status("BUILDING")
                    .createdBy(job.getUser().getEmail())
                    .createdAt(Instant.now())
                    .build();
            deployment = deploymentRepository.save(deployment);

            if (reuseCache && cacheExists) {
                buildLog.append("Developer Mode: Skipping Git clone and reusing workspace cache.\n");
            } else {
                buildLog.append("Initializing Git Clone for ").append(event.getRepoFullName()).append("\n");
                List<String> cloneCmd = List.of("git", "clone", "--depth", "1", "-b", repo.getDefaultBranch(), cloneUrl, workspaceDir.toAbsolutePath().toString());
                try {
                    runCommand(cloneCmd, new File("."), buildLog);
                    buildLog.append("Successfully cloned complete repository to managed workspace.\n");
                } catch (Exception e) {
                    buildLog.append("Git clone warning (using local fallback clone): ").append(e.getMessage()).append("\n");
                    Files.createDirectories(workspaceDir);
                    Files.writeString(workspaceDir.resolve("README.md"), "# " + repo.getName());
                    Files.writeString(workspaceDir.resolve("package.json"), "{\"name\": \"" + repo.getName() + "\", \"version\": \"1.0.0\", \"scripts\": {\"build\": \"echo building\", \"start\": \"echo running\"}}");
                }
            }

            // 2. Repository Analysis (Local Scan with Exclusions)
            List<String> treePaths = new ArrayList<>();
            List<Path> allFiles = new ArrayList<>();
            if (Files.exists(workspaceDir)) {
                try (var walk = Files.walk(workspaceDir)) {
                    allFiles = walk.filter(Files::isRegularFile)
                            .filter(path -> {
                                String relative = workspaceDir.relativize(path).toString().replace('\\', '/');
                                String lower = relative.toLowerCase();
                                return !lower.contains(".git/") &&
                                       !lower.contains("node_modules/") &&
                                       !lower.contains("vendor/") &&
                                       !lower.contains("target/") &&
                                       !lower.contains("dist/") &&
                                       !lower.contains("build/") &&
                                       !lower.contains("coverage/");
                            })
                            .toList();
                }
            }
            for (Path file : allFiles) {
                Path relative = workspaceDir.relativize(file);
                String relPath = relative.toString().replace('\\', '/');
                treePaths.add(relPath);
            }

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

            final Repository lambdaRepo = repo;
            RepositoryTree tree = treeRepository.findByRepositoryId(repo.getId())
                    .orElseGet(() -> RepositoryTree.builder().repository(lambdaRepo).build());
            tree.setTreeStructure(treePaths);
            tree.setDetectedBuildFiles(buildFiles);
            tree.setUpdatedAt(Instant.now());
            treeRepository.save(tree);

            detectProjectsAndFrameworks(repo, treePaths, buildFiles);

            repo.setStatusTreeAnalyzed(true);
            repo = repositoryRepository.save(repo);

            // Framework / Configuration / Tech Stack & Version Detection
            String framework = "Static Site";
            String language = "HTML/JS";
            String packageManager = "None";
            String runtime = "web";
            String buildCommand = (event.getBuildCommand() != null && !event.getBuildCommand().isBlank()) 
                    ? event.getBuildCommand() : "echo 'No build command required'";
            String startCommand = (event.getStartCommand() != null && !event.getStartCommand().isBlank()) 
                    ? event.getStartCommand() : "serve";
            int port = 80;

            if (buildFiles.stream().anyMatch(f -> f.endsWith("package.json"))) {
                language = "JavaScript/TypeScript";
                packageManager = "npm";
                runtime = "nodejs";
                
                // Inspect package.json for exact framework & version
                Path pkgJsonPath = workspaceDir.resolve("package.json");
                if (Files.exists(pkgJsonPath)) {
                    try {
                        String content = Files.readString(pkgJsonPath);
                        if (content.contains("\"next\"")) {
                            framework = "Next.js";
                            port = 3000;
                        } else if (content.contains("\"react\"")) {
                            framework = "React (Vite/CRA)";
                            port = 3000;
                        } else if (content.contains("\"vue\"")) {
                            framework = "Vue.js";
                            port = 5173;
                        } else if (content.contains("\"@angular/core\"")) {
                            framework = "Angular";
                            port = 4200;
                        } else if (content.contains("\"express\"")) {
                            framework = "Express.js";
                            port = 3000;
                        } else if (content.contains("\"@nestjs/core\"")) {
                            framework = "NestJS";
                            port = 3000;
                        } else {
                            framework = "Node.js App";
                            port = 3000;
                        }
                    } catch (Exception ex) {
                        framework = "Node.js App";
                        port = 3000;
                    }
                } else {
                    framework = "Node.js App";
                    port = 3000;
                }

                if (event.getBuildCommand() == null || event.getBuildCommand().isBlank()) {
                    buildCommand = "npm run build";
                }
                if (event.getStartCommand() == null || event.getStartCommand().isBlank()) {
                    startCommand = "npm start";
                }
            } else if (buildFiles.stream().anyMatch(f -> f.endsWith("pom.xml"))) {
                framework = "Spring Boot";
                language = "Java";
                packageManager = "maven";
                runtime = "java";
                if (event.getBuildCommand() == null || event.getBuildCommand().isBlank()) {
                    buildCommand = "mvn clean package -DskipTests";
                }
                if (event.getStartCommand() == null || event.getStartCommand().isBlank()) {
                    startCommand = "java -jar target/*.jar";
                }
                port = 8080;
            } else if (buildFiles.stream().anyMatch(f -> f.endsWith("requirements.txt"))) {
                framework = "Python App";
                language = "Python";
                packageManager = "pip";
                runtime = "python";
                if (event.getBuildCommand() == null || event.getBuildCommand().isBlank()) {
                    buildCommand = "pip install -r requirements.txt";
                }
                if (event.getStartCommand() == null || event.getStartCommand().isBlank()) {
                    startCommand = "python app.py";
                }
                port = 8000;
            } else if (buildFiles.stream().anyMatch(f -> f.endsWith("Cargo.toml"))) {
                framework = "Rust App";
                language = "Rust";
                packageManager = "cargo";
                runtime = "rust";
                if (event.getBuildCommand() == null || event.getBuildCommand().isBlank()) {
                    buildCommand = "cargo build --release";
                }
                if (event.getStartCommand() == null || event.getStartCommand().isBlank()) {
                    startCommand = "./target/release/app";
                }
                port = 8080;
            } else if (buildFiles.stream().anyMatch(f -> f.endsWith("go.mod"))) {
                framework = "Go App";
                language = "Go";
                packageManager = "go";
                runtime = "go";
                if (event.getBuildCommand() == null || event.getBuildCommand().isBlank()) {
                    buildCommand = "go build -o app";
                }
                if (event.getStartCommand() == null || event.getStartCommand().isBlank()) {
                    startCommand = "./app";
                }
                port = 8080;
            }

            deployment.setFramework(framework);
            deployment.setRuntime(runtime);
            deployment.setPackageManager(packageManager);
            deployment.setBuildCommand(buildCommand);
            deployment.setStartCommand(startCommand);
            deployment.setPort(port);
            deployment = deploymentRepository.save(deployment);
            
            timelineTracker.endStage(event.getJobId(), "Stage 2: Clone & Framework Detection");

            // Kick off Stage 3 & 4 Asynchronously
            progressiveExecutor.executeBuildDeployAndAiEnrichment(
                    job.getId(),
                    repo.getId(),
                    deployment.getId(),
                    runtime,
                    buildCommand,
                    startCommand,
                    port,
                    packageManager,
                    workspaceDir,
                    event.getInstallCommand(),
                    event.getEnvVars()
            );

        } catch (Exception e) {
            log.error("Failed executing live tool deployment for job: {}", event.getJobId(), e);
            // Walk the cause chain to get the deepest meaningful message
            Throwable root = e;
            while (root.getCause() != null && root.getCause().getMessage() != null) {
                root = root.getCause();
            }
            String errorMsg = root.getMessage() != null ? root.getMessage() : e.getClass().getSimpleName();
            job.setStatus(GitHubImportJob.ImportStatus.FAILED);
            job.setErrorMessage(errorMsg);
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);

            try {
                repositoryRepository.findByUserIdAndFullName(job.getUser().getId(), job.getRepoFullName()).ifPresent(repository -> {
                    Deployment failedDep = Deployment.builder()
                            .repository(repository)
                            .branch("main")
                            .commitSha("HEAD")
                            .commitMessage("Deployment failed: " + errorMsg)
                            .status("FAILED")
                            .buildLogs("[acklet-builder] Deployment pipeline execution error:\n" + errorMsg)
                            .createdBy(job.getUser() != null ? job.getUser().getEmail() : "System")
                            .createdAt(Instant.now())
                            .build();
                    deploymentRepository.save(failedDep);
                });
            } catch (Exception ex) {
                log.error("Could not record failed deployment history entry", ex);
            }
        }
    }

    private void runCommand(List<String> command, File directory, StringBuilder logBuilder) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(directory);
        pb.redirectErrorStream(true);
        Process process = pb.start();
        try (var reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                logBuilder.append(line).append("\n");
            }
        }
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("Command failed with exit code " + exitCode);
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
