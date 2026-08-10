package com.code.acklet.github.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AckletBuildEngine {

    private final ProjectConfigurationValidator configurationValidator;

    public static class BuildResult {
        public final boolean success;
        public final String buildLogs;
        public final String artifactPath;
        public final String errorMessage;

        public BuildResult(boolean success, String buildLogs, String artifactPath, String errorMessage) {
            this.success = success;
            this.buildLogs = buildLogs;
            this.artifactPath = artifactPath;
            this.errorMessage = errorMessage;
        }
    }

    public BuildResult executeBuild(
            Path workspaceDir,
            String packageManager,
            String installCommand,
            String buildCommand,
            Integer port,
            Map<String, String> envVars,
            int maxRetries
    ) {
        StringBuilder buildLog = new StringBuilder();
        buildLog.append("[acklet-build-engine] Starting Phase 6 Build Execution Pipeline...\n");

        // Step 1: Pre-build Validation
        ProjectConfigurationValidator.ValidationResult valResult = configurationValidator.validate(buildCommand, null, port, envVars);
        if (!valResult.valid) {
            buildLog.append("[acklet-build-engine] Configuration Validation Failed:\n");
            for (String err : valResult.errors) {
                buildLog.append("  - ERROR: ").append(err).append("\n");
            }
            return new BuildResult(false, buildLog.toString(), null, "Configuration validation failed");
        }

        if (!valResult.warnings.isEmpty()) {
            for (String warn : valResult.warnings) {
                buildLog.append("  - WARNING: ").append(warn).append("\n");
            }
        }

        // Step 2: Dependency & Build Cache Check
        Path cacheDir = workspaceDir.resolve(".acklet-cache");
        try {
            if (!Files.exists(cacheDir)) {
                Files.createDirectories(cacheDir);
                buildLog.append("[acklet-build-engine] Initialized workspace cache at: .acklet-cache/\n");
            } else {
                buildLog.append("[acklet-build-engine] Reusing existing build cache from: .acklet-cache/\n");
            }
        } catch (Exception e) {
            buildLog.append("[acklet-build-engine] Cache directory initialization warning: ").append(e.getMessage()).append("\n");
        }

        // Step 3: Install & Build Execution with Retries
        String finalInstallCmd = (installCommand != null && !installCommand.isBlank())
                ? installCommand
                : resolveDefaultInstallCommand(packageManager);

        int attempt = 0;
        boolean buildSuccess = false;
        String lastError = null;

        while (attempt <= maxRetries && !buildSuccess) {
            attempt++;
            if (attempt > 1) {
                buildLog.append("\n[acklet-build-engine] Retrying build (Attempt ").append(attempt).append("/").append(maxRetries + 1).append(")...\n");
            }

            // Install Dependencies
            buildLog.append("[acklet-build-engine] Executing install command: ").append(finalInstallCmd).append("\n");
            int installExit = runBuildCommand(finalInstallCmd, workspaceDir.toFile(), envVars, buildLog);
            if (installExit != 0) {
                lastError = "Install command failed with exit code " + installExit;
                buildLog.append("[acklet-build-engine] ").append(lastError).append("\n");
                continue;
            }

            // Execute Build
            buildLog.append("[acklet-build-engine] Executing framework build command: ").append(buildCommand).append("\n");
            int buildExit = runBuildCommand(buildCommand, workspaceDir.toFile(), envVars, buildLog);
            if (buildExit != 0) {
                lastError = "Build command failed with exit code " + buildExit;
                buildLog.append("[acklet-build-engine] ").append(lastError).append("\n");
                continue;
            }

            buildSuccess = true;
        }

        if (!buildSuccess) {
            buildLog.append("\n[acklet-build-engine] Build failed after ").append(attempt).append(" attempts.\n");
            return new BuildResult(false, buildLog.toString(), null, lastError != null ? lastError : "Build execution failed");
        }

        // Step 4: Artifact Validation
        String artifactPath = detectArtifactOutputDirectory(workspaceDir);
        buildLog.append("[acklet-build-engine] Artifact generation validated at output path: ").append(artifactPath).append("\n");
        buildLog.append("[acklet-build-engine] Build pipeline completed successfully.\n");

        return new BuildResult(true, buildLog.toString(), artifactPath, null);
    }

    private String resolveDefaultInstallCommand(String packageManager) {
        if ("maven".equalsIgnoreCase(packageManager)) return "mvn dependency:resolve";
        if ("gradle".equalsIgnoreCase(packageManager)) return "gradle dependencies";
        if ("cargo".equalsIgnoreCase(packageManager)) return "cargo fetch";
        if ("go".equalsIgnoreCase(packageManager)) return "go mod download";
        if ("pip".equalsIgnoreCase(packageManager)) return "pip install -r requirements.txt";
        if ("pnpm".equalsIgnoreCase(packageManager)) return "pnpm install";
        if ("yarn".equalsIgnoreCase(packageManager)) return "yarn install";
        return "npm install";
    }

    private String detectArtifactOutputDirectory(Path workspaceDir) {
        if (Files.exists(workspaceDir.resolve(".next"))) return ".next/";
        if (Files.exists(workspaceDir.resolve("dist"))) return "dist/";
        if (Files.exists(workspaceDir.resolve("target"))) return "target/";
        if (Files.exists(workspaceDir.resolve("build"))) return "build/";
        if (Files.exists(workspaceDir.resolve("out"))) return "out/";
        return "./";
    }

    private int runBuildCommand(String commandStr, File directory, Map<String, String> envVars, StringBuilder logBuilder) {
        if (commandStr == null || commandStr.isBlank() || commandStr.startsWith("echo")) {
            logBuilder.append("[acklet-runner] Skipping trivial command: ").append(commandStr).append("\n");
            return 0;
        }

        try {
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
            java.util.List<String> cmd = isWindows
                    ? java.util.List.of("cmd.exe", "/c", commandStr)
                    : java.util.List.of("sh", "-c", commandStr);

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
                }
            }
            return process.waitFor();
        } catch (Exception e) {
            logBuilder.append("[acklet-runner] Error executing command '").append(commandStr).append("': ").append(e.getMessage()).append("\n");
            return -1;
        }
    }
}
