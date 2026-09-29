package com.code.acklet.airvault.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AirVaultClipboardDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClipboardResponseDto {
        private String id;
        private String ownerUsername;
        private String ownerDeviceId;
        private String title;
        private String accessMode; // "read-only" | "read-write"
        private List<Map<String, Object>> items;
        private Instant createdAt;
        private Instant expiresAt;
        private boolean isExpired;
        private boolean isOwner;
        private boolean isCollaborator;
        private String collaboratorAccessLevel;
        private boolean canEdit;
        private String guestToken;
        private Long currentSeq;
        private boolean isPersonal;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SyncClipboardRequest {
        private String id;
        private String title;
        private String accessMode; // "read-only" | "read-write"
        private List<Map<String, Object>> items;
        private Integer retentionDays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddClipboardItemRequest {
        private String opId;
        private Map<String, Object> item;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClipboardItemDto {
        private UUID id;
        private String clipboardId;
        private Long seq;
        private Long lastChangeSeq;
        private String opId;
        private String authorType; // "owner", "collaborator", "guest"
        private String authorName;
        private String authorColor;
        private String payload;
        private Long retentionSeconds;
        private Boolean burnAfterRead;
        private Instant createdAt;
        private Instant deletedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateAccessModeRequest {
        private String accessMode; // "read-only" | "read-write"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RenameClipboardRequest {
        private String oldId;
        private String newId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlugAvailabilityResponse {
        private String slug;
        private boolean available;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GuestTokenResponse {
        private String token;
        private String clipboardId;
        private String accessMode;
        private long expiresInSeconds;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateClipboardRequest {
        private String id;
        private String title;
        private String accessMode; // "read-only" | "read-write"
        private Integer retentionDays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClipboardSummaryDto {
        private String id;
        private String title;
        private String ownerUsername;
        private String accessMode;
        private boolean isPersonal;
        private boolean isOwner;
        private int itemCount;
        private long totalBytes;
        private Instant createdAt;
        private Instant expiresAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MyClipboardsResponseDto {
        private List<ClipboardSummaryDto> clipboards;
        private int count;
        private int maxLimit;
        private long maxClipboardBytes;
    }
}
