package com.code.acklet.tool.service;

import com.code.acklet.shared.exception.ConflictException;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.dto.ToolReviewRequest;
import com.code.acklet.tool.dto.ToolReviewResponse;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.entity.ToolReview;
import com.code.acklet.tool.entity.ToolReview.ModerationStatus;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.tool.repository.ToolReviewRepository;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.code.acklet.event.dto.ToolReviewedEventMessage;
import com.code.acklet.event.publisher.RabbitMqEventPublisher;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ToolReviewService {

    private final ToolReviewRepository reviewRepository;
    private final ToolRepository       toolRepository;
    private final UserRepository       userRepository;
    private final RabbitMqEventPublisher rabbitMqEventPublisher;

    // ─── Submit ──────────────────────────────────────────────────────────────

    @Transactional
    public ToolReviewResponse submit(UUID userId, String toolSlug, ToolReviewRequest req) {
        Tool tool = toolRepository.findBySlug(toolSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + toolSlug));

        if (reviewRepository.existsByToolIdAndUserId(tool.getId(), userId)) {
            throw new ConflictException("You have already reviewed this tool");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ToolReview review = ToolReview.builder()
                .tool(tool)
                .user(user)
                .rating(req.getRating())
                .title(req.getTitle())
                .body(req.getBody())
                .useCase(req.getUseCase())
                .pros(req.getPros() != null ? req.getPros().toArray(new String[0]) : null)
                .cons(req.getCons() != null ? req.getCons().toArray(new String[0]) : null)
                .moderationStatus(ModerationStatus.PENDING)
                .build();

        ToolReview saved = reviewRepository.save(review);

        rabbitMqEventPublisher.publishToolReviewed(ToolReviewedEventMessage.builder()
                .reviewId(saved.getId())
                .toolId(tool.getId())
                .toolSlug(tool.getSlug())
                .userId(userId)
                .rating(req.getRating())
                .build());

        return toResponse(saved);
    }

    // ─── List (public) ────────────────────────────────────────────────────────

    public Page<ToolReviewResponse> getReviews(String toolSlug, Pageable pageable) {
        Tool tool = toolRepository.findBySlug(toolSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + toolSlug));
        return reviewRepository.findByToolIdAndDeletedAtIsNull(tool.getId(), pageable)
                .map(this::toResponse);
    }

    // ─── Delete (owner or admin) ──────────────────────────────────────────────

    @Transactional
    public void delete(UUID userId, UUID reviewId, boolean isAdmin) {
        ToolReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        if (!isAdmin && !review.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You do not own this review");
        }

        review.setDeletedAt(Instant.now());
        reviewRepository.save(review);
    }

    // ─── Mapper ───────────────────────────────────────────────────────────────

    private ToolReviewResponse toResponse(ToolReview r) {
        String displayName = r.getUser().getProfile() != null
                ? r.getUser().getProfile().getDisplayName()
                : r.getUser().getEmail();
        String avatarUrl = r.getUser().getProfile() != null
                ? r.getUser().getProfile().getAvatarUrl()
                : null;

        return ToolReviewResponse.builder()
                .id(r.getId())
                .userId(r.getUser().getId())
                .userDisplayName(displayName)
                .userAvatarUrl(avatarUrl)
                .rating(r.getRating())
                .title(r.getTitle())
                .body(r.getBody())
                .useCase(r.getUseCase())
                .pros(r.getPros() != null ? Arrays.asList(r.getPros()) : List.of())
                .cons(r.getCons() != null ? Arrays.asList(r.getCons()) : List.of())
                .isVerified(r.isVerified())
                .moderationStatus(r.getModerationStatus().name())
                .helpfulCount(r.getHelpfulCount())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
