package com.code.acklet.tool.airvault.controller;

import com.code.acklet.tool.airvault.model.AirVaultClipMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestController
@RequestMapping("/api/v1/tools/airvault")
@CrossOrigin(origins = "*")
public class AirVaultSyncController {

    // In-memory cluster storage mapped by user session room
    private final Map<String, List<AirVaultClipMessage>> userClipHistory = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> activePairingSessions = new ConcurrentHashMap<>();

    @PostMapping("/sync")
    public ResponseEntity<AirVaultClipMessage> syncClip(
            @RequestHeader(value = "X-User-Id", defaultValue = "anonymous-user") String userId,
            @RequestBody AirVaultClipMessage payload) {

        log.info("AirVault Sync received clip from user: {} device: {}", userId, payload.getOriginDeviceId());

        if (payload.getId() == null || payload.getId().isBlank()) {
            payload.setId("clip_" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (payload.getCreatedAt() == null) {
            payload.setCreatedAt(Instant.now());
        }
        payload.setDeliveryStatus("delivered");

        userClipHistory.computeIfAbsent(userId, k -> Collections.synchronizedList(new ArrayList<>()))
                .add(0, payload);

        return ResponseEntity.ok(payload);
    }

    @GetMapping("/history")
    public ResponseEntity<List<AirVaultClipMessage>> getHistory(
            @RequestHeader(value = "X-User-Id", defaultValue = "anonymous-user") String userId) {
        List<AirVaultClipMessage> history = userClipHistory.getOrDefault(userId, Collections.emptyList());
        return ResponseEntity.ok(history);
    }

    @PostMapping("/pairing/create")
    public ResponseEntity<Map<String, Object>> createPairingSession(
            @RequestHeader(value = "X-User-Id", defaultValue = "anonymous-user") String userId) {
        String code = String.valueOf((int) (100000 + Math.random() * 900000));
        String token = "av_qr_" + UUID.randomUUID().toString().substring(0, 10);

        activePairingSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(code);

        Map<String, Object> resp = new HashMap<>();
        resp.put("code", code);
        resp.put("qrToken", token);
        resp.put("expiresAt", System.currentTimeMillis() + (5 * 60 * 1000));

        return ResponseEntity.ok(resp);
    }
}
