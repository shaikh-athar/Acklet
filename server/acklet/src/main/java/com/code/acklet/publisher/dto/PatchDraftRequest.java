package com.code.acklet.publisher.dto;

import lombok.Data;

import java.util.List;

/** PATCH body — all fields optional; only non-null fields are applied. */
@Data
public class PatchDraftRequest {
    private Integer stepCompleted;

    // Step 1
    private String toolName;
    private String slug;
    private String tagline;

    // Step 3
    private String description;
    private String problemStatement;
    private String targetAudience;
    private List<String> useCases;
    private List<String> features;
    private String businessDomain;

    // Step 4
    private List<String> techStack;
    private List<String> capabilities;

    // Step 5
    private String primaryCategorySlug;

    private List<String> tags;
    private String pricingType;
    private String license;
    private Boolean isOpenSource;

    // Step 6
    private String githubUrl;
    private String websiteUrl;
    private String logoUrl;
    private String coverUrl;
    private String documentationUrl;
    private String discordUrl;
}
