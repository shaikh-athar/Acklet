package com.code.acklet.collection.dto;

import com.code.acklet.tool.dto.ToolResponse;
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
public class CollectionResponse {
    private UUID id;
    private UUID userId;
    private String name;
    private String slug;
    private String coverImage;
    private String description;
    private String introduction;
    private boolean isPublic;
    private String status;
    private Instant publishedAt;
    private String seoMetadata;
    private int toolCount;
    private Instant createdAt;
    private Instant updatedAt;
    private List<ToolResponse> tools;
}
