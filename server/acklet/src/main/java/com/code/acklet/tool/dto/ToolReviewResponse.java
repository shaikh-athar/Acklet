package com.code.acklet.tool.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolReviewResponse {
    private UUID id;
    private UUID userId;
    private String userDisplayName;
    private String userAvatarUrl;
    private short rating;
    private String title;
    private String body;
    private String useCase;
    private List<String> pros;
    private List<String> cons;
    private boolean isVerified;
    private String moderationStatus;
    private int helpfulCount;
    private Instant createdAt;
}
