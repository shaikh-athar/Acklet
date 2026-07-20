package com.code.acklet.personalization.dto;

import lombok.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class PersonalizationDto {

    // ── Preferences ─────────────────────────────────────────────────────────

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PreferencesResponse {
        private Map<String, Object> prefs;
        private Instant updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class PreferencesRequest {
        private Map<String, Object> prefs;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class PatchNamespaceRequest {
        private Map<String, Object> values;
    }

    // ── Activity ─────────────────────────────────────────────────────────────

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ActivityItem {
        private String entityType;
        private String entityId;
        private String entitySlug;
        private String entityName;
        private Instant accessedAt;
        private Map<String, Object> metadata;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class RecordActivityRequest {
        private String entityType;
        private String entityId;
        private String entitySlug;
        private String entityName;
        private Map<String, Object> metadata;
    }

    // ── Favorites ─────────────────────────────────────────────────────────────

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class FavoriteItem {
        private String entityType;
        private String entityId;
        private String entitySlug;
        private String entityName;
        private boolean pinned;
        private Instant pinnedAt;
        private Instant createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class AddFavoriteRequest {
        private String entityType;
        private String entityId;
        private String entitySlug;
        private String entityName;
    }

    // ── Tool Preferences ──────────────────────────────────────────────────────

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ToolPrefsResponse {
        private String toolSlug;
        private Map<String, Object> preferences;
        private Instant updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ToolPrefsRequest {
        private Map<String, Object> preferences;
    }

    // ── Sync ─────────────────────────────────────────────────────────────────

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class SyncRequest {
        private String deviceId;
        private Instant lastSyncAt;
        private Map<String, Object> prefsDelta;
        private List<FavoriteItem> favoritesSnapshot;
        private List<ActivityItem> activitySince;
        private Map<String, Map<String, Object>> toolPrefsSnapshot;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SyncResponse {
        private Map<String, Object> mergedPrefs;
        private List<FavoriteItem> mergedFavorites;
        private List<ToolPrefsResponse> mergedToolPrefs;
        private Instant syncedAt;
        private boolean hasConflicts;
    }
}
