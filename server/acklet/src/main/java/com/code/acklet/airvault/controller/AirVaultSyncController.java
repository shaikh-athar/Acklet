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
    @Operation(summary = "Register Item View (Burn-After-Read)", description = "Atomically registers the first view of an item. If it is the first view, emits a tombstone deletion broadcast across all paired devices.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerItemViewed(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> payload) {
        String itemId = (String) payload.get("itemId");
        String viewerDeviceId = (String) payload.get("viewerDeviceId");
        String viewerName = (String) payload.get("viewerName");
        String contentType = (String) payload.get("contentType");
        String category = (String) payload.get("category");

        if (itemId == null || itemId.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("itemId is required", UUID.randomUUID().toString()));
        }

        // Server-Side Guard: BURN_AFTER_READ is strictly restricted to RESOURCE / FILE items.
        // It must NEVER apply to plain text, code, or URL items.
        String normType = contentType != null ? contentType.trim().toLowerCase() : (category != null ? category.trim().toLowerCase() : "");
        if ("text".equals(normType) || "code".equals(normType) || "json".equals(normType) || "url".equals(normType)) {
            log.warn("[AirVault Burn] ⚠️ Rejected burn request: Item {} is of type '{}'. BURN_AFTER_READ is strictly restricted to file/resource items.", itemId, normType);
            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("burned", false, "rejected", true, "reason", "BURN_AFTER_READ applies to resource/file items only", "itemId", itemId),
                    "Burn request ignored for text/code item"
            ));
        }

        // 1. Atomic Check-and-Set (CAS) via Redis SETNX
        boolean isFirstViewer = redisTracker.recordItemViewedAtomic(itemId, viewerDeviceId);

        if (!isFirstViewer) {
            log.info("[AirVault Burn] 👁️ Subsequent view registered for item={}. Already burned. No-op.", itemId);
            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("burned", false, "alreadyBurned", true, "itemId", itemId),
                    "Item view recorded (already burned)"
            ));
        }

        log.info("[AirVault Burn] 🔥 FIRST VIEW registered for item={} by device={} ({}). Triggering tombstone delete broadcast!",
                itemId, viewerDeviceId, viewerName);

        // 2. Build tombstone delete message for WebSocket distribution & durable audit
        String deletePayload = String.format("{\"type\":\"ITEM_DELETE\",\"itemId\":\"%s\",\"burnAfterRead\":true,\"timestamp\":%d}",
                itemId, Instant.now().toEpochMilli());

        AirVaultWsMessage wsDelete = AirVaultWsMessage.builder()
                .type("ITEM_DELETE")
                .senderDeviceId(viewerDeviceId != null ? viewerDeviceId : "server_burn_engine")
                .targetDeviceId("broadcast")
                .payload(deletePayload)
                .timestamp(System.currentTimeMillis())
                .build();

        // Broadcast to all active WebSocket sessions
        webSocketHandler.broadcastToAll(wsDelete, null);

        // Publish to RabbitMQ
        SignalMessageDto deleteDto = SignalMessageDto.builder()
                .id(UUID.randomUUID().toString())
                .signalType("ITEM_DELETE")
                .senderDeviceId(viewerDeviceId != null ? viewerDeviceId : "server_burn_engine")
                .targetDeviceId("broadcast")
                .payload(deletePayload)
                .timestamp(Instant.now())
                .build();
        syncRelayService.publishSyncEvent(deleteDto);

        // Record audit event
        auditService.recordEvent(
                "item_deleted",
                null,
                null,
                viewerDeviceId != null ? viewerDeviceId : "server",
                null,
                itemId,
                "SUCCESS",
                null,
                null,
                Map.of("scope", "burn_after_read", "itemId", itemId)
        );

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("burned", true, "firstView", true, "itemId", itemId),
                "Item burned successfully upon first view"
        ));
    }
}
