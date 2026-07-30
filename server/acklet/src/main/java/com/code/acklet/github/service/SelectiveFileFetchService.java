package com.code.acklet.github.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SelectiveFileFetchService {

    private final GitHubExtendedApiClient gitHubApiClient;
    private final TemporaryWorkspaceManager workspaceManager;

    @Cacheable(value = "selective_files", key = "#repoFullName + ':' + #branch")
    public Path fetchSelectedFiles(String repoFullName, String branch, List<String> treePaths, String token) throws IOException {
        Path workspace = workspaceManager.createWorkspace();
        List<String> plannedFiles = planDownloads(treePaths);

        log.info("Planned {} files to fetch for repository {}", plannedFiles.size(), repoFullName);

        // Fetch each file concurrently/sequentially (safe sequential for rate limits + resilience)
        for (String file : plannedFiles) {
            String content = gitHubApiClient.fetchRawFileContent(repoFullName, file, branch, token);
            if (content != null) {
                Path targetFile = workspace.resolve(file);
                if (workspaceManager.validatePath(workspace, targetFile)) {
                    Files.createDirectories(targetFile.getParent());
                    Files.writeString(targetFile, content);
                    log.debug("Fetched and wrote: {}", file);
                } else {
                    log.warn("Path traversal attempt blocked: {}", file);
                }
            }
        }
        return workspace;
    }

    private List<String> planDownloads(List<String> treePaths) {
        List<String> planned = new ArrayList<>();
        List<String> ignoredExtensions = List.of(
            ".zip", ".tar", ".gz", ".rar", ".7z",
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
            ".mp4", ".mov", ".avi", ".mp3", ".wav",
            ".pdf", ".exe", ".dll", ".so", ".bin", ".dmg", ".iso"
        );

        for (String path : treePaths) {
            String lowerPath = path.toLowerCase();
            
            // Large/binary extension validation
            if (ignoredExtensions.stream().anyMatch(lowerPath::endsWith)) {
                log.debug("Skipping binary/media asset matching ignored extensions: {}", path);
                continue;
            }

            // Exclude build/dist/node_modules/vendor folder segments
            if (lowerPath.contains("node_modules/") || lowerPath.contains("vendor/") ||
                lowerPath.contains("target/") || lowerPath.contains("dist/") ||
                lowerPath.contains("build/") || lowerPath.contains("coverage/")) {
                continue;
            }

            // Category 1: Documentation
            if (path.equalsIgnoreCase("README.md") || path.equalsIgnoreCase("README") ||
                path.equalsIgnoreCase("CHANGELOG.md") || path.equalsIgnoreCase("LICENSE") ||
                path.equalsIgnoreCase("CONTRIBUTING.md") || path.equalsIgnoreCase("SECURITY.md")) {
                planned.add(path);
                continue;
            }
            // Category 2: Dependency / Build configs
            if (path.endsWith("package.json") || path.endsWith("pom.xml") ||
                path.endsWith("build.gradle") || path.endsWith("go.mod") ||
                path.endsWith("Cargo.toml") || path.endsWith("requirements.txt") ||
                path.endsWith("composer.json")) {
                planned.add(path);
                continue;
            }
            // Category 3: Infrastructure configs
            if (path.endsWith("Dockerfile") || path.endsWith("docker-compose.yml") ||
                path.endsWith("docker-compose.yaml") || path.contains(".github/workflows")) {
                planned.add(path);
                continue;
            }
            // Category 4: App configs
            if (path.endsWith("application.properties") || path.endsWith("application.yml") ||
                path.endsWith("next.config.js") || path.endsWith("nuxt.config.ts") ||
                path.endsWith("tsconfig.json") || path.endsWith(".env.example")) {
                planned.add(path);
            }
        }
        return planned;
    }
}
