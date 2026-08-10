package com.code.acklet.tool.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolResponse {
    // Existing fields
    private UUID id;
    private UUID categoryId;
    private String categoryName;
    private String name;
    private String slug;
    private String description;
    private String version;
    private String url;
    private String icon;
    private String author;
    private long usageCount;
    private boolean isFeatured;
    private boolean isTrending;

    // Publisher fields
    private UUID publisherId;
    private String tagline;
    private String websiteUrl;
    private String githubUrl;
    private String logoUrl;
    private String coverUrl;
    private String pricingType;
    private boolean isOpenSource;
    private String status;
    private String verificationStatus;
    private long upvoteCount;

    // Runtime execution configurations
    private String executionMode;
    private String subdomain;
    private String runtime;
    private String buildCommand;
    private String startCommand;
    private Integer port;
    private UUID repositoryId;
    private String previewImageUrl;
}
