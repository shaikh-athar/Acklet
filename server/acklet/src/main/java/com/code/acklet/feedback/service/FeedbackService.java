package com.code.acklet.feedback.service;

import com.code.acklet.feedback.dto.FeedbackAdminUpdateRequest;
import com.code.acklet.feedback.dto.FeedbackRequest;
import com.code.acklet.feedback.dto.FeedbackResponse;
import com.code.acklet.feedback.entity.Feedback;
import com.code.acklet.feedback.repository.FeedbackRepository;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    @Transactional
    public FeedbackResponse submitFeedback(FeedbackRequest request, String userAgentHeader) {
        String effectiveUserAgent = (request.getUserAgent() != null && !request.getUserAgent().isBlank())
                ? request.getUserAgent()
                : userAgentHeader;

        // Resolve authenticated user if available
        User user = resolveCurrentUser(request.getUserId());

        String effectiveEmail = request.getEmail();
        if ((effectiveEmail == null || effectiveEmail.isBlank()) && user != null) {
            effectiveEmail = user.getEmail();
        }

        String source = (request.getSource() != null && !request.getSource().isBlank())
                ? request.getSource().toUpperCase()
                : "IN_APP";

        String category = (request.getCategory() != null && !request.getCategory().isBlank())
                ? request.getCategory().toUpperCase()
                : "GENERAL";

        String toolId = (request.getToolId() != null && !request.getToolId().isBlank())
                ? request.getToolId()
                : "platform";

        String toolName = request.getToolName();
        if (toolName == null || toolName.isBlank()) {
            toolName = resolveToolName(toolId);
        }

        Feedback feedback = Feedback.builder()
                .user(user)
                .rating(request.getRating() != null ? request.getRating() : 5)
                .message(request.getMessage())
                .category(category)
                .toolId(toolId)
                .toolName(toolName)
                .email(effectiveEmail)
                .source(source)
                .pageUrl(request.getPageUrl())
                .userAgent(effectiveUserAgent)
                .deviceType(request.getDeviceType() != null ? request.getDeviceType() : "desktop")
                .status("NEW")
                .build();

        Feedback saved = feedbackRepository.save(feedback);
        log.info("Feedback submitted successfully. ID: {}, Tool: {}, Source: {}", saved.getId(), saved.getToolId(), saved.getSource());
        return mapToResponse(saved, false);
    }

    @Transactional(readOnly = true)
    public Page<FeedbackResponse> getFeedbackList(String toolId, String category, String status, String source, String search, Pageable pageable) {
        String cleanToolId = (toolId != null && !toolId.isBlank()) ? toolId.trim() : null;
        String cleanCategory = (category != null && !category.isBlank()) ? category.trim() : null;
        String cleanStatus = (status != null && !status.isBlank()) ? status.trim() : null;
        String cleanSource = (source != null && !source.isBlank()) ? source.trim() : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<Feedback> page = feedbackRepository.searchFeedback(
                cleanToolId, cleanCategory, cleanStatus, cleanSource, cleanSearch, pageable
        );

        // Include admin notes when queried via admin list
        return page.map(f -> mapToResponse(f, true));
    }

    @Transactional(readOnly = true)
    public Page<FeedbackResponse> getUserFeedbackList(UUID userId, Pageable pageable) {
        UUID effectiveUserId = userId;
        if (effectiveUserId == null) {
            User current = resolveCurrentUser(null);
            if (current != null) {
                effectiveUserId = current.getId();
            }
        }

        if (effectiveUserId == null) {
            return Page.empty(pageable);
        }

        Page<Feedback> page = feedbackRepository.findByUserId(effectiveUserId, pageable);
        // Exclude internal admin notes for users
        return page.map(f -> mapToResponse(f, false));
    }

    @Transactional(readOnly = true)
    public FeedbackResponse getFeedbackById(UUID id, boolean isAdmin) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Feedback not found with ID: " + id));
        return mapToResponse(feedback, isAdmin);
    }

    @Transactional
    public FeedbackResponse updateFeedbackByAdmin(UUID id, FeedbackAdminUpdateRequest updateRequest) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Feedback not found with ID: " + id));

        if (updateRequest.getStatus() != null && !updateRequest.getStatus().isBlank()) {
            feedback.setStatus(updateRequest.getStatus().toUpperCase());
        }

        if (updateRequest.getAdminNotes() != null) {
            feedback.setAdminNotes(updateRequest.getAdminNotes());
        }

        if (updateRequest.getToolId() != null && !updateRequest.getToolId().isBlank()) {
            feedback.setToolId(updateRequest.getToolId());
            if (updateRequest.getToolName() != null && !updateRequest.getToolName().isBlank()) {
                feedback.setToolName(updateRequest.getToolName());
            } else {
                feedback.setToolName(resolveToolName(updateRequest.getToolId()));
            }
        }

        if (updateRequest.getCategory() != null && !updateRequest.getCategory().isBlank()) {
            feedback.setCategory(updateRequest.getCategory().toUpperCase());
        }

        Feedback updated = feedbackRepository.save(feedback);
        log.info("Feedback ID: {} updated by admin. New status: {}", updated.getId(), updated.getStatus());
        return mapToResponse(updated, true);
    }

    private User resolveCurrentUser(UUID explicitUserId) {
        if (explicitUserId != null) {
            return userRepository.findById(explicitUserId).orElse(null);
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String identifier = auth.getName();
            try {
                // Check if username/principal is UUID
                UUID userUuid = UUID.fromString(identifier);
                return userRepository.findById(userUuid).orElse(null);
            } catch (IllegalArgumentException e) {
                // Otherwise query by email
                return userRepository.findByEmail(identifier).orElse(null);
            }
        }
        return null;
    }

    private String resolveToolName(String toolId) {
        if (toolId == null || toolId.isBlank() || "platform".equalsIgnoreCase(toolId)) {
            return "Acklet Platform";
        }
        switch (toolId.toLowerCase()) {
            case "airvault":
            case "air-vault":
                return "AirVault";
            case "json-lens":
            case "datalens":
            case "data-lens":
            case "json-formatter":
                return "DataLens";
            case "jwt-decoder":
            case "jwt-inspector":
                return "JWT Inspector";
            default:
                return toolId;
        }
    }

    private FeedbackResponse mapToResponse(Feedback f, boolean includeAdminNotes) {
        String userDisplayName = null;
        if (f.getUser() != null) {
            if (f.getUser().getProfile() != null && f.getUser().getProfile().getDisplayName() != null) {
                userDisplayName = f.getUser().getProfile().getDisplayName();
            } else {
                userDisplayName = f.getUser().getEmail();
            }
        }

        return FeedbackResponse.builder()
                .id(f.getId())
                .userId(f.getUser() != null ? f.getUser().getId() : null)
                .userDisplayName(userDisplayName)
                .rating(f.getRating())
                .message(f.getMessage())
                .category(f.getCategory())
                .toolId(f.getToolId())
                .toolName(f.getToolName())
                .email(f.getEmail())
                .source(f.getSource())
                .pageUrl(f.getPageUrl())
                .userAgent(f.getUserAgent())
                .deviceType(f.getDeviceType())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .status(f.getStatus())
                .adminNotes(includeAdminNotes ? f.getAdminNotes() : null)
                .build();
    }
}
