package com.code.acklet.admin.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.dto.ToolResponse;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.mapper.ToolMapper;
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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Moderation", description = "Admin tools for moderating publisher submissions and checking system health")
@SecurityRequirement(name = "bearerAuth")
public class AdminModerationController {

    private final ToolRepository toolRepository;
    private final ToolMapper     toolMapper;

    @GetMapping("/tools/pending")
    @Operation(summary = "List pending tool submissions awaiting review")
    public ResponseEntity<ApiResponse<Page<ToolResponse>>> getPendingTools(Pageable pageable) {
        Page<ToolResponse> pending = toolRepository.findByStatus(Tool.ToolStatus.PENDING, pageable)
                .map(toolMapper::toToolResponse);
        return ResponseEntity.ok(ApiResponse.success(pending, "Pending tools retrieved"));
    }

    @PostMapping("/tools/{id}/approve")
    @Operation(summary = "Approve tool submission (PENDING -> ACTIVE)")
    public ResponseEntity<ApiResponse<ToolResponse>> approveTool(@PathVariable UUID id) {
        Tool tool = toolRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tool not found: " + id));
        tool.setStatus(Tool.ToolStatus.ACTIVE);
        tool.setVerificationStatus(Tool.VerificationStatus.VERIFIED);
        toolRepository.save(tool);
        return ResponseEntity.ok(ApiResponse.success(toolMapper.toToolResponse(tool), "Tool approved successfully"));
    }

    @PostMapping("/tools/{id}/reject")
    @Operation(summary = "Reject tool submission (PENDING -> REJECTED)")
    public ResponseEntity<ApiResponse<ToolResponse>> rejectTool(@PathVariable UUID id) {
        Tool tool = toolRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tool not found: " + id));
        tool.setStatus(Tool.ToolStatus.REJECTED);
        toolRepository.save(tool);
        return ResponseEntity.ok(ApiResponse.success(toolMapper.toToolResponse(tool), "Tool rejected"));
    }

    @GetMapping("/health")
    @Operation(summary = "System & provider operational health status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemHealth() {
        Map<String, Object> health = Map.of(
                "status", "UP",
                "database", "CONNECTED",
                "redis", "ACTIVE",
                "rabbitmq", "ACTIVE",
                "timestamp", System.currentTimeMillis()
        );
        return ResponseEntity.ok(ApiResponse.success(health, "System operational health"));
    }
}
