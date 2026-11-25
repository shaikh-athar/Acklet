package com.code.acklet.docs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SectionResponse {
    private UUID id;
    private UUID documentId;
    private String heading;
    private String body;
    private int position;
    private Instant createdAt;
    private Instant updatedAt;
}
