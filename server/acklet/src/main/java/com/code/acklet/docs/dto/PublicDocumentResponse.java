package com.code.acklet.docs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicDocumentResponse {
    private String title;
    private String summary;
    private String toolName;
    private String toolSlug;
    private String slug;
    private Instant publishedAt;
    private Instant updatedAt;
    private List<PublicSectionResponse> sections;
    private List<com.fasterxml.jackson.databind.JsonNode> blocks;
}
