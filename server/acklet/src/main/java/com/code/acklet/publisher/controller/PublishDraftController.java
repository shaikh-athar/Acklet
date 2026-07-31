package com.code.acklet.publisher.controller;

import com.code.acklet.publisher.dto.PatchDraftRequest;
import com.code.acklet.publisher.dto.ToolDraftDto;
import com.code.acklet.publisher.service.PublishDraftService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/publish")
@RequiredArgsConstructor
@Tag(name = "Publish Wizard", description = "Repository → Tool publish wizard API")
@SecurityRequirement(name = "bearerAuth")
public class PublishDraftController {

    private final PublishDraftService draftService;

    /**
     * POST /api/v1/publish/drafts?repositoryId=<uuid>
     * Creates a new draft (or returns existing one) pre-populated with AI data.
     */
    @PostMapping("/drafts")
    @Operation(summary = "Create or resume a publish wizard draft")
    public ResponseEntity<ApiResponse<ToolDraftDto>> createOrResume(
            @AuthenticationPrincipal User user,
            @RequestParam UUID repositoryId) {
        ToolDraftDto dto = draftService.createOrResumeDraft(repositoryId, user.getId());
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(dto, "Draft ready"));
    }

    /**
     * GET /api/v1/publish/drafts/:draftId
     */
    @GetMapping("/drafts/{draftId}")
    @Operation(summary = "Load wizard draft by id")
    public ResponseEntity<ApiResponse<ToolDraftDto>> getDraft(
            @AuthenticationPrincipal User user,
            @PathVariable UUID draftId) {
        return ResponseEntity.ok(ApiResponse.success(
                draftService.getDraft(draftId, user.getId()), "Draft loaded"));
    }

    /**
     * PATCH /api/v1/publish/drafts/:draftId
     * Auto-save — all body fields are optional.
     */
    @PatchMapping("/drafts/{draftId}")
    @Operation(summary = "Auto-save draft changes")
    public ResponseEntity<ApiResponse<ToolDraftDto>> patchDraft(
            @AuthenticationPrincipal User user,
            @PathVariable UUID draftId,
            @RequestBody PatchDraftRequest req) {
        return ResponseEntity.ok(ApiResponse.success(
                draftService.patchDraft(draftId, user.getId(), req), "Saved"));
    }

    /**
     * POST /api/v1/publish/drafts/:draftId/publish
     * Final publish action — DRAFT → Tool (ACTIVE).
     */
    @PostMapping("/drafts/{draftId}/publish")
    @Operation(summary = "Publish tool from draft")
    public ResponseEntity<ApiResponse<Map<String, String>>> publishDraft(
            @AuthenticationPrincipal User user,
            @PathVariable UUID draftId) {
        Tool tool = draftService.publishDraft(draftId, user.getId());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("slug", tool.getSlug(), "toolId", tool.getId().toString()),
                "Tool published successfully!"));
    }

    /**
     * GET /api/v1/publish/drafts/:draftId/progress (SSE)
     * Streams analysis pipeline status in real-time.
     */
    @GetMapping(value = "/drafts/{draftId}/progress", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "SSE stream for analysis progress")
    public SseEmitter streamProgress(
            @AuthenticationPrincipal User user,
            @PathVariable UUID draftId) {
        return draftService.streamProgress(draftId, user.getId());
    }
}
