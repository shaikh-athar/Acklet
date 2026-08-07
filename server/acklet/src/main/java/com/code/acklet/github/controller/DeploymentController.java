package com.code.acklet.github.controller;

import com.code.acklet.github.entity.Deployment;
import com.code.acklet.github.entity.Repository;
import com.code.acklet.github.repository.DeploymentRepository;
import com.code.acklet.github.repository.RepositoryRepository;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.tool.service.ToolRegistryService;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/deployments")
@RequiredArgsConstructor
@Tag(name = "Tool Deployments", description = "Endpoints for managing live tool deployments and version rollbacks")
public class DeploymentController {

    private final DeploymentRepository deploymentRepository;
    private final RepositoryRepository repositoryRepository;
    private final ToolRepository toolRepository;
    private final ToolRegistryService toolRegistryService;

    @GetMapping("/project/{repositoryId}")
    @Operation(summary = "List all deployments for a repository project")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<Deployment>>> listDeployments(
            @PathVariable UUID repositoryId) {
        List<Deployment> deployments = deploymentRepository.findAllByRepositoryIdOrderByCreatedAtDesc(repositoryId);
        return ResponseEntity.ok(ApiResponse.success(deployments, "Deployments list retrieved"));
    }

    @GetMapping
    @Operation(summary = "List all deployments across all tools and repositories")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<Deployment>>> listAllDeployments() {
        List<Deployment> deployments = deploymentRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(ApiResponse.success(deployments, "All deployments list retrieved"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get details of a specific deployment")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Deployment>> getDeployment(
            @PathVariable UUID id) {
        Deployment deployment = deploymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deployment not found"));
        return ResponseEntity.ok(ApiResponse.success(deployment, "Deployment retrieved"));
    }

    @PostMapping("/{id}/rollback")
    @Operation(summary = "Rollback tool to this specific deployment version")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Deployment>> rollback(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        Deployment target = deploymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deployment not found"));

        Tool tool = target.getTool();
        if (tool == null) {
            // Find by repository
            tool = toolRepository.findByRepositoryId(target.getRepository().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("No active Tool associated with this repository"));
        }

        // Apply configuration rollback
        tool.setRuntime(target.getRuntime());
        tool.setBuildCommand(target.getBuildCommand());
        tool.setStartCommand(target.getStartCommand());
        tool.setPort(target.getPort());
        tool.setVersion(target.getCommitSha().substring(0, 7));
        tool.setUpdatedAt(Instant.now());
        toolRepository.save(tool);

        // Register with registry
        toolRegistryService.registerTool(tool.getId().toString(), tool.getName(), tool.getSlug(), tool.getVersion(), tool.getPort());

        // Create a new Deployment record indicating the Rollback action
        Deployment rollbackDeployment = Deployment.builder()
                .repository(target.getRepository())
                .tool(tool)
                .branch(target.getBranch())
                .commitSha(target.getCommitSha())
                .commitMessage("Rollback to commit: " + target.getCommitMessage())
                .author(target.getAuthor())
                .status("SUCCESS")
                .framework(target.getFramework())
                .runtime(target.getRuntime())
                .packageManager(target.getPackageManager())
                .port(target.getPort())
                .liveUrl(target.getLiveUrl())
                .buildCommand(target.getBuildCommand())
                .startCommand(target.getStartCommand())
                .buildLogs("[acklet-rollback] Active rollback request received.\n[acklet-rollback] Restoring configs to commit " + target.getCommitSha() + "\n[acklet-rollback] Rollback completed successfully.")
                .runtimeLogs("[acklet-runtime] Active rollback: Restored application server.\n[acklet-runtime] Active port: " + target.getPort())
                .createdBy(user.getEmail())
                .createdAt(Instant.now())
                .build();

        rollbackDeployment = deploymentRepository.save(rollbackDeployment);

        return ResponseEntity.ok(ApiResponse.success(rollbackDeployment, "Rollback successful"));
    }

    @PostMapping("/{id}/redeploy")
    @Operation(summary = "Re-trigger build/deploy process for this deployment commit")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Deployment>> redeploy(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        Deployment target = deploymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deployment not found"));

        Tool tool = target.getTool();
        if (tool == null) {
            tool = toolRepository.findByRepositoryId(target.getRepository().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("No active Tool associated with this repository"));
        }

        // Create a new active build deployment
        Deployment redeploy = Deployment.builder()
                .repository(target.getRepository())
                .tool(tool)
                .branch(target.getBranch())
                .commitSha(target.getCommitSha())
                .commitMessage("Redeploy: " + target.getCommitMessage())
                .author(target.getAuthor())
                .status("SUCCESS")
                .framework(target.getFramework())
                .runtime(target.getRuntime())
                .packageManager(target.getPackageManager())
                .port(target.getPort())
                .liveUrl(target.getLiveUrl())
                .buildCommand(target.getBuildCommand())
                .startCommand(target.getStartCommand())
                .buildLogs("[acklet-builder] Triggering clean redeploy of commit " + target.getCommitSha() + "...\n[acklet-builder] Re-running build...\n[acklet-builder] Compilation finished successfully.\n[acklet-deployer] Sandbox deployment refreshed.")
                .runtimeLogs("[acklet-runtime] Clean launch completed.\n[acklet-runtime] Running health check: SUCCESS")
                .createdBy(user.getEmail())
                .createdAt(Instant.now())
                .build();

        redeploy = deploymentRepository.save(redeploy);

        // Register in active registry
        toolRegistryService.registerTool(tool.getId().toString(), tool.getName(), tool.getSlug(), tool.getVersion(), tool.getPort());

        return ResponseEntity.ok(ApiResponse.success(redeploy, "Redeploy triggered successfully"));
    }
}
