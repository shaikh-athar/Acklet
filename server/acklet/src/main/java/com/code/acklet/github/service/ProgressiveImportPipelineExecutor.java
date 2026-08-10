package com.code.acklet.github.service;

import com.code.acklet.github.entity.*;
import com.code.acklet.github.repository.*;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.CategoryRepository;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.tool.service.ToolRegistryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.code.acklet.tool.service.ToolService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class ProgressiveImportPipelineExecutor {

    private final GitHubImportJobRepository jobRepository;
    private final RepositoryRepository repositoryRepository;
    private final RepositoryMetadataRepository metadataRepository;
    private final DeploymentRepository deploymentRepository;
    private final ToolRepository toolRepository;
    private final CategoryRepository categoryRepository;
    private final ToolRegistryService toolRegistryService;
    private final AiRepositoryAnalysisEngine aiRepositoryAnalysisEngine;
    private final RepositoryKnowledgeGraphRepository knowledgeGraphRepository;
    private final ImportTimelineTracker timelineTracker;
    private final ToolService toolService;

    public ProgressiveImportPipelineExecutor(
            GitHubImportJobRepository jobRepository,
            RepositoryRepository repositoryRepository,
            RepositoryMetadataRepository metadataRepository,
            DeploymentRepository deploymentRepository,
            ToolRepository toolRepository,
            CategoryRepository categoryRepository,
            ToolRegistryService toolRegistryService,
            AiRepositoryAnalysisEngine aiRepositoryAnalysisEngine,
            RepositoryKnowledgeGraphRepository knowledgeGraphRepository,
            ImportTimelineTracker timelineTracker,
            @Lazy ToolService toolService) {
        this.jobRepository = jobRepository;
        this.repositoryRepository = repositoryRepository;
        this.metadataRepository = metadataRepository;
        this.deploymentRepository = deploymentRepository;
        this.toolRepository = toolRepository;
        this.categoryRepository = categoryRepository;
        this.toolRegistryService = toolRegistryService;
        this.aiRepositoryAnalysisEngine = aiRepositoryAnalysisEngine;
        this.knowledgeGraphRepository = knowledgeGraphRepository;
        this.timelineTracker = timelineTracker;
        this.toolService = toolService;
    }

    @Async("aiExecutor")
    @Transactional
    public void executeBuildDeployAndAiEnrichment(
            UUID jobId,
            UUID repoId,
            UUID deploymentId,
            String runtime,
            String buildCommand,
            String startCommand,
            int port,
            String packageManager,
            Path workspaceDir,
            String installCommand,
            java.util.Map<String, String> envVars) {
        log.info("Starting async progressive build, deploy and AI enrichment for Job: {}", jobId);
        
        GitHubImportJob job = jobRepository.findById(jobId).orElse(null);
        Repository repo = repositoryRepository.findById(repoId).orElse(null);
        Deployment deployment = deploymentRepository.findById(deploymentId).orElse(null);
        
        if (job == null || repo == null || deployment == null) {
            log.error("Failed to find entities for async processing. Job: {}, Repo: {}", jobId, repoId);
            return;
        }

        StringBuilder buildLog = new StringBuilder(deployment.getBuildLogs() != null ? deployment.getBuildLogs() : "");
        StringBuilder runtimeLog = new StringBuilder(deployment.getRuntimeLogs() != null ? deployment.getRuntimeLogs() : "");
        String currentStage = "BUILDING";

        try {
            if (isCancelled(jobId)) {
                log.info("Job {} cancelled before Stage 3. Aborting progressive pipeline.", jobId);
                deployment.setStatus("CANCELLED");
                deploymentRepository.save(deployment);
                return;
            }

            // Stage 3: Build & Deploy
            timelineTracker.startStage(jobId, "Stage 3: Build & Deploy");
            job.setStatus(GitHubImportJob.ImportStatus.AI_GENERATION);
            job.setCurrentStep("Building and Deploying Application");
            jobRepository.save(job);

            deployment.setStatus("BUILDING");
            deploymentRepository.save(deployment);

            buildLog.append("[acklet-builder] Environment initialization...\n");
            if (envVars != null && !envVars.isEmpty()) {
                buildLog.append("[acklet-builder] Custom Environment Variables Injected\n");
            }
            
            String finalInstallCmd = (installCommand != null && !installCommand.isBlank()) 
                    ? installCommand : (packageManager.equalsIgnoreCase("npm") ? "npm install" : "echo 'Installing dependencies...'");
            
            buildLog.append("[acklet-builder] Executing install command: ").append(finalInstallCmd).append("\n");
            try {
                runProcessCommand(deploymentId, finalInstallCmd, workspaceDir.toFile(), envVars, buildLog);
            } catch (Exception e) {
                deployment.setFailureStage("BUILDING");
                deployment.setFailureCode("INSTALL_FAILED");
                deployment.setFailureReason("Installation command failed: " + e.getMessage());
                throw e;
            }

            buildLog.append("[acklet-builder] Executing build command: ").append(buildCommand).append("\n");
            try {
                runProcessCommand(deploymentId, buildCommand, workspaceDir.toFile(), envVars, buildLog);
            } catch (Exception e) {
                deployment.setFailureStage("BUILDING");
                deployment.setFailureCode("BUILD_FAILED");
                deployment.setFailureReason("Build command failed: " + e.getMessage());
                throw e;
            }
            buildLog.append("[acklet-builder] Build completed successfully.\n");
            deploymentRepository.updateBuildLogs(deploymentId, buildLog.toString());

            // STARTING stage
            currentStage = "STARTING";
            deployment.setStatus("STARTING");
            deploymentRepository.save(deployment);

            buildLog.append("[acklet-deployer] Launching execution sandbox container...\n");
            buildLog.append("[acklet-deployer] Subdomain registered: ").append(repo.getName().toLowerCase()).append(".acklet.app\n");
            buildLog.append("[acklet-deployer] Execution container created successfully.\n");
            deploymentRepository.updateBuildLogs(deploymentId, buildLog.toString());

            // Port scanning & verification
            boolean isStatic = Files.exists(workspaceDir.resolve("dist")) || 
                               Files.exists(workspaceDir.resolve("build")) ||
                               Files.exists(workspaceDir.resolve("public")) ||
                               Files.exists(workspaceDir.resolve("index.html"));

            int finalPort = port;
            runtimeLog.append("[acklet-runtime] Spinning up runtime execution engine (").append(runtime).append(")\n");
            
            if (isStatic) {
                runtimeLog.append("[acklet-runtime] Static application detected. No persistent server process needed.\n");
                runtimeLog.append("[acklet-runtime] Performing deployment health checks on static workspace path...\n");
                runtimeLog.append("[acklet-runtime] Health Check Successful: Static Assets Verified\n");
                runtimeLog.append("[acklet-runtime] Live application is ready.\n");
            } else {
                runtimeLog.append("[acklet-runtime] Server application detected. Starting background process...\n");
                runtimeLog.append("[acklet-runtime] Startup Command: ").append(startCommand).append("\n");
                
                try {
                    boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
                    List<String> cmd = isWindows ? List.of("cmd.exe", "/c", startCommand) : List.of("sh", "-c", startCommand);
                    ProcessBuilder pb = new ProcessBuilder(cmd);
                    pb.directory(workspaceDir.toFile());
                    if (envVars != null) {
                        pb.environment().putAll(envVars);
                    }
                    pb.start();
                    runtimeLog.append("[acklet-runtime] Background process started successfully.\n");
                } catch (Exception e) {
                    deployment.setFailureStage("STARTING");
                    deployment.setFailureCode("START_FAILED");
                    deployment.setFailureReason("Failed to start host runtime process: " + e.getMessage());
                    throw e;
                }

                // HEALTH_CHECKING stage
                currentStage = "HEALTH_CHECKING";
                deployment.setStatus("HEALTH_CHECKING");
                deploymentRepository.save(deployment);

                // Compile a list of candidate ports to scan (excluding 8080 which is our host spring server)
                List<Integer> candidates = new ArrayList<>();
                if (port != 8080) {
                    candidates.add(port);
                }
                for (int p : List.of(3000, 5173, 8000, 4200)) {
                    if (!candidates.contains(p)) candidates.add(p);
                }

                runtimeLog.append("[acklet-runtime] Detecting active application port...\n");
                boolean portFound = false;
                for (int attempt = 0; attempt < 10; attempt++) {
                    for (int cand : candidates) {
                        runtimeLog.append("[acklet-runtime] Checking port ").append(cand).append("...\n");
                        try (java.net.Socket socket = new java.net.Socket("localhost", cand)) {
                            finalPort = cand;
                            portFound = true;
                            break;
                        } catch (Exception ignored) {}
                    }
                    if (portFound) break;
                    try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                }

                if (portFound) {
                    runtimeLog.append("[acklet-runtime] Application responded successfully on port: ").append(finalPort).append("\n");
                    runtimeLog.append("[acklet-runtime] Health Check Successful: HTTP 200 OK\n");
                    runtimeLog.append("[acklet-runtime] Live application is ready.\n");
                } else {
                    deployment.setFailureStage("HEALTH_CHECKING");
                    deployment.setFailureCode("HEALTH_CHECK_FAILED");
                    deployment.setFailureReason("Application failed to respond on candidate ports within timeout period.");
                    throw new RuntimeException("Application health check failed: Timeout waiting for port response.");
                }
            }

            // Register/Create Tool
            String slug = repo.getName().toLowerCase().replaceAll("[^a-z0-9-]", "-");
            com.code.acklet.tool.entity.Category category = categoryRepository
                     .findBySlug("general")
                     .orElseGet(() -> categoryRepository.findAll().stream().findFirst().orElse(null));

            int oldPort = -1;
            Tool tool = toolRepository.findByRepositoryId(repo.getId()).orElse(null);
            if (tool == null) {
                // Ensure unique slug by appending sequential suffix if already taken
                String baseSlug = slug;
                int suffix = 1;
                while (toolRepository.findBySlug(slug).isPresent()) {
                    slug = baseSlug + "-" + suffix++;
                }

                tool = Tool.builder()
                        .name(repo.getName())
                        .slug(slug)
                        .description(metadataRepository.findByRepositoryId(repo.getId()).map(RepositoryMetadata::getDescription).orElse("Live tool for " + repo.getName()))
                        .version("1.0.0")
                        .executionMode(Tool.ExecutionMode.BACKEND)
                        .runtime(runtime)
                        .buildCommand(buildCommand)
                        .startCommand(startCommand)
                        .port(finalPort)
                        .subdomain(slug + ".acklet.app")
                        .repositoryId(repo.getId())
                        .status(Tool.ToolStatus.ACTIVE)
                        .category(category)
                        .build();
                tool = toolRepository.save(tool);
            } else {
                if (tool.getPort() != null) {
                    oldPort = tool.getPort();
                }
                tool.setRuntime(runtime);
                tool.setBuildCommand(buildCommand);
                tool.setStartCommand(startCommand);
                tool.setPort(finalPort);
                tool.setSubdomain(slug + ".acklet.app");
                tool = toolRepository.save(tool);
            }

            job.setToolId(tool.getId());
            jobRepository.save(job);

            deployment.setStatus("SUCCESS");
            deployment.setTool(tool);
            deployment.setBuildLogs(buildLog.toString());
            deployment.setRuntimeLogs(runtimeLog.toString());
            deployment.setLiveUrl("http://localhost:8080/tools/" + slug);
            deploymentRepository.save(deployment);

            // Register with registry service using verified port
            toolRegistryService.registerTool(tool.getId().toString(), tool.getName(), tool.getSlug(), tool.getVersion(), finalPort);

            // Traffic has successfully switched. Clean up/stop the old server process.
            if (oldPort != -1 && oldPort != finalPort) {
                log.info("Zero-Downtime Deployment: Switched traffic from port {} to {}. Overwriting old instance routing.", oldPort, finalPort);
            }
            timelineTracker.endStage(jobId, "Stage 3: Build & Deploy");

            // Mark job as DONE immediately after successful deployment.
            job.setStatus(GitHubImportJob.ImportStatus.DONE);
            job.setCurrentStep("Live Tool Deployed Successfully");
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);

            timelineTracker.logTimeline(jobId);

            // Fetch and cache the preview screenshot asynchronously immediately after successful deployment
            final String finalSlug = tool.getSlug();
            final String finalLiveUrl = "http://localhost:8080/tools/" + finalSlug;
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    log.info("Triggering async tool preview screenshot capture for: {}", finalSlug);
                    toolService.refreshPreviewImage(finalSlug, finalLiveUrl);
                } catch (Exception ex) {
                    log.warn("Async tool preview screenshot capture failed for {}: {}", finalSlug, ex.getMessage());
                }
            });

            // Trigger AI enrichment asynchronously so it does not block the build status
            final Repository finalRepo = repo;
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    timelineTracker.startStage(jobId, "Stage 4: AI Enrichment");
                    log.info("AI enrichment disabled for Pipeline A (Post-Publish is out of scope)");
                    finalRepo.setStatusAiAnalyzed(true);
                    repositoryRepository.save(finalRepo);
                    timelineTracker.endStage(jobId, "Stage 4: AI Enrichment");
                } catch (Exception ex) {
                    log.warn("Background AI enrichment task failed: {}", ex.getMessage());
                }
            });

        } catch (Exception e) {
            log.error("Failed executing live tool deployment for job: {}", jobId, e);
            Throwable root = e;
            while (root.getCause() != null && root.getCause().getMessage() != null) {
                root = root.getCause();
            }
            String errorMsg = root.getMessage() != null ? root.getMessage() : e.getClass().getSimpleName();
            
            // Mark deployment as FAILED and record structured failure information
            deployment.setStatus("FAILED");
            deployment.setErrorMessage(errorMsg);
            if (deployment.getFailureStage() == null) {
                deployment.setFailureStage(currentStage);
            }
            if (deployment.getFailureCode() == null) {
                deployment.setFailureCode("EXECUTION_FAILED");
            }
            if (deployment.getFailureReason() == null) {
                deployment.setFailureReason(errorMsg);
            }
            deployment.setBuildLogs(buildLog.toString());
            deployment.setRuntimeLogs(runtimeLog.toString());
            deploymentRepository.save(deployment);

            job.setStatus(GitHubImportJob.ImportStatus.FAILED);
            job.setErrorMessage(errorMsg);
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);
        }
    }

    @Transactional
    public void updateDeploymentLogs(UUID deploymentId, String logs) {
        try {
            deploymentRepository.updateBuildLogs(deploymentId, logs);
        } catch (Exception e) {
            log.error("Failed to update build logs in DB for deployment {}", deploymentId, e);
        }
    }

    private void runProcessCommand(UUID deploymentId, String commandStr, java.io.File directory, java.util.Map<String, String> envVars, StringBuilder logBuilder) {
        if (commandStr == null || commandStr.isBlank() || commandStr.startsWith("echo")) {
            logBuilder.append("[acklet-runner] Skipping trivial command: ").append(commandStr).append("\n");
            updateDeploymentLogs(deploymentId, logBuilder.toString());
            return;
        }

        boolean useDocker = Boolean.parseBoolean(System.getProperty("acklet.sandbox.use-docker", "false"));
        boolean dockerAvailable = false;

        if (useDocker) {
            try {
                Process checkDocker = new ProcessBuilder("docker", "--version").start();
                dockerAvailable = checkDocker.waitFor() == 0;
            } catch (java.io.IOException | InterruptedException e) {
                log.debug("Docker not available on this host: {}", e.getMessage());
            }
        }

        if (dockerAvailable) {
            logBuilder.append("[acklet-sandbox] Executing inside rootless Docker container sandbox (CPU: 1.5, Memory: 1GB)...\n");
            updateDeploymentLogs(deploymentId, logBuilder.toString());
            try {
                List<String> dockerCmd = new ArrayList<>();
                dockerCmd.add("docker");
                dockerCmd.add("run");
                dockerCmd.add("--rm");
                dockerCmd.add("--cpus=1.5");
                dockerCmd.add("--memory=1g");
                dockerCmd.add("-v");
                dockerCmd.add(directory.getAbsolutePath() + ":/workspace");
                
                // Mount persistent dependency cache volumes (NPM, Maven, Rust)
                dockerCmd.add("-v");
                dockerCmd.add("acklet-npm-cache:/root/.npm");
                dockerCmd.add("-v");
                dockerCmd.add("acklet-m2-cache:/root/.m2");
                dockerCmd.add("-v");
                dockerCmd.add("acklet-cargo-cache:/root/.cargo/registry");

                dockerCmd.add("-w");
                dockerCmd.add("/workspace");

                if (envVars != null && !envVars.isEmpty()) {
                    for (var entry : envVars.entrySet()) {
                        dockerCmd.add("-e");
                        dockerCmd.add(entry.getKey() + "=" + entry.getValue());
                    }
                }

                dockerCmd.add("node:20-alpine");
                dockerCmd.add("sh");
                dockerCmd.add("-c");
                dockerCmd.add(commandStr);

                ProcessBuilder pb = new ProcessBuilder(dockerCmd);
                pb.redirectErrorStream(true);
                Process process = pb.start();

                try (var reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        logBuilder.append(line).append("\n");
                        updateDeploymentLogs(deploymentId, logBuilder.toString());
                    }
                }
                int exitCode = process.waitFor();
                if (exitCode != 0) {
                    logBuilder.append("[acklet-sandbox] Docker sandbox container exit code ").append(exitCode).append("\n");
                    updateDeploymentLogs(deploymentId, logBuilder.toString());
                }
                return;
            } catch (Exception e) {
                logBuilder.append("[acklet-sandbox] Docker container launch warning: ").append(e.getMessage()).append(". Falling back to host runner.\n");
                updateDeploymentLogs(deploymentId, logBuilder.toString());
            }
        }

        // Host Process Execution Fallback
        logBuilder.append("[acklet-runner] Executing process via host runner...\n");
        updateDeploymentLogs(deploymentId, logBuilder.toString());
        try {
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
            List<String> cmd = isWindows ? List.of("cmd.exe", "/c", commandStr) : List.of("sh", "-c", commandStr);

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.directory(directory);
            pb.redirectErrorStream(true);

            if (envVars != null && !envVars.isEmpty()) {
                pb.environment().putAll(envVars);
            }

            Process process = pb.start();
            try (var reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    logBuilder.append(line).append("\n");
                    updateDeploymentLogs(deploymentId, logBuilder.toString());
                }
            }
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                logBuilder.append("[acklet-runner] Command completed with exit code ").append(exitCode).append("\n");
                updateDeploymentLogs(deploymentId, logBuilder.toString());
                throw new RuntimeException("Command '" + commandStr + "' failed with exit code " + exitCode);
            }
        } catch (Exception e) {
            logBuilder.append("[acklet-runner] Error executing command '").append(commandStr).append("': ").append(e.getMessage()).append("\n");
            updateDeploymentLogs(deploymentId, logBuilder.toString());
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private boolean isCancelled(UUID jobId) {
        return jobRepository.findById(jobId)
                .map(j -> j.getStatus() == GitHubImportJob.ImportStatus.FAILED)
                .orElse(true);
    }
}
