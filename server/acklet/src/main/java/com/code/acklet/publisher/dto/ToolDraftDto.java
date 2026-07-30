package com.code.acklet.publisher.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/** Full wizard state returned to the frontend. */
@Data @Builder
public class ToolDraftDto {
    private UUID draftId;
    private UUID repositoryId;
    private int stepCompleted;
    private String status;

    // Repo context (read-only, from Repository entity)
    private String repoFullName;
    private String repoName;
    private String defaultBranch;
    private String htmlUrl;
    private boolean isPrivate;
    private String primaryLanguage;
    private String framework;
    private String repoDescription;

    // Analysis pipeline status
    private boolean statusMetadataFetched;
    private boolean statusTreeAnalyzed;
    private boolean statusAiAnalyzed;

    // Step 1
    private String toolName;
    private String slug;
    private String tagline;

    // Step 3 – AI Info
    private String description;
    private String problemStatement;
    private String targetAudience;
    private List<String> useCases;
    private List<String> features;
    private String businessDomain;
    private double aiConfidenceScore;

    // Step 4
    private List<String> techStack;
    private List<String> capabilities;

    // Step 5
    private String primaryCategorySlug;
    private List<String> tags;
    private String pricingType;
    private String license;
    private boolean isOpenSource;

    // Step 6
    private String githubUrl;
    private String websiteUrl;
    private String logoUrl;
    private String coverUrl;
    private String documentationUrl;
    private String discordUrl;

    // Published tool slug (if already published)
    private String publishedToolSlug;
}
