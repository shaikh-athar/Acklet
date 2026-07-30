package com.code.acklet.github.controller;

import com.code.acklet.github.dto.GitHubIntegrationResponse;
import com.code.acklet.github.dto.GitHubOAuthConnectRequest;
import com.code.acklet.github.service.GitHubSyncService;
import com.code.acklet.github.service.GitHubWebhookService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/github")
@RequiredArgsConstructor
@Tag(name = "GitHub Sync", description = "OAuth integration, repository sync, and webhook processing")
public class GitHubIntegrationController {

    private final GitHubSyncService    syncService;
    private final GitHubWebhookService webhookService;


    @PostMapping("/connect")
    @Operation(summary = "Connect tool to GitHub repository")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<GitHubIntegrationResponse>> connectRepository(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody GitHubOAuthConnectRequest req) {
        GitHubIntegrationResponse response = syncService.connectRepository(
                user, req.getToolId(), req.getGithubRepo(), req.getCode()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Repository successfully connected and synced"));
    }

    @PostMapping("/sync/{toolId}")
    @Operation(summary = "Trigger manual GitHub re-sync for a tool")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> triggerSync(@PathVariable UUID toolId) {
        syncService.syncRepository(toolId);
        return ResponseEntity.ok(ApiResponse.success(null, "GitHub repository sync triggered"));
    }

    @PostMapping("/webhooks")
    @Operation(summary = "GitHub incoming webhooks listener")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader(value = "X-GitHub-Event", defaultValue = "push") String eventType,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String rawPayload) {

        if (!webhookService.verifySignature(rawPayload, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid HMAC signature");
        }

        webhookService.processWebhookEvent(eventType, rawPayload);
        return ResponseEntity.ok("Webhook processed");
    }
}
