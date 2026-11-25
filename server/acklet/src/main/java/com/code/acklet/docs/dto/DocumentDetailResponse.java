package com.code.acklet.docs.dto;

import com.code.acklet.docs.entity.DocStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDetailResponse {
    private UUID id;
    private UUID toolId;
    private String toolName;
    private String title;
    private String slug;
    private String summary;
    private DocStatus status;
    private UUID ownerId;
    private List<SectionResponse> sections;
    private List<com.fasterxml.jackson.databind.JsonNode> blocks;
    private Long version;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
