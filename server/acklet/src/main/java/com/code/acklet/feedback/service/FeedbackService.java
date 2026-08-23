package com.code.acklet.feedback.service;

import com.code.acklet.feedback.dto.FeedbackRequest;
import com.code.acklet.feedback.dto.FeedbackResponse;
import com.code.acklet.feedback.entity.Feedback;
import com.code.acklet.feedback.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;

    @Transactional
    public FeedbackResponse submitFeedback(FeedbackRequest request, String userAgentHeader) {
        String effectiveUserAgent = (request.getUserAgent() != null && !request.getUserAgent().isBlank())
                ? request.getUserAgent()
                : userAgentHeader;

        Feedback feedback = Feedback.builder()
                .rating(request.getRating())
                .message(request.getMessage())
                .category(request.getCategory() != null ? request.getCategory() : "general")
                .toolId(request.getToolId() != null ? request.getToolId() : "platform")
                .email(request.getEmail())
                .pageUrl(request.getPageUrl())
                .userAgent(effectiveUserAgent)
                .deviceType(request.getDeviceType() != null ? request.getDeviceType() : "desktop")
                .build();

        Feedback saved = feedbackRepository.save(feedback);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<FeedbackResponse> getFeedbackList(String toolId, Pageable pageable) {
        Page<Feedback> page = (toolId != null && !toolId.isBlank())
                ? feedbackRepository.findByToolId(toolId, pageable)
                : feedbackRepository.findAll(pageable);

        return page.map(this::mapToResponse);
    }

    private FeedbackResponse mapToResponse(Feedback f) {
        return FeedbackResponse.builder()
                .id(f.getId())
                .rating(f.getRating())
                .message(f.getMessage())
                .category(f.getCategory())
                .toolId(f.getToolId())
                .email(f.getEmail())
                .pageUrl(f.getPageUrl())
                .userAgent(f.getUserAgent())
                .deviceType(f.getDeviceType())
                .createdAt(f.getCreatedAt())
                .status(f.getStatus())
                .build();
    }
}
