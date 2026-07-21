package com.code.acklet.ai.controller;

import com.code.acklet.ai.entity.AiJob;
import com.code.acklet.ai.provider.AiProvider;
import com.code.acklet.ai.provider.AiTaskType;
import com.code.acklet.ai.provider.ProviderRouter;
import com.code.acklet.ai.repository.AiJobRepository;
import com.code.acklet.ai.service.AiOrchestrationService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.repository.ToolRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/ai")
@RequiredArgsConstructor
@Tag(name = "AI Gateway (Admin)", description = "AI job management and provider health")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AiGatewayController {

    private final ProviderRouter        router;
    private final AiJobRepository       jobRepository;
    private final AiOrchestrationService orchestrationService;
    private final ToolRepository        toolRepository;
    private final List<AiProvider>      providers;

    /** Provider health status for all configured providers. */
    @GetMapping("/providers/health")
    @Operation(summary = "AI provider health check")
    public ResponseEntity<ApiResponse<Map<String, Object>>> providerHealth() {
        Map<String, Object> health = providers.stream().collect(Collectors.toMap(
                AiProvider::getProviderName,
                p -> Map.of(
                        "available", p.isAvailable(),
                        "tasks", p.getSupportedTasks()
                )
        ));
        health.put("activeForSummary", router.activeProviderName(AiTaskType.SUMMARY));
        health.put("activeForSeo", router.activeProviderName(AiTaskType.SEO));
        return ResponseEntity.ok(ApiResponse.success(health, "Provider health retrieved"));
    }

    /** List recent AI jobs with optional status filter. */
    @GetMapping("/jobs")
    @Operation(summary = "List AI jobs")
    public ResponseEntity<ApiResponse<Page<AiJob>>> listJobs(
            @RequestParam(required = false) AiJob.JobStatus status,
            Pageable pageable) {
        Page<AiJob> jobs = (status != null)
                ? jobRepository.findByStatus(status, pageable)
                : jobRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(jobs, "Jobs retrieved"));
    }

    /** Manually trigger AI enrichment for a tool (re-runs all pipeline steps). */
    @PostMapping("/tools/{toolId}/enrich")
    @Operation(summary = "Manually trigger AI enrichment for a tool")
    public ResponseEntity<ApiResponse<String>> triggerEnrichment(@PathVariable UUID toolId) {
        toolRepository.findById(toolId)
                .orElseThrow(() -> new com.code.acklet.shared.exception.ResourceNotFoundException("Tool not found: " + toolId));
        orchestrationService.enrich(toolId);
        return ResponseEntity.ok(ApiResponse.success("queued", "AI enrichment triggered asynchronously"));
    }
}
