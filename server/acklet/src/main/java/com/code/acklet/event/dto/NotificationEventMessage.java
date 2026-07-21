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
public class NotificationEventMessage implements Serializable {
    private UUID userId;
    private String title;
    private String content;
    private String type; // SYSTEM, REVIEW, TOOL, SECURITY
    @Builder.Default
    private Instant timestamp = Instant.now();
}
