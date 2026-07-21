package com.code.acklet.event.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolReviewedEventMessage implements Serializable {
    private UUID reviewId;
    private UUID toolId;
    private String toolSlug;
    private UUID userId;
    private short rating;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
