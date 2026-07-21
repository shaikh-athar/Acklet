package com.code.acklet.publisher.controller;

import com.code.acklet.publisher.service.PublisherService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.dto.CreateToolRequest;
import com.code.acklet.tool.dto.ToolResponse;
import com.code.acklet.tool.dto.UpdateToolRequest;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.mapper.ToolMapper;
import com.code.acklet.tool.service.ToolPublishingService;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/publisher")
@RequiredArgsConstructor
@Tag(name = "Publisher", description = "Tool publishing and management for verified publishers")
@SecurityRequirement(name = "bearerAuth")
public class PublisherController {

    private final PublisherService     publisherService;
    private final ToolPublishingService toolPublishingService;
    private final ToolMapper            toolMapper;

    // ─── Become publisher ─────────────────────────────────────────────────────

    @PostMapping("/become")
    @Operation(summary = "Upgrade to publisher", description = "Upgrades the authenticated user's role from USER to PUBLISHER")
    public ResponseEntity<ApiResponse<Map<String, String>>> becomePublisher(
            @AuthenticationPrincipal User user) {
        publisherService.becomePublisher(user.getId());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("role", "PUBLISHER", "message", "You are now a publisher. You can submit tools for review."),
                "Role upgraded successfully"));
    }

    // ─── Dashboard stats ──────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('PUBLISHER', 'ADMIN')")
    @Operation(summary = "Publisher dashboard stats")
    public ResponseEntity<ApiResponse<PublisherService.PublisherStats>> getDashboard(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                publisherService.getStats(user.getId()), "Dashboard loaded"));
    }

    // ─── List my tools ────────────────────────────────────────────────────────

    @GetMapping("/tools")
    @PreAuthorize("hasAnyRole('PUBLISHER', 'ADMIN')")
    @Operation(summary = "List my tools")
    public ResponseEntity<ApiResponse<Page<ToolResponse>>> getMyTools(
            @AuthenticationPrincipal User user,
            Pageable pageable) {
        Page<ToolResponse> tools = toolPublishingService.getMyTools(user.getId(), pageable)
                .map(toolMapper::toToolResponse);
        return ResponseEntity.ok(ApiResponse.success(tools, "Tools retrieved"));
    }

    // ─── Create tool (DRAFT) ─────────────────────────────────────────────────

    @PostMapping("/tools")
    @PreAuthorize("hasAnyRole('PUBLISHER', 'ADMIN')")
    @Operation(summary = "Create a tool draft")
    public ResponseEntity<ApiResponse<ToolResponse>> createTool(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateToolRequest req) {
        Tool tool = toolPublishingService.createDraft(user.getId(), req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(toolMapper.toToolResponse(tool), "Tool draft created"));
    }

    // ─── Update tool ──────────────────────────────────────────────────────────

    @PutMapping("/tools/{slug}")
    @PreAuthorize("hasAnyRole('PUBLISHER', 'ADMIN')")
    @Operation(summary = "Update a tool")
    public ResponseEntity<ApiResponse<ToolResponse>> updateTool(
            @AuthenticationPrincipal User user,
            @PathVariable String slug,
            @Valid @RequestBody UpdateToolRequest req) {
        Tool tool = toolPublishingService.update(user.getId(), slug, req);
        return ResponseEntity.ok(ApiResponse.success(toolMapper.toToolResponse(tool), "Tool updated"));
    }

    // ─── Submit for review ────────────────────────────────────────────────────

    @PostMapping("/tools/{slug}/submit")
    @PreAuthorize("hasAnyRole('PUBLISHER', 'ADMIN')")
    @Operation(summary = "Submit tool for admin review (DRAFT → PENDING)")
    public ResponseEntity<ApiResponse<ToolResponse>> submitTool(
            @AuthenticationPrincipal User user,
            @PathVariable String slug) {
        Tool tool = toolPublishingService.submit(user.getId(), slug);
        return ResponseEntity.ok(ApiResponse.success(toolMapper.toToolResponse(tool), "Tool submitted for review"));
    }

    // ─── Soft delete ──────────────────────────────────────────────────────────

    @DeleteMapping("/tools/{slug}")
    @PreAuthorize("hasAnyRole('PUBLISHER', 'ADMIN')")
    @Operation(summary = "Archive (soft-delete) a tool")
    public ResponseEntity<ApiResponse<Void>> deleteTool(
            @AuthenticationPrincipal User user,
            @PathVariable String slug) {
        toolPublishingService.softDelete(user.getId(), slug);
        return ResponseEntity.ok(ApiResponse.success(null, "Tool archived"));
    }
}
