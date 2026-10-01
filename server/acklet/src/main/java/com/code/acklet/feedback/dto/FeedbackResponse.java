package com.code.acklet.feedback.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackResponse {

    private UUID id;
    private UUID userId;
    private String userDisplayName;
    private Integer rating;
    private String message;
    private String category;
    private String toolId;
    private String toolName;
    private String email;
    private String source;
    private String pageUrl;
    private String userAgent;
    private String deviceType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String status;
    private String adminNotes; // Only populated for admin contexts or null for public/users
}
