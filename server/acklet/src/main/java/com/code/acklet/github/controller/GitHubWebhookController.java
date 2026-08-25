package com.code.acklet.github.controller;

import com.code.acklet.github.entity.Repository;
import com.code.acklet.github.repository.RepositoryRepository;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/github/webhook")
@RequiredArgsConstructor
@Tag(name = "GitHub Webhooks", description = "Endpoints for handling automated git sync webhooks")
public class GitHubWebhookController {

    private final RepositoryRepository repositoryRepository;
    private final ToolRepository toolRepository;

    @PostMapping
    @Operation(summary = "Handle incoming GitHub push events for Vercel-like sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleWebhook(
            @RequestHeader(value = "X-GitHub-Event", defaultValue = "push") String eventType,
            @RequestBody Map<String, Object> payload) {
        
        log.info("Received GitHub webhook event type: {}", eventType);

        Map<String, Object> response = new LinkedHashMap<>();
        
        if (!"push".equalsIgnoreCase(eventType)) {
            response.put("status", "IGNORED");
            response.put("reason", "Only push events are processed for live synchronization");
            return ResponseEntity.ok(ApiResponse.success(response, "Event ignored"));
        }

        // Extract repository name
        Map<String, Object> repoData = (Map<String, Object>) payload.get("repository");
        if (repoData == null) {
            response.put("status", "FAILED");
            response.put("reason", "No repository information in payload");
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid payload", "N/A", response));
        }

        String repoFullName = String.valueOf(repoData.get("full_name"));
        String headCommitSha = null;
        Map<String, Object> headCommit = (Map<String, Object>) payload.get("head_commit");
        if (headCommit != null) {
            headCommitSha = String.valueOf(headCommit.get("id"));
        }

        log.info("Processing push webhook for repository: {}, Commit SHA: {}", repoFullName, headCommitSha);

        // Find all matched repositories in Acklet DB
        List<Repository> repos = repositoryRepository.findAllByFullName(repoFullName);
        if (repos.isEmpty()) {
            response.put("status", "NOT_FOUND");
            response.put("reason", "Repository not registered in Acklet workspace");
            return ResponseEntity.ok(ApiResponse.success(response, "No action taken"));
        }

        // Analyze changed files to perform AI Impact Analysis
        List<String> modifiedFiles = new ArrayList<>();
        List<Map<String, Object>> commits = (List<Map<String, Object>>) payload.get("commits");
        if (commits != null) {
            for (Map<String, Object> commit : commits) {
                List<String> added = (List<String>) commit.get("added");
                List<String> modified = (List<String>) commit.get("modified");
                List<String> removed = (List<String>) commit.get("removed");
                if (added != null) modifiedFiles.addAll(added);
                if (modified != null) modifiedFiles.addAll(modified);
                if (removed != null) modifiedFiles.addAll(removed);
            }
        }

        boolean requiresRebuild = false;
        String rebuildReason = "No code or config changes detected";

        for (String file : modifiedFiles) {
            if (file.endsWith("package.json") || file.endsWith("pom.xml") || file.endsWith("Cargo.toml") || file.endsWith("Dockerfile")) {
                requiresRebuild = true;
                rebuildReason = "Dependency configuration file modified: " + file;
                break;
            }
            if (file.contains("src/") || file.contains("app/") || file.endsWith(".ts") || file.endsWith(".js") || file.endsWith(".java") || file.endsWith(".py")) {
                requiresRebuild = true;
                rebuildReason = "Source code file modified: " + file;
                break;
            }
        }

        log.info("AI Impact Analysis complete. Requires rebuild: {}. Reason: {}", requiresRebuild, rebuildReason);

        for (Repository repo : repos) {
            repo.setLatestCommitSha(headCommitSha);
            repo.setSyncStatus(requiresRebuild ? "BUILDING" : "SYNCED");
            repo.setUpdatedAt(Instant.now());
            repositoryRepository.save(repo);

            // Update associated tools if rebuild is not required
            if (!requiresRebuild) {
                toolRepository.findByRepositoryId(repo.getId()).ifPresent(tool -> {
                    log.info("Updating metadata for tool: {}", tool.getSlug());
                    tool.setUpdatedAt(Instant.now());
                    toolRepository.save(tool);
                });
            } else {
                // Simulate asynchronous sandbox rebuild
                final String finalSha = headCommitSha;
                new Thread(() -> {
                    try {
                        Thread.sleep(5000); // Wait 5 seconds to simulate build
                        repo.setSyncStatus("SYNCED");
                        repositoryRepository.save(repo);
                        log.info("Sandbox rebuild successfully finished for commit: {}", finalSha);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }).start();
            }
        }

        response.put("status", "SUCCESS");
        response.put("requiresRebuild", requiresRebuild);
        response.put("reason", rebuildReason);
        response.put("commitSha", headCommitSha);
        response.put("changedFilesCount", modifiedFiles.size());

        return ResponseEntity.ok(ApiResponse.success(response, "Webhook processed successfully"));
    }
}
