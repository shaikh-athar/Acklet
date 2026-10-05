package com.code.acklet.airvault.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class AirVaultSearchDtos {

    private AirVaultSearchDtos() {}

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SnippetOffset {
        private int start;
        private int end;
        private String matchText;
        private String field; // "title", "snippet", "actor", "filename"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchEntry {
        private String entryId;
        private String entryType; // "TEXT", "FILE", "URL", "CODE", "AUDIT", "IMAGE", "ARCHIVE", "JSON"
        private String title;
        private String snippet;
        private String category;
        private String actorUsername;
        private String deviceName;
        private Instant timestampUtc;
        private Long byteSize;
        private String previewUrl;
        private Map<String, Object> metadata;
        @Builder.Default
        private List<SnippetOffset> offsets = new ArrayList<>();
        private int matchCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchResponse {
        private String query;
        private int totalMatches;
        private int entryCount;
        private int windowDays;
        private boolean fullRange;
        @Builder.Default
        private List<MatchEntry> results = new ArrayList<>();
    }
}
