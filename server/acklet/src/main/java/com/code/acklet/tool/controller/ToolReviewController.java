package com.code.acklet.tool.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.dto.ToolReviewRequest;
import com.code.acklet.tool.dto.ToolReviewResponse;
import com.code.acklet.tool.service.ToolReviewService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tools/{slug}/reviews")
@RequiredArgsConstructor
@Tag(name = "Tool Reviews", description = "Submit and browse community reviews for tools")
public class ToolReviewController {

    private final ToolReviewService reviewService;

    @GetMapping
    @Operation(summary = "List reviews for a tool")
    public ResponseEntity<ApiResponse<Page<ToolReviewResponse>>> getReviews(
            @PathVariable String slug,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.getReviews(slug, pageable), "Reviews retrieved"));
    }

    @PostMapping
    @Operation(summary = "Submit a review", description = "One review per authenticated user per tool")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<ToolReviewResponse>> submitReview(
            @PathVariable String slug,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ToolReviewRequest req) {
        ToolReviewResponse review = reviewService.submit(user.getId(), slug, req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(review, "Review submitted and pending moderation"));
    }

    @DeleteMapping("/{reviewId}")
    @Operation(summary = "Delete a review (owner or admin)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable String slug,
            @PathVariable UUID reviewId,
            @AuthenticationPrincipal User user) {
        boolean isAdmin = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        reviewService.delete(user.getId(), reviewId, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "Review deleted"));
    }
}
