package com.code.acklet.tool.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ToolKnowledgeResponseDto {

    private UUID toolId;
    private String overview;
    private String purpose;
    private String problemsSolved;
    private String whoShouldUse;
    private String whoShouldAvoid;
    private String expectedInputs;
    private String expectedOutputs;
    private String bestPractices;
    private String advantages;
    private String limitations;
    private boolean verifiedBadge;
    private String maintainer;
    private String officialWebsite;
    private String documentationUrl;
    private String githubRepository;

    private Map<String, Object> technicalDetails;
    private Map<String, Object> compatibility;
    private Map<String, Object> pricingDetails;
    private Map<String, Object> privacyDetails;
    private Map<String, Object> resources;
    private Map<String, Object> seoMetadata;

    private List<MediaItemDto> mediaItems;
    private List<VersionLogDto> versionHistory;

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MediaItemDto {
        private String mediaType;
        private String url;
        private String caption;
        private Integer displayOrder;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class VersionLogDto {
        private String version;
        private Instant releaseDate;
        private String releaseNotes;
        private String upcomingFeatures;
    }
}
