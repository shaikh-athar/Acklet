package com.code.acklet.personalization.controller;

import com.code.acklet.personalization.dto.PersonalizationDto;
import com.code.acklet.personalization.service.PersonalizationService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/preferences")
@RequiredArgsConstructor
@Tag(name = "Personalization", description = "User preferences, activity, favorites, tool configs, and sync endpoints")
public class PersonalizationController {

    private final PersonalizationService personalizationService;

    // ── General Preferences ──────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Get full preferences blob for authenticated user")
    public ResponseEntity<ApiResponse<PersonalizationDto.PreferencesResponse>> getPreferences(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.getPreferences(currentUser.getId()),
                "Preferences retrieved"));
    }

    @PutMapping
    @Operation(summary = "Upsert full preferences JSONB")
    public ResponseEntity<ApiResponse<PersonalizationDto.PreferencesResponse>> upsertPreferences(
            @AuthenticationPrincipal User currentUser,
            @RequestBody PersonalizationDto.PreferencesRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.upsertPreferences(currentUser.getId(), request.getPrefs()),
                "Preferences saved"));
    }

    @PatchMapping("/{namespace}")
    @Operation(summary = "Patch a specific preference namespace (search, layout, view, etc.)")
    public ResponseEntity<ApiResponse<PersonalizationDto.PreferencesResponse>> patchNamespace(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String namespace,
            @RequestBody PersonalizationDto.PatchNamespaceRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.patchNamespace(currentUser.getId(), namespace, request.getValues()),
                "Namespace updated"));
    }

    // ── Activity ─────────────────────────────────────────────────────────────

    @GetMapping("/activity")
    @Operation(summary = "Get recent activity, optionally filtered by entity type")
    public ResponseEntity<ApiResponse<List<PersonalizationDto.ActivityItem>>> getActivity(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.getActivity(currentUser.getId(), type, limit),
                "Activity retrieved"));
    }

    @PostMapping("/activity")
    @Operation(summary = "Record an activity event")
    public ResponseEntity<ApiResponse<Void>> recordActivity(
            @AuthenticationPrincipal User currentUser,
            @RequestBody PersonalizationDto.RecordActivityRequest request) {
        personalizationService.recordActivity(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(null, "Activity recorded"));
    }

    // ── Favorites ─────────────────────────────────────────────────────────────

    @GetMapping("/favorites")
    @Operation(summary = "Get all favorites, optionally filtered by entity type")
    public ResponseEntity<ApiResponse<List<PersonalizationDto.FavoriteItem>>> getFavorites(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.getFavorites(currentUser.getId(), type),
                "Favorites retrieved"));
    }

    @PostMapping("/favorites")
    @Operation(summary = "Add a favorite (idempotent)")
    public ResponseEntity<ApiResponse<PersonalizationDto.FavoriteItem>> addFavorite(
            @AuthenticationPrincipal User currentUser,
            @RequestBody PersonalizationDto.AddFavoriteRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.addFavorite(currentUser.getId(), request),
                "Favorite added"));
    }

    @DeleteMapping("/favorites/{type}/{id}")
    @Operation(summary = "Remove a favorite by entity type and ID")
    public ResponseEntity<ApiResponse<Void>> removeFavorite(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String type,
            @PathVariable String id) {
        personalizationService.removeFavorite(currentUser.getId(), type, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Favorite removed"));
    }

    // ── Tool Preferences ──────────────────────────────────────────────────────

    @GetMapping("/tools/{slug}")
    @Operation(summary = "Get per-tool preferences for a specific tool slug")
    public ResponseEntity<ApiResponse<PersonalizationDto.ToolPrefsResponse>> getToolPrefs(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.getToolPrefs(currentUser.getId(), slug),
                "Tool preferences retrieved"));
    }

    @PutMapping("/tools/{slug}")
    @Operation(summary = "Upsert per-tool preferences for a specific tool slug")
    public ResponseEntity<ApiResponse<PersonalizationDto.ToolPrefsResponse>> upsertToolPrefs(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String slug,
            @RequestBody PersonalizationDto.ToolPrefsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.upsertToolPrefs(currentUser.getId(), slug, request.getPreferences()),
                "Tool preferences saved"));
    }

    // ── Sync ─────────────────────────────────────────────────────────────────

    @PostMapping("/sync")
    @Operation(summary = "Delta sync: receive local snapshot, respond with merged server state")
    public ResponseEntity<ApiResponse<PersonalizationDto.SyncResponse>> sync(
            @AuthenticationPrincipal User currentUser,
            @RequestBody PersonalizationDto.SyncRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                personalizationService.sync(currentUser.getId(), request),
                "Sync completed"));
    }

    // ── Reset ────────────────────────────────────────────────────────────────

    @DeleteMapping("/reset")
    @Operation(summary = "Reset all preferences, activity, favorites, and tool configs for current user")
    public ResponseEntity<ApiResponse<Void>> resetPreferences(
            @AuthenticationPrincipal User currentUser) {
        personalizationService.resetPreferences(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Preferences reset"));
    }
}
