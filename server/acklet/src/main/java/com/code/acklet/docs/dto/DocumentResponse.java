package com.code.acklet.docs.dto;

import com.code.acklet.docs.entity.DocStatus;
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
public class DocumentResponse {
    private UUID id;
    private UUID toolId;
    private String toolName;
    private String title;
    private String slug;
    private String summary;
    private DocStatus status;
    private UUID ownerId;
    private String authorName;
    private int sectionCount;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
