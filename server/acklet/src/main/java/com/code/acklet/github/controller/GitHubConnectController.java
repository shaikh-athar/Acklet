package com.code.acklet.github.controller;

import com.code.acklet.github.dto.*;
import com.code.acklet.github.service.GitHubConnectService;
import com.code.acklet.github.service.GitHubImportService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * GitHub user-level OAuth and repository import endpoints.
 *
 * All endpoints require a valid JWT (bearerAuth) except where noted.
 */
@RestController
@RequestMapping("/api/v1/github")
@RequiredArgsConstructor
@Tag(name = "GitHub Integration", description = "Connect GitHub accounts and import repositories as tools")
public class GitHubConnectController {

    private final GitHubConnectService connectService;
    private final GitHubImportService  importService;

    // ── OAuth ──────────────────────────────────────────────────────────────────

    @GetMapping("/connect-url")
    @Operation(summary = "Get GitHub OAuth authorization URL (CSRF-protected)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Map<String, String>>> getConnectUrl(
            @AuthenticationPrincipal User user) {
        String url = connectService.buildConnectUrl(user.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("url", url), "GitHub OAuth URL generated"));
    }

    @GetMapping("/callback")
    @Operation(summary = "Handle GitHub OAuth callback — exchange code for token")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<GitHubAccountResponse>> handleCallback(
            @AuthenticationPrincipal User user,
            @RequestParam String code,
            @RequestParam String state) {
        GitHubAccountResponse account = connectService.handleCallback(user, code, state);
        return ResponseEntity.ok(ApiResponse.success(account, "GitHub account connected"));
    }

    // ── Account Management ─────────────────────────────────────────────────────

    @GetMapping("/accounts")
    @Operation(summary = "List connected GitHub accounts")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<GitHubAccountResponse>>> listAccounts(
            @AuthenticationPrincipal User user) {
        List<GitHubAccountResponse> accounts = connectService.listAccounts(user.getId());
        return ResponseEntity.ok(ApiResponse.success(accounts, "GitHub accounts retrieved"));
    }

    @DeleteMapping("/accounts/{accountId}")
    @Operation(summary = "Disconnect a GitHub account")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> disconnectAccount(
            @AuthenticationPrincipal User user,
            @PathVariable UUID accountId) {
        connectService.disconnectAccount(user.getId(), accountId);
        return ResponseEntity.ok(ApiResponse.success(null, "GitHub account disconnected"));
    }

    // ── Repository Listing ─────────────────────────────────────────────────────

    @GetMapping("/accounts/{accountId}/repos")
    @Operation(summary = "List GitHub repositories for a connected account")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<GitHubRepoDto>>> listRepos(
            @AuthenticationPrincipal User user,
            @PathVariable UUID accountId,
            @RequestParam(defaultValue = "1")   int page,
            @RequestParam(defaultValue = "30")  int perPage,
            @RequestParam(required = false)     String search) {
        List<GitHubRepoDto> repos = connectService.listRepos(user.getId(), accountId, page, perPage, search);
        return ResponseEntity.ok(ApiResponse.success(repos, "Repositories retrieved"));
    }

    // ── Import ─────────────────────────────────────────────────────────────────

    @PostMapping("/import")
    @Operation(summary = "Import a GitHub repository as a new tool (async)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<GitHubImportResponse>> importRepository(
            @AuthenticationPrincipal User user,
            @RequestParam UUID accountId,
            @RequestParam String repoFullName,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String buildCommand,
            @RequestParam(required = false) String startCommand,
            @RequestParam(required = false) String installCommand,
            @RequestParam(required = false) Map<String, String> envVars) {
        GitHubImportResponse response = importService.startImport(
                user, accountId, repoFullName, branch, buildCommand, startCommand, installCommand, envVars
        );
        return ResponseEntity.accepted().body(ApiResponse.success(response, "Import started"));
    }

    @GetMapping("/import/{jobId}/status")
    @Operation(summary = "Poll import job status")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<GitHubImportJobStatusDto>> getImportStatus(
            @AuthenticationPrincipal User user,
            @PathVariable UUID jobId) {
        GitHubImportJobStatusDto status = importService.getStatus(jobId, user.getId());
        return ResponseEntity.ok(ApiResponse.success(status, "Import status retrieved"));
    }

    @GetMapping("/accounts/{accountId}/repos/{owner}/{repo}/branches")
    @Operation(summary = "List Git branches for a repository")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<String>>> getBranches(
            @AuthenticationPrincipal User user,
            @PathVariable UUID accountId,
            @PathVariable String owner,
            @PathVariable String repo) {
        List<String> branches = connectService.listBranches(user.getId(), accountId, owner, repo);
        return ResponseEntity.ok(ApiResponse.success(branches, "Branches retrieved"));
    }
}
