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
public class ToolPublishedEventMessage implements Serializable {
    private UUID toolId;
    private String slug;
    private String name;
    private UUID publisherId;
    private String categorySlug;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
