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
public class ToolUpdatedEventMessage implements Serializable {
    private UUID toolId;
    private String slug;
    private UUID publisherId;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
