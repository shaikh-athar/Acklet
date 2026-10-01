package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.dto.AirVaultClipboardDtos.*;
import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.code.acklet.airvault.service.AirVaultSharedClipboardService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/airvault/clipboard", "/api/v1/airvault/clipboards"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AirVault Standalone Shared Clipboard", description = "Endpoints for standalone shareable Clipboard-ID access, read/write permissions, and link resolution")
public class AirVaultClipboardController {

    private final AirVaultSharedClipboardService clipboardService;

    private AirVaultPrincipal getPrincipal() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AirVaultPrincipal principal) {
            return principal;
        }
        return null;
    }

    @GetMapping("/mine")
    @Operation(summary = "Get Authenticated User's Personal Clipboard", description = "Resolves or creates the personal server-backed clipboard for the authenticated identity")
    public ResponseEntity<ApiResponse<ClipboardResponseDto>> getPersonalClipboard() {
        try {
            ClipboardResponseDto res = clipboardService.getOrCreatePersonalClipboard(getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(res, "Personal clipboard retrieved successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(ex.getMessage(), "401"));
        }
    }

    @GetMapping("/{clipboardId}")
    @Operation(summary = "Get Shared Clipboard by ID", description = "Resolves clipboard by unguessable ID directly, authenticated via signed token or anonymous guest scope. Honors access mode and expiry.")
    public ResponseEntity<ApiResponse<ClipboardResponseDto>> getClipboard(@PathVariable String clipboardId) {
        ClipboardResponseDto res = clipboardService.getClipboard(clipboardId, getPrincipal());
        if (res == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Clipboard not found or has been removed", "404"));
        }

        return ResponseEntity.ok(ApiResponse.success(res, "Clipboard retrieved successfully"));
    }

    @PostMapping("/sync")
    @Operation(summary = "Create or Sync Shared Clipboard", description = "Saves or updates clipboard state with unguessable ID, retention TTL, and access mode")
    public ResponseEntity<ApiResponse<ClipboardResponseDto>> syncClipboard(
            @RequestBody SyncClipboardRequest request) {
        try {
            ClipboardResponseDto res = clipboardService.syncClipboard(request, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(res, "Clipboard synced successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        }
    }

    @PostMapping("/{clipboardId}/items")
    @Operation(summary = "Add Item to Shared Clipboard", description = "Adds an item to a shared clipboard as an atomic row with sequential numbering and idempotency")
    public ResponseEntity<ApiResponse<ClipboardResponseDto>> addItem(
            @PathVariable String clipboardId,
            @RequestBody AddClipboardItemRequest request) {

        try {
            ClipboardResponseDto res = clipboardService.addItem(clipboardId, request, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(res, "Item added to shared clipboard"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(ApiResponse.error(ex.getMessage(), "410"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }

    @GetMapping("/{clipboardId}/items")
    @Operation(summary = "Get Clipboard Items Since Sequence", description = "Incremental sync and change feed endpoint for clipboard item rows")
    public ResponseEntity<ApiResponse<List<ClipboardItemDto>>> getItemsSince(
            @PathVariable String clipboardId,
            @RequestParam(required = false) Long since,
            @RequestParam(required = false) Integer limit) {
        try {
            List<ClipboardItemDto> items = clipboardService.getItemsSince(clipboardId, since, limit, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(items, "Items retrieved successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }

    @DeleteMapping("/{clipboardId}/items/{itemId}")
    @Operation(summary = "Soft Delete Clipboard Item", description = "Marks a clipboard item as deleted and notifies room subscribers")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @PathVariable String clipboardId,
            @PathVariable UUID itemId) {
        try {
            clipboardService.deleteItem(clipboardId, itemId, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(null, "Item deleted successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }

    @GetMapping("/{clipboardId}/guest-token")
    @Operation(summary = "Get Guest Token Scoped to Clipboard", description = "Issues a guest token strictly scoped to this single clipboard ID")
    public ResponseEntity<ApiResponse<GuestTokenResponse>> getGuestToken(@PathVariable String clipboardId) {
        try {
            GuestTokenResponse res = clipboardService.generateGuestToken(clipboardId, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(res, "Guest token generated"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }

    @PutMapping("/{clipboardId}/access-mode")
    @Operation(summary = "Update Clipboard Access Mode", description = "Toggles clipboard access mode between read-only and read-write")
    public ResponseEntity<ApiResponse<ClipboardResponseDto>> updateAccessMode(
            @PathVariable String clipboardId,
            @RequestBody UpdateAccessModeRequest request) {

        try {
            ClipboardResponseDto res = clipboardService.updateAccessMode(clipboardId, request, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(res, "Clipboard access mode updated"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }

    @GetMapping("/check-slug")
    @Operation(summary = "Check Clipboard Slug Availability", description = "Verifies if a memorable custom slug is available for claiming/renaming")
    public ResponseEntity<ApiResponse<SlugAvailabilityResponse>> checkSlug(@RequestParam String slug) {
        SlugAvailabilityResponse res = clipboardService.checkSlugAvailability(slug, getPrincipal());
        return ResponseEntity.ok(ApiResponse.success(res, "Slug check complete"));
    }

    @PutMapping("/rename")
    @Operation(summary = "Rename Clipboard Slug", description = "Migrates clipboard and all collaborator/invite links to a new unique memorable slug")
    public ResponseEntity<ApiResponse<ClipboardResponseDto>> renameClipboard(
            @RequestBody RenameClipboardRequest request) {

        try {
            ClipboardResponseDto res = clipboardService.renameClipboard(request, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(res, "Clipboard renamed successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage(), "400"));
        }
    }

    @PostMapping("/create")
    @Operation(summary = "Create Standalone Clipboard", description = "Creates a new standalone clipboard with limit validation (max 5 clipboards per user)")
    public ResponseEntity<ApiResponse<ClipboardResponseDto>> createClipboard(
            @RequestBody CreateClipboardRequest request) {
        try {
            ClipboardResponseDto res = clipboardService.createClipboard(request, getPrincipal());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(res, "Clipboard created successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(ex.getMessage(), "401"));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage(), "400"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage(), "400"));
        }
    }

    @GetMapping("/my")
    @Operation(summary = "List User Created Clipboards", description = "Returns all non-deleted clipboards created by the authenticated user with limit metadata")
    public ResponseEntity<ApiResponse<MyClipboardsResponseDto>> listMyClipboards() {
        try {
            MyClipboardsResponseDto res = clipboardService.listMyClipboards(getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(res, "User clipboards retrieved successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(ex.getMessage(), "401"));
        }
    }

    @DeleteMapping("/{clipboardId}")
    @Operation(summary = "Delete Created Clipboard", description = "Soft deletes a custom created clipboard. Personal primary clipboard cannot be deleted.")
    public ResponseEntity<ApiResponse<Void>> deleteClipboard(@PathVariable String clipboardId) {
        try {
            clipboardService.deleteClipboard(clipboardId, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(null, "Clipboard deleted successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage(), "400"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }
}
