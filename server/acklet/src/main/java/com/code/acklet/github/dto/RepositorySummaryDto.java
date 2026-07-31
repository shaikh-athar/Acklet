package com.code.acklet.github.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/**
 * Enriched summary DTO returned by the list endpoint — combines core Repository fields
 * with denormalised metadata so the frontend doesn't need to fire extra requests.
 */
@Data
@Builder
public class RepositorySummaryDto {
    private UUID id;
    private String fullName;
    private String name;
    private String defaultBranch;
    private boolean isPrivate;
    private String htmlUrl;
    private String provider;

    // From RepositoryMetadata
    private String description;
    private String primaryLanguage;

    // From RepositoryProject (root project)
    private String framework;

    // Computed status
    private boolean statusMetadataFetched;
    private boolean statusTreeAnalyzed;
    private boolean statusAiAnalyzed;
}
