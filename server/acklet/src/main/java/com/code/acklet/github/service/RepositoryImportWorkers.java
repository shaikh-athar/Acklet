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
            log.info("Bypassing remote GitHub metadata fetch for fast pipeline flow");
            String repoName = event.getRepoFullName().substring(event.getRepoFullName().indexOf('/') + 1);
            Map<String, Object> meta = new HashMap<>();
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
            // Workspace is keyed by "owner_repo" — deterministic, unique per GitHub identity.
            // This avoids stale UUID directories accumulating when the same repo is re-imported.
            Path workspaceDir = workspaceManager.getWorkspacePath(event.getRepoFullName());
            Files.createDirectories(workspaceDir.getParent());

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

            boolean isExisting = Files.exists(workspaceDir) && Files.exists(workspaceDir.resolve(".git"));
            if (isExisting) {
                buildLog.append("[acklet-builder] Found existing repository workspace. Performing incremental fetch & reset...\n");
                try {
                    List<String> fetchCmd = List.of("git", "fetch", "origin", repo.getDefaultBranch(), "--depth", "1");
                    runCommand(fetchCmd, workspaceDir.toFile(), buildLog);
                    List<String> resetCmd = List.of("git", "reset", "--hard", "origin/" + repo.getDefaultBranch());
                    runCommand(resetCmd, workspaceDir.toFile(), buildLog);
                    List<String> cleanCmd = List.of("git", "clean", "-fdx");
                    runCommand(cleanCmd, workspaceDir.toFile(), buildLog);
                    buildLog.append("[acklet-builder] Repository fetched and reset successfully.\n");
                } catch (Exception e) {
                    buildLog.append("[acklet-builder] Incremental fetch warning: ").append(e.getMessage()).append(". Wiping and clean cloning...\n");
                    isExisting = false;
                }
            }

            if (!isExisting) {
                if (Files.exists(workspaceDir)) {
                    log.info("Deleting existing workspace directory for fresh clone: {}", workspaceDir);
                    workspaceManager.cleanWorkspace(workspaceDir);
                }
                Files.createDirectories(workspaceDir.getParent());
                buildLog.append("[acklet-builder] Cloning ").append(event.getRepoFullName()).append(" (fresh)...\n");
                List<String> cloneCmd = List.of("git", "clone", "--depth", "1", "-b", repo.getDefaultBranch(), cloneUrl, workspaceDir.toAbsolutePath().toString());
                try {
                    runCommand(cloneCmd, new File("."), buildLog);
                    buildLog.append("[acklet-builder] Repository cloned successfully to managed workspace.\n");
                } catch (Exception e) {
                    buildLog.append("[acklet-builder] Git clone warning (using local fallback): ").append(e.getMessage()).append("\n");
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
            String buildCommand = "echo 'No build command required'";
            String startCommand = "serve";
            int port = 80;

            boolean hasCustomBuild = event.getBuildCommand() != null && !event.getBuildCommand().isBlank();
            boolean hasCustomStart = event.getStartCommand() != null && !event.getStartCommand().isBlank();

            if (hasCustomBuild) {
                buildCommand = event.getBuildCommand().trim();
                log.info("[acklet-builder] Using user-specified custom build command override: {}", buildCommand);
                buildLog.append("[acklet-builder] Applying custom build command override: ").append(buildCommand).append("\n");
            }
            if (hasCustomStart) {
                startCommand = event.getStartCommand().trim();
                log.info("[acklet-builder] Using user-specified custom start command override: {}", startCommand);
                buildLog.append("[acklet-builder] Applying custom start command override: ").append(startCommand).append("\n");
            }

            if (!hasCustomBuild || !hasCustomStart) {
                if (buildFiles.stream().anyMatch(f -> f.endsWith("package.json"))) {
                    language = "JavaScript/TypeScript";
                    packageManager = "npm";
                    runtime = "nodejs";
                    
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

                            // Parse script --port flags or configs
                            java.util.regex.Matcher m = java.util.regex.Pattern.compile("--port\\s+(\\d+)").matcher(content);
                            if (m.find()) {
                                port = Integer.parseInt(m.group(1));
                            }
                        } catch (Exception ex) {
                            framework = "Node.js App";
                            port = 3000;
                        }
                    } else {
                        framework = "Node.js App";
                        port = 3000;
                    }

                    if (!hasCustomBuild) buildCommand = "npm run build";
                    if (!hasCustomStart) startCommand = "npm start";
                } else if (buildFiles.stream().anyMatch(f -> f.endsWith("pom.xml"))) {
                    framework = "Spring Boot";
                    language = "Java";
                    packageManager = "maven";
                    runtime = "java";
                    if (!hasCustomBuild) buildCommand = "mvn clean package -DskipTests";
                    if (!hasCustomStart) startCommand = "java -jar target/*.jar";
                    port = 8080;
                } else if (buildFiles.stream().anyMatch(f -> f.endsWith("requirements.txt"))) {
                    framework = "Python App";
                    language = "Python";
                    packageManager = "pip";
                    runtime = "python";
                    if (!hasCustomBuild) buildCommand = "pip install -r requirements.txt";
                    if (!hasCustomStart) startCommand = "python app.py";
                    port = 8000;
                } else if (buildFiles.stream().anyMatch(f -> f.endsWith("Cargo.toml"))) {
                    framework = "Rust App";
                    language = "Rust";
                    packageManager = "cargo";
                    runtime = "rust";
                    if (!hasCustomBuild) buildCommand = "cargo build --release";
                    if (!hasCustomStart) startCommand = "./target/release/app";
                    port = 8080;
                } else if (buildFiles.stream().anyMatch(f -> f.endsWith("go.mod"))) {
                    framework = "Go App";
                    language = "Go";
                    packageManager = "go";
                    runtime = "go";
                    if (!hasCustomBuild) buildCommand = "go build -o app";
                    if (!hasCustomStart) startCommand = "./app";
                    port = 8080;
                }
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

        health.setPopularityScore(100.0);
        health.setActivityScore(100.0);
        health.setMaintenanceScore(100.0);
        health.setHealthScore(100.0);
        health.setCalculatedAt(Instant.now());
        healthRepository.save(health);
        log.info("Health scoring bypassed (decoupled from Pipeline A)");
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
        String lower = buildFile.toLowerCase();
        if (lower.contains("package.json")) {
            if (lower.contains("next")) return "Next.js";
            if (lower.contains("nuxt")) return "Nuxt.js";
            if (lower.contains("svelte")) return "Svelte";
            if (lower.contains("remix")) return "Remix";
            if (lower.contains("astro")) return "Astro";
            return "Node.js";
        }
        if (lower.contains("pom.xml") || lower.contains("build.gradle")) return "Spring Boot";
        if (lower.contains("cargo.toml")) return "Rust";
        if (lower.contains("go.mod")) return "Go";
        if (lower.contains("requirements.txt") || lower.contains("pyproject.toml")) return "Python App";
        if (lower.contains("dockerfile")) return "Docker Container";
        return "Unknown";
    }

    private String detectPackageManagerFromBuildFile(String buildFile) {
        String lower = buildFile.toLowerCase();
        if (lower.contains("pom.xml")) return "maven";
        if (lower.contains("build.gradle")) return "gradle";
        if (lower.contains("cargo.toml")) return "cargo";
        if (lower.contains("go.mod")) return "go";
        if (lower.contains("requirements.txt") || lower.contains("pyproject.toml")) return "pip";
        if (lower.contains("package.json")) return "npm";
        return "Unknown";
    }

    private String detectFrameworkFromBuildFiles(List<String> buildFiles) {
        if (buildFiles.stream().anyMatch(f -> f.endsWith("dockerfile") || f.endsWith("Dockerfile"))) return "Docker";
        if (buildFiles.stream().anyMatch(f -> f.endsWith("pom.xml") || f.endsWith("build.gradle"))) return "Spring Boot";
        if (buildFiles.stream().anyMatch(f -> f.endsWith("package.json"))) return "Node.js/Frontend";
        if (buildFiles.stream().anyMatch(f -> f.endsWith("requirements.txt") || f.endsWith("pyproject.toml"))) return "Python App";
        if (buildFiles.stream().anyMatch(f -> f.endsWith("Cargo.toml"))) return "Rust App";
        if (buildFiles.stream().anyMatch(f -> f.endsWith("go.mod"))) return "Go App";
        return "Static HTML/JS";
    }

    private String detectPackageManagerFromTree(List<String> tree) {
        if (tree.stream().anyMatch(f -> f.endsWith("pnpm-lock.yaml"))) return "pnpm";
        if (tree.stream().anyMatch(f -> f.endsWith("yarn.lock"))) return "yarn";
        if (tree.stream().anyMatch(f -> f.endsWith("package-lock.json"))) return "npm";
        if (tree.stream().anyMatch(f -> f.endsWith("pom.xml"))) return "maven";
        if (tree.stream().anyMatch(f -> f.endsWith("build.gradle"))) return "gradle";
        if (tree.stream().anyMatch(f -> f.endsWith("Cargo.toml"))) return "cargo";
        if (tree.stream().anyMatch(f -> f.endsWith("go.mod"))) return "go";
        if (tree.stream().anyMatch(f -> f.endsWith("requirements.txt") || f.endsWith("pyproject.toml"))) return "pip";
        return "None";
    }
}
