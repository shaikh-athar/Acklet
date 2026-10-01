package com.code.acklet.feedback.controller;

import com.code.acklet.feedback.dto.FeedbackAdminUpdateRequest;
import com.code.acklet.feedback.dto.FeedbackRequest;
import com.code.acklet.feedback.dto.FeedbackResponse;
import com.code.acklet.feedback.service.FeedbackService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/feedback")
@RequiredArgsConstructor
@Tag(name = "Unified Feedback System", description = "Centralized feedback management across all Acklet tools & platform")
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    @Operation(summary = "Submit feedback", description = "Submits feedback from any tool, in-app modal, external or email source")
    public ResponseEntity<ApiResponse<FeedbackResponse>> submitFeedback(
            @RequestHeader(value = "User-Agent", required = false) String userAgentHeader,
            @Valid @RequestBody FeedbackRequest request) {

        FeedbackResponse response = feedbackService.submitFeedback(request, userAgentHeader);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Thank you for your feedback!"));
    }

    @GetMapping
    @Operation(summary = "Get feedback list", description = "Retrieves paginated feedback entries with filters for toolId, category, status, source, and search term")
    public ResponseEntity<ApiResponse<Page<FeedbackResponse>>> getFeedback(
            @RequestParam(required = false) String toolId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<FeedbackResponse> page = feedbackService.getFeedbackList(toolId, category, status, source, search, pageable);
        return ResponseEntity.ok(ApiResponse.success(page, "Feedback entries retrieved successfully"));
    }

    @GetMapping("/my")
    @Operation(summary = "Get current user's feedback", description = "Retrieves feedback entries submitted by the authenticated user")
    public ResponseEntity<ApiResponse<Page<FeedbackResponse>>> getMyFeedback(
            @RequestParam(required = false) UUID userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<FeedbackResponse> page = feedbackService.getUserFeedbackList(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(page, "User feedback entries retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get feedback by ID", description = "Retrieves a single feedback item by its UUID")
    public ResponseEntity<ApiResponse<FeedbackResponse>> getFeedbackById(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean isAdmin) {

        FeedbackResponse response = feedbackService.getFeedbackById(id, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(response, "Feedback retrieved successfully"));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update feedback (Admin)", description = "Updates feedback status, adds internal admin notes, or reassigns tool")
    public ResponseEntity<ApiResponse<FeedbackResponse>> updateFeedback(
            @PathVariable UUID id,
            @RequestBody FeedbackAdminUpdateRequest updateRequest) {

        FeedbackResponse response = feedbackService.updateFeedbackByAdmin(id, updateRequest);
        return ResponseEntity.ok(ApiResponse.success(response, "Feedback updated successfully"));
    }
}
