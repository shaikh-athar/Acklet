package com.code.acklet.personalization.service;

import com.code.acklet.personalization.dto.PersonalizationDto;
import com.code.acklet.personalization.entity.UserActivity;
import com.code.acklet.personalization.entity.UserFavoriteExt;
import com.code.acklet.personalization.entity.UserToolPreference;
import com.code.acklet.personalization.repository.UserActivityRepository;
import com.code.acklet.personalization.repository.UserFavoriteExtRepository;
import com.code.acklet.personalization.repository.UserToolPreferenceRepository;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.entity.UserProfile;
import com.code.acklet.user.repository.UserProfileRepository;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PersonalizationService {

    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final UserActivityRepository activityRepository;
    private final UserFavoriteExtRepository favoriteExtRepository;
    private final UserToolPreferenceRepository toolPreferenceRepository;

    // ── Preferences ──────────────────────────────────────────────────────────

    @Cacheable(value = "user_prefs", key = "#userId")
    @Transactional(readOnly = true)
    public PersonalizationDto.PreferencesResponse getPreferences(UUID userId) {
        UserProfile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        return PersonalizationDto.PreferencesResponse.builder()
                .prefs(profile.getPreferences() != null ? profile.getPreferences() : Collections.emptyMap())
                .updatedAt(Instant.now())
                .build();
    }

    @CacheEvict(value = "user_prefs", key = "#userId")
    @Transactional
    public PersonalizationDto.PreferencesResponse upsertPreferences(UUID userId, Map<String, Object> prefs) {
        UserProfile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        profile.setPreferences(prefs);
        profileRepository.save(profile);
        return PersonalizationDto.PreferencesResponse.builder()
                .prefs(prefs)
                .updatedAt(Instant.now())
                .build();
    }

    @CacheEvict(value = "user_prefs", key = "#userId")
    @Transactional
    public PersonalizationDto.PreferencesResponse patchNamespace(UUID userId, String namespace, Map<String, Object> values) {
        UserProfile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        Map<String, Object> current = profile.getPreferences() != null
                ? new HashMap<>(profile.getPreferences()) : new HashMap<>();
        // Merge namespace-level key
        current.put(namespace, values);
        profile.setPreferences(current);
        profileRepository.save(profile);
        return PersonalizationDto.PreferencesResponse.builder()
                .prefs(current)
                .updatedAt(Instant.now())
                .build();
    }

    // ── Activity ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PersonalizationDto.ActivityItem> getActivity(UUID userId, String entityType, int limit) {
        var pageable = PageRequest.of(0, limit);
        List<UserActivity> activities = entityType != null
                ? activityRepository.findByUserIdAndEntityTypeOrderByAccessedAtDesc(userId, entityType, pageable)
                : activityRepository.findByUserIdOrderByAccessedAtDesc(userId, pageable);
        return activities.stream().map(this::toActivityItem).collect(Collectors.toList());
    }

    @Transactional
    public void recordActivity(UUID userId, PersonalizationDto.RecordActivityRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserActivity activity = UserActivity.builder()
                .user(user)
                .entityType(req.getEntityType())
                .entityId(req.getEntityId())
                .entitySlug(req.getEntitySlug())
                .entityName(req.getEntityName())
                .accessedAt(Instant.now())
                .metadata(req.getMetadata())
                .build();
        activityRepository.save(activity);
    }

    // ── Favorites ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PersonalizationDto.FavoriteItem> getFavorites(UUID userId, String entityType) {
        List<UserFavoriteExt> favs = entityType != null
                ? favoriteExtRepository.findByUserIdAndEntityTypeOrderByCreatedAtDesc(userId, entityType)
                : favoriteExtRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return favs.stream().map(this::toFavoriteItem).collect(Collectors.toList());
    }

    @Transactional
    public PersonalizationDto.FavoriteItem addFavorite(UUID userId, PersonalizationDto.AddFavoriteRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // Idempotent — return existing if already favorited
        return favoriteExtRepository
                .findByUserIdAndEntityTypeAndEntityId(userId, req.getEntityType(), req.getEntityId())
                .map(this::toFavoriteItem)
                .orElseGet(() -> {
                    UserFavoriteExt fav = UserFavoriteExt.builder()
                            .user(user)
                            .entityType(req.getEntityType())
                            .entityId(req.getEntityId())
                            .entitySlug(req.getEntitySlug())
                            .entityName(req.getEntityName())
                            .build();
                    return toFavoriteItem(favoriteExtRepository.save(fav));
                });
    }

    @Transactional
    public void removeFavorite(UUID userId, String entityType, String entityId) {
        favoriteExtRepository.deleteByUserIdAndEntityTypeAndEntityId(userId, entityType, entityId);
    }

    // ── Tool Preferences ──────────────────────────────────────────────────────

    @Cacheable(value = "tool_prefs", key = "#userId + ':' + #toolSlug")
    @Transactional(readOnly = true)
    public PersonalizationDto.ToolPrefsResponse getToolPrefs(UUID userId, String toolSlug) {
        return toolPreferenceRepository.findByUserIdAndToolSlug(userId, toolSlug)
                .map(p -> PersonalizationDto.ToolPrefsResponse.builder()
                        .toolSlug(p.getToolSlug())
                        .preferences(p.getPreferences())
                        .updatedAt(p.getUpdatedAt())
                        .build())
                .orElse(PersonalizationDto.ToolPrefsResponse.builder()
                        .toolSlug(toolSlug)
                        .preferences(Collections.emptyMap())
                        .updatedAt(Instant.now())
                        .build());
    }

    @CacheEvict(value = "tool_prefs", key = "#userId + ':' + #toolSlug")
    @Transactional
    public PersonalizationDto.ToolPrefsResponse upsertToolPrefs(UUID userId, String toolSlug, Map<String, Object> prefs) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserToolPreference pref = toolPreferenceRepository
                .findByUserIdAndToolSlug(userId, toolSlug)
                .orElse(UserToolPreference.builder().user(user).toolSlug(toolSlug).build());
        pref.setPreferences(prefs);
        pref.setUpdatedAt(Instant.now());
        toolPreferenceRepository.save(pref);
        return PersonalizationDto.ToolPrefsResponse.builder()
                .toolSlug(toolSlug)
                .preferences(prefs)
                .updatedAt(pref.getUpdatedAt())
                .build();
    }

    // ── Sync ─────────────────────────────────────────────────────────────────

    @Transactional
    public PersonalizationDto.SyncResponse sync(UUID userId, PersonalizationDto.SyncRequest req) {
        log.info("Syncing personalization for user {} from device {}", userId, req.getDeviceId());

        // 1. Merge preferences (last-write-wins: server merges local delta on top)
        Map<String, Object> merged = new HashMap<>();
        try {
            UserProfile profile = profileRepository.findById(userId).orElse(null);
            if (profile != null && profile.getPreferences() != null) {
                merged.putAll(profile.getPreferences());
            }
        } catch (Exception ignored) {}
        if (req.getPrefsDelta() != null) {
            merged.putAll(req.getPrefsDelta()); // Local delta wins
        }
        upsertPreferences(userId, merged);

        // 2. Merge favorites — union (never silently delete)
        if (req.getFavoritesSnapshot() != null) {
            req.getFavoritesSnapshot().forEach(fav -> {
                if (!favoriteExtRepository.existsByUserIdAndEntityTypeAndEntityId(userId, fav.getEntityType(), fav.getEntityId())) {
                    addFavorite(userId, new PersonalizationDto.AddFavoriteRequest(
                            fav.getEntityType(), fav.getEntityId(), fav.getEntitySlug(), fav.getEntityName()));
                }
            });
        }

        // 3. Merge activity — upload new local events
        if (req.getActivitySince() != null) {
            User user = userRepository.findById(userId).orElseThrow();
            req.getActivitySince().forEach(act -> activityRepository.save(
                    UserActivity.builder()
                            .user(user)
                            .entityType(act.getEntityType())
                            .entityId(act.getEntityId())
                            .entitySlug(act.getEntitySlug())
                            .entityName(act.getEntityName())
                            .accessedAt(act.getAccessedAt() != null ? act.getAccessedAt() : Instant.now())
                            .metadata(act.getMetadata())
                            .build()));
        }

        // 4. Merge tool prefs — last-write-wins per slug
        if (req.getToolPrefsSnapshot() != null) {
            req.getToolPrefsSnapshot().forEach((slug, prefs) -> upsertToolPrefs(userId, slug, prefs));
        }

        // 5. Build response with server state
        List<PersonalizationDto.FavoriteItem> serverFavs = getFavorites(userId, null);
        List<PersonalizationDto.ToolPrefsResponse> serverToolPrefs = toolPreferenceRepository.findByUserId(userId)
                .stream().map(p -> PersonalizationDto.ToolPrefsResponse.builder()
                        .toolSlug(p.getToolSlug())
                        .preferences(p.getPreferences())
                        .updatedAt(p.getUpdatedAt())
                        .build()).collect(Collectors.toList());

        return PersonalizationDto.SyncResponse.builder()
                .mergedPrefs(merged)
                .mergedFavorites(serverFavs)
                .mergedToolPrefs(serverToolPrefs)
                .syncedAt(Instant.now())
                .hasConflicts(false)
                .build();
    }

    @Transactional
    @CacheEvict(value = {"user_prefs", "tool_prefs"}, allEntries = true)
    public void resetPreferences(UUID userId) {
        profileRepository.findById(userId).ifPresent(p -> {
            p.setPreferences(Collections.emptyMap());
            profileRepository.save(p);
        });
        activityRepository.deleteAllByUserId(userId);
        favoriteExtRepository.deleteAllByUserId(userId);
        toolPreferenceRepository.deleteAllByUserId(userId);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private PersonalizationDto.ActivityItem toActivityItem(UserActivity a) {
        return PersonalizationDto.ActivityItem.builder()
                .entityType(a.getEntityType())
                .entityId(a.getEntityId())
                .entitySlug(a.getEntitySlug())
                .entityName(a.getEntityName())
                .accessedAt(a.getAccessedAt())
                .metadata(a.getMetadata())
                .build();
    }

    private PersonalizationDto.FavoriteItem toFavoriteItem(UserFavoriteExt f) {
        return PersonalizationDto.FavoriteItem.builder()
                .entityType(f.getEntityType())
                .entityId(f.getEntityId())
                .entitySlug(f.getEntitySlug())
                .entityName(f.getEntityName())
                .pinned(f.isPinned())
                .pinnedAt(f.getPinnedAt())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
