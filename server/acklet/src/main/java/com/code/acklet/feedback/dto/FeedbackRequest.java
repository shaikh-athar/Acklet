package com.code.acklet.feedback.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackRequest {

    @NotNull(message = "Rating score (1-5) is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating cannot exceed 5")
    private Integer rating;

    @NotBlank(message = "Feedback message text is required")
    private String message;

    private String category; // 'BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'USABILITY', 'GENERAL', 'PERFORMANCE'

    private String toolId; // e.g. 'json-lens', 'airvault', 'platform'

    private String toolName; // e.g. 'JSONLens', 'AirVault', 'Acklet Platform'

    private String email; // Optional contact email for response

    private String source; // 'IN_APP', 'EMAIL', 'EXTERNAL', 'API', 'MANUAL'

    private String pageUrl; // Optional current route URL

    private String userAgent; // Optional browser environment string

    private String deviceType; // Optional 'desktop', 'tablet', 'mobile'

    private UUID userId; // Optional explicit user ID
}
