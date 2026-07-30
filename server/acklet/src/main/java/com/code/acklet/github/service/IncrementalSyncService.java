package com.code.acklet.github.service;

import com.code.acklet.event.config.RabbitMqConfig;
import com.code.acklet.github.dto.RepoImportEvent;
import com.code.acklet.github.entity.Repository;
import com.code.acklet.github.entity.RepositorySyncHistory;
import com.code.acklet.github.repository.RepositoryRepository;
import com.code.acklet.github.repository.RepositorySyncHistoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncrementalSyncService {

    private final RepositoryRepository repositoryRepository;
    private final RepositorySyncHistoryRepository syncHistoryRepository;
    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public void processPushWebhook(String fullRepoName, JsonNode payload) {
        log.info("Starting smart incremental sync for: {}", fullRepoName);

        // Find Repository records connected under this fullName
        List<Repository> repos = repositoryRepository.findAll().stream()
                .filter(r -> r.getFullName().equalsIgnoreCase(fullRepoName))
                .toList();

        if (repos.isEmpty()) {
            log.info("No repositories in database match: {}. Skipping sync.", fullRepoName);
            return;
        }

        // Parse changed files from webhook commits
        List<String> changedFiles = new ArrayList<>();
        String committer = "Unknown";
        String commitSha = payload.path("after").asText("unknown");

        if (payload.has("commits")) {
            payload.path("commits").forEach(commit -> {
                commit.path("added").forEach(f -> changedFiles.add(f.asText()));
                commit.path("modified").forEach(f -> changedFiles.add(f.asText()));
                commit.path("removed").forEach(f -> changedFiles.add(f.asText()));
            });
            committer = payload.path("head_commit").path("committer").path("name").asText("GitHub Webhook");
        }

        // Determine if a full rescan is needed
        boolean requiresFullRescan = checkIfRequiresFullRescan(changedFiles);

        for (Repository repo : repos) {
            RepositorySyncHistory history = RepositorySyncHistory.builder()
                    .repository(repo)
                    .commitSha(commitSha)
                    .committer(committer)
                    .changedFiles(changedFiles)
                    .isFullRescan(requiresFullRescan)
                    .syncedAt(Instant.now())
                    .build();
            syncHistoryRepository.save(history);

            repo.setUpdatedAt(Instant.now());
            repositoryRepository.save(repo);

            if (requiresFullRescan) {
                log.info("Major project files changed in repo: {}. Enqueueing full AI re-analysis.", fullRepoName);
                RepoImportEvent event = RepoImportEvent.builder()
                        .jobId(UUID.randomUUID()) // New session ID for trace
                        .accountId(repo.getUser().getId()) // Fallback trace ID
                        .repoFullName(repo.getFullName())
                        .build();

                // Re-trigger tree & metadata update pipeline
                rabbitTemplate.convertAndSend(
                        RabbitMqConfig.IMPORT_EXCHANGE,
                        RabbitMqConfig.ROUTING_KEY_IMPORT_QUEUED,
                        event
                );
            } else {
                log.info("Minor edits in repo: {}. Updated commit SHA only.", fullRepoName);
            }
        }
    }

    private boolean checkIfRequiresFullRescan(List<String> changedFiles) {
        if (changedFiles.isEmpty()) return true; // Default fallback to safe rescan
        for (String file : changedFiles) {
            if (file.equalsIgnoreCase("README.md") || file.equalsIgnoreCase("README") ||
                file.endsWith("package.json") || file.endsWith("pom.xml") ||
                file.endsWith("go.mod") || file.endsWith("Cargo.toml") ||
                file.endsWith("Dockerfile") || file.contains(".github/workflows")) {
                return true;
            }
        }
        return false;
    }
}
