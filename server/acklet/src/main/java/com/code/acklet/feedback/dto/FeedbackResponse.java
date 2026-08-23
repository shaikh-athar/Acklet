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
    private Integer rating;
    private String message;
    private String category;
    private String toolId;
    private String email;
    private String pageUrl;
    private String userAgent;
    private String deviceType;
    private LocalDateTime createdAt;
    private String status;
}
