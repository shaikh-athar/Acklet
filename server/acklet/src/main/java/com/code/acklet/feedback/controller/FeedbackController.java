package com.code.acklet.feedback.controller;

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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/feedback")
@RequiredArgsConstructor
@Tag(name = "Platform & Tool Feedback", description = "Submit and retrieve user feedback and metadata")
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    @Operation(summary = "Submit feedback", description = "Submits user feedback, rating, category, and environment metadata")
    public ResponseEntity<ApiResponse<FeedbackResponse>> submitFeedback(
            @RequestHeader(value = "User-Agent", required = false) String userAgentHeader,
            @Valid @RequestBody FeedbackRequest request) {

        FeedbackResponse response = feedbackService.submitFeedback(request, userAgentHeader);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Thank you for your feedback!"));
    }

    @GetMapping
    @Operation(summary = "Get feedback list", description = "Retrieves paginated feedback entries, optionally filtered by toolId")
    public ResponseEntity<ApiResponse<Page<FeedbackResponse>>> getFeedback(
            @RequestParam(required = false) String toolId,
            Pageable pageable) {

        Page<FeedbackResponse> page = feedbackService.getFeedbackList(toolId, pageable);
        return ResponseEntity.ok(ApiResponse.success(page, "Feedback entries retrieved successfully"));
    }
}
