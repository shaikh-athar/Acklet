package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.dto.SignalMessageDto;
import com.code.acklet.airvault.service.AirVaultAuditService;
import com.code.acklet.airvault.service.AirVaultRedisTracker;
import com.code.acklet.airvault.service.AirVaultSyncRelayService;
import com.code.acklet.airvault.websocket.AirVaultWebSocketHandler;
import com.code.acklet.airvault.websocket.dto.AirVaultWsMessage;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/airvault/sync")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AirVault Synchronization", description = "Endpoints for atomic synchronization events and item view states")
public class AirVaultSyncController {

    private final AirVaultSyncRelayService syncRelayService;
    private final AirVaultAuditService auditService;
    private final AirVaultRedisTracker redisTracker;
    private final AirVaultWebSocketHandler webSocketHandler;

    @PostMapping("/viewed")
    @Operation(summary = "Register Item View (Burn-After-Read)", description = "Atomically registers the first view of an item on destination. Deletion is destination-only; source copy remains untouched.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerItemViewed(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> payload) {
        String itemId = (String) payload.get("itemId");
        String viewerDeviceId = (String) payload.get("viewerDeviceId");
        String viewerName = (String) payload.get("viewerName");

        if (itemId == null || itemId.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("itemId is required", UUID.randomUUID().toString()));
        }

        // 1. Atomic Check-and-Set (CAS) via Redis SETNX
        boolean isFirstViewer = redisTracker.recordItemViewedAtomic(itemId, viewerDeviceId);

        if (!isFirstViewer) {
            log.info("[AirVault Burn] 👁️ Subsequent view registered for item={}. Already recorded. No-op.", itemId);
            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("burned", true, "alreadyBurned", true, "itemId", itemId),
                    "Item view recorded (already burned on destination)"
            ));
        }

        log.info("[AirVault Burn] 🔥 FIRST VIEW registered for item={} by device={} ({}). Destination copy burned.",
                itemId, viewerDeviceId, viewerName);

        // 2. Record audit event for destination burn
        auditService.recordEvent(
                "item_burned",
                null,
                null,
                viewerDeviceId != null ? viewerDeviceId : "server",
                null,
                itemId,
                "SUCCESS",
                null,
                null,
                Map.of("scope", "burn_after_read_destination_only", "itemId", itemId, "viewerDeviceId", viewerDeviceId != null ? viewerDeviceId : "unknown")
        );

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("burned", true, "firstView", true, "itemId", itemId),
                "Item burned successfully on destination upon view"
        ));
    }

    @PostMapping("/reset-burn")
    @Operation(summary = "Reset Burn State (For Resend)", description = "Clears Redis viewed key so a resent burn-after-read item can undergo a fresh one-time-view lifecycle on destination.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resetBurnState(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> payload) {
        String itemId = (String) payload.get("itemId");
        if (itemId != null && !itemId.isBlank()) {
            redisTracker.resetItemViewed(itemId);
            log.info("[AirVault Burn] 🔄 RESET BURN CAS state for resent item={}", itemId);
        }
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("reset", true, "itemId", itemId != null ? itemId : ""),
                "Burn state reset successfully for resend"
        ));
    }
}
