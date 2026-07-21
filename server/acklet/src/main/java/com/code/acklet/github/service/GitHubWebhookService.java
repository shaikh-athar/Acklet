package com.code.acklet.github.service;

import com.code.acklet.github.entity.GitHubIntegration;
import com.code.acklet.github.repository.GitHubIntegrationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Validates HMAC SHA-256 signatures for GitHub incoming webhooks and processes automated sync events.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubWebhookService {

    private final GitHubIntegrationRepository integrationRepository;
    private final GitHubSyncService        syncService;
    private final ObjectMapper             objectMapper;

    @Value("${app.github.webhook-secret:}")
    private String webhookSecret;

    /**
     * Validates signature header "sha256=..." against payload body using HMAC SHA-256.
     */
    public boolean verifySignature(String rawPayload, String signatureHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("GitHub webhook-secret is not configured. Skipping HMAC validation for local dev.");
            return true;
        }

        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }

        String expectedHash = signatureHeader.substring(7);
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);
            byte[] hash = hmac.doFinal(rawPayload.getBytes(StandardCharsets.UTF_8));
            String actualHash = HexFormat.of().formatHex(hash);
            return actualHash.equalsIgnoreCase(expectedHash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Failed to compute HMAC SHA-256 for GitHub webhook: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Processes incoming GitHub Webhook event.
     */
    public void processWebhookEvent(String eventType, String rawPayload) {
        try {
            JsonNode payload = objectMapper.readTree(rawPayload);
            String fullRepoName = payload.path("repository").path("full_name").asText(null);

            if (fullRepoName == null || fullRepoName.isBlank()) {
                log.warn("GitHub webhook missing repository.full_name");
                return;
            }

            Optional<GitHubIntegration> integrationOpt = integrationRepository.findByGithubRepo(fullRepoName);
            if (integrationOpt.isEmpty()) {
                log.info("Received GitHub webhook for unlinked repo: {}. Ignoring.", fullRepoName);
                return;
            }

            GitHubIntegration integration = integrationOpt.get();
            if (integration.getTool() == null) return;

            log.info("Processing GitHub webhook event '{}' for repo: {}", eventType, fullRepoName);

            switch (eventType) {
                case "push":
                    String ref = payload.path("ref").asText("");
                    if (ref.endsWith("/" + integration.getDefaultBranch()) || ref.endsWith("/main") || ref.endsWith("/master")) {
                        log.info("Push detected on default branch for tool {}. Triggering auto-sync...", integration.getTool().getSlug());
                        syncService.syncRepository(integration.getTool().getId());
                    }
                    break;

                case "release":
                    String action = payload.path("action").asText("");
                    if ("published".equalsIgnoreCase(action)) {
                        log.info("New release published for tool {}. Triggering auto-sync...", integration.getTool().getSlug());
                        syncService.syncRepository(integration.getTool().getId());
                    }
                    break;

                default:
                    log.debug("Ignored webhook event type: {}", eventType);
                    break;
            }

        } catch (Exception e) {
            log.error("Failed to process GitHub webhook payload: {}", e.getMessage(), e);
        }
    }
}
