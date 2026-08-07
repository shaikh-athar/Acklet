package com.code.acklet.github.controller;

import com.code.acklet.github.dto.GitHubImportJobStatusDto;
import com.code.acklet.github.dto.GitHubImportResponse;
import com.code.acklet.github.entity.*;
import com.code.acklet.github.service.RepositoryImportPipelineService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
@Tag(name = "Repository Import Pipeline", description = "Endpoints for importing developer tool repositories asynchronously")
public class RepositoryImportPipelineController {

    private final RepositoryImportPipelineService pipelineService;
    private final com.code.acklet.github.service.GitHubImportService legacyImportService;

    @PostMapping("/import")
    @Operation(summary = "Import a GitHub repository (Phase 1 & Phase 2 async pipeline)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<GitHubImportResponse>> importRepository(
            @AuthenticationPrincipal User user,
            @RequestParam UUID accountId,
            @RequestParam String repoFullName) {
        GitHubImportResponse response = pipelineService.queueRepositoryImport(user, accountId, repoFullName);
        return ResponseEntity.accepted().body(ApiResponse.success(response, "Repository import request queued"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Repository core mapping details")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Repository>> getRepository(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        Repository repo = pipelineService.getRepository(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(repo, "Repository retrieved"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Disconnect/Delete a repository and its tool draft/tool profile")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> deleteRepository(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        pipelineService.deleteRepository(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Repository disconnected successfully"));
    }

    @PostMapping("/{id}/unlink")
    @Operation(summary = "Unlink a repository from its published tool profile")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> unlinkRepository(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        pipelineService.unlinkRepository(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Repository successfully unlinked from tool"));
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "Get current status/progress of import job")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<GitHubImportJobStatusDto>> getImportStatus(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        // Fallback to legacy status parser to support frontend compatibility seamlessly
        GitHubImportJobStatusDto status = legacyImportService.getStatus(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(status, "Import job status retrieved"));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel/abort an active repository import job")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> cancelImport(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        legacyImportService.cancelImport(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Import job cancelled successfully"));
    }

    @GetMapping("/{id}/repository")
    @Operation(summary = "Alias to retrieve repository core entity details")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Repository>> getRepositoryDetails(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        Repository repo = pipelineService.getRepository(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(repo, "Repository mapping details retrieved"));
    }

    @GetMapping("/{id}/metadata")
    @Operation(summary = "Retrieve repository metadata details")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<RepositoryMetadata>> getMetadata(@PathVariable UUID id) {
        RepositoryMetadata meta = pipelineService.getRepositoryMetadata(id);
        return ResponseEntity.ok(ApiResponse.success(meta, "Repository metadata retrieved"));
    }

    @GetMapping("/{id}/tree")
    @Operation(summary = "Retrieve repository directory tree structure list")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<RepositoryTree>> getTree(@PathVariable UUID id) {
        RepositoryTree tree = pipelineService.getRepositoryTree(id);
        return ResponseEntity.ok(ApiResponse.success(tree, "Repository tree structure retrieved"));
    }

    @GetMapping("/{id}/health")
    @Operation(summary = "Retrieve repository health and sub-metric scores")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<RepositoryHealth>> getHealth(@PathVariable UUID id) {
        RepositoryHealth health = pipelineService.getRepositoryHealth(id);
        return ResponseEntity.ok(ApiResponse.success(health, "Repository health metrics retrieved"));
    }

    @GetMapping("/{id}/statistics")
    @Operation(summary = "Retrieve repository statistics")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<RepositoryStatistics>> getStatistics(@PathVariable UUID id) {
        RepositoryStatistics stats = pipelineService.getRepositoryStatistics(id);
        return ResponseEntity.ok(ApiResponse.success(stats, "Repository statistics retrieved"));
    }

    @GetMapping
    @Operation(summary = "List all repositories linked/imported by user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Page<com.code.acklet.github.dto.RepositorySummaryDto>>> listRepositories(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<com.code.acklet.github.dto.RepositorySummaryDto> repos = pipelineService.listRepositories(user.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(repos, "User repositories list retrieved"));
    }

    @GetMapping("/{id}/discovered")
    @Operation(summary = "Get discovered monorepo child projects")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<java.util.List<RepositoryProject>>> getDiscoveredProjects(@PathVariable UUID id) {
        java.util.List<RepositoryProject> projects = pipelineService.getDiscoveredProjects(id);
        return ResponseEntity.ok(ApiResponse.success(projects, "Discovered monorepo projects retrieved"));
    }

    @PostMapping("/{id}/select")
    @Operation(summary = "Select specific sub-projects for import")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> selectProjects(
            @PathVariable UUID id,
            @RequestBody java.util.List<String> paths) {
        pipelineService.selectProjectsForImport(id, paths);
        return ResponseEntity.ok(ApiResponse.success(null, "Monorepo projects selected successfully"));
    }

    @GetMapping("/{id}/knowledge-graph")
    @Operation(summary = "Get repository knowledge graph (RKG)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<RepositoryKnowledgeGraph>> getKnowledgeGraph(@PathVariable UUID id) {
        RepositoryKnowledgeGraph kg = pipelineService.getRepositoryKnowledgeGraph(id);
        return ResponseEntity.ok(ApiResponse.success(kg, "Repository knowledge graph retrieved"));
    }

    @PostMapping("/{id}/restart")
    @Operation(summary = "Restart the import pipeline from a specific stage for development/debugging")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> restartStage(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam String stage) {
        pipelineService.restartPipelineStage(id, user.getId(), stage);
        return ResponseEntity.ok(ApiResponse.success(null, "Import pipeline restarted from stage: " + stage));
    }
}
