package com.code.acklet.airvault.websocket;

import com.code.acklet.airvault.diagnostic.WsOperationTimer;
import com.code.acklet.airvault.dto.SignalMessageDto;
import com.code.acklet.airvault.security.AirVaultAuthorizationService;
import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.code.acklet.airvault.service.AirVaultAuditService;
import com.code.acklet.airvault.service.AirVaultRedisTracker;
import com.code.acklet.airvault.service.AirVaultSyncRelayService;
import com.code.acklet.airvault.websocket.dto.AirVaultWsMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.locks.ReentrantLock;

@Slf4j
@Component
public class AirVaultWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final AirVaultRedisTracker redisTracker;
    private final AirVaultSyncRelayService syncRelayService;
    private final AirVaultAuditService auditService;
    private final WsOperationTimer wsOperationTimer;
    private final ExecutorService wsOffloadExecutor;
    private final AirVaultMetricsService metricsService;
    private final AirVaultAuthorizationService authorizationService;

    // deviceId -> Set of WebSocketSession (multi-tab / multi-session support)
    private final Map<String, java.util.Set<WebSocketSession>> deviceSessions = new ConcurrentHashMap<>();

    // sessionId -> deviceId
    private final Map<String, String> sessionDeviceMap = new ConcurrentHashMap<>();

    // username (lowercase) -> Set of WebSocketSession (multi-device user support)
    private final Map<String, java.util.Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    // sessionId -> username (lowercase)
    private final Map<String, String> sessionUserMap = new ConcurrentHashMap<>();

    // Room-scoped WebSocket: clipboardId -> Set of WebSocketSessions subscribed to that clipboard
    private final Map<String, java.util.Set<WebSocketSession>> clipboardRooms = new ConcurrentHashMap<>();

    // Reverse map: sessionId -> Set of clipboardIds this session is subscribed to
    private final Map<String, java.util.Set<String>> sessionClipboardRooms = new ConcurrentHashMap<>();

    // sessionId -> lastHeartbeatReceivedServerTime (millis)
    private final Map<String, Long> sessionHeartbeatMap = new ConcurrentHashMap<>();

    // sessionId -> per-session ReentrantLock (prevents carrier thread pinning on Virtual Threads)
    private final Map<String, ReentrantLock> sessionLockMap = new ConcurrentHashMap<>();

    // deviceId -> pending offline timeout task / grace window timer
    private final Map<String, java.util.concurrent.ScheduledFuture<?>> deviceOfflineGraceTimers = new ConcurrentHashMap<>();

    // Global scheduler for heartbeat timeout scanning and grace window debouncing
    private final java.util.concurrent.ScheduledExecutorService heartbeatScheduler =
            java.util.concurrent.Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "ws-heartbeat-scheduler");
                t.setDaemon(true);
                return t;
            });

    private volatile boolean isShuttingDown = false;

    public AirVaultWebSocketHandler(
            ObjectMapper objectMapper,
            AirVaultRedisTracker redisTracker,
            AirVaultSyncRelayService syncRelayService,
            AirVaultAuditService auditService,
            WsOperationTimer wsOperationTimer,
            @Qualifier("wsOffloadExecutor") ExecutorService wsOffloadExecutor,
            AirVaultMetricsService metricsService,
            AirVaultAuthorizationService authorizationService) {
        this.objectMapper = objectMapper;
        this.redisTracker = redisTracker;
        this.syncRelayService = syncRelayService;
        this.auditService = auditService;
        this.wsOperationTimer = wsOperationTimer;
        this.wsOffloadExecutor = wsOffloadExecutor;
        this.metricsService = metricsService;
        this.authorizationService = authorizationService;

        // Start server-side scheduled check: runs every 5 seconds to detect dead sessions (3 missed intervals = 15s)
        this.heartbeatScheduler.scheduleAtFixedRate(this::scanForHeartbeatTimeouts, 5, 5, TimeUnit.SECONDS);
    }

    @jakarta.annotation.PreDestroy
    public void onShutdown() {
        this.isShuttingDown = true;
        this.heartbeatScheduler.shutdownNow();
        log.info("[AirVault WS] Server shutting down: suppressing mass offline broadcast storms.");
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String deviceId = (String) session.getAttributes().get("deviceId");
        if (deviceId == null || deviceId.isBlank()) {
            try {
                session.close(CloseStatus.BAD_DATA.withReason("Missing deviceId attribute"));
            } catch (IOException ignored) {}
            return;
        }

        long now = System.currentTimeMillis();
        sessionDeviceMap.put(session.getId(), deviceId);
        sessionHeartbeatMap.put(session.getId(), now);
        sessionLockMap.put(session.getId(), new ReentrantLock());

        metricsService.recordConnectionEstablished();

        // Cancel any pending grace-window offline timer for this device (reconnect after brief drop or new tab)
        java.util.concurrent.ScheduledFuture<?> existingGraceTimer = deviceOfflineGraceTimers.remove(deviceId);
        boolean wasPendingOffline = (existingGraceTimer != null && !existingGraceTimer.isDone());
        if (existingGraceTimer != null) {
            existingGraceTimer.cancel(false);
        }

        // Add to device's set of active sessions
        java.util.Set<WebSocketSession> sessions = deviceSessions.computeIfAbsent(deviceId, k -> ConcurrentHashMap.newKeySet());
        boolean wasDeviceCompletelyOffline = sessions.isEmpty() && !wasPendingOffline;
        sessions.add(session);

        // Update Redis asynchronously without blocking transport thread
        wsOffloadExecutor.submit(() -> {
            try {
                redisTracker.recordSessionHeartbeat(deviceId, session.getId());
            } catch (Exception e) {
                log.warn("[AirVault WS] Failed to record device session online in Redis: {}", e.getMessage());
            }
        });

        log.debug("[AirVault WS] Connected: deviceId='{}' (session={}, totalDeviceSessions={})",
                deviceId, session.getId(), sessions.size());

        // Track user session if username attribute is attached
        String username = (String) session.getAttributes().get("username");
        if (username != null && !username.isBlank()) {
            String uKey = username.toLowerCase().trim().replace("@", "");
            sessionUserMap.put(session.getId(), uKey);
            userSessions.computeIfAbsent(uKey, k -> ConcurrentHashMap.newKeySet()).add(session);
            log.debug("[AirVault WS] Mapped session {} to username '{}'", session.getId(), uKey);
        }

        // Send CONNECT_ACK confirmation to client
        AirVaultWsMessage ack = AirVaultWsMessage.builder()
                .type("CONNECT_ACK")
                .senderDeviceId("server")
                .targetDeviceId(deviceId)
                .timestamp(now)
                .metadata(Map.of(
                        "status", "connected",
                        "serverTime", Instant.now().toString(),
                        "protocolVersion", "1.2"
                ))
                .build();
        sendMessageAsync(session, ack);

        // Broadcast DEVICE_ONLINE only if device was previously offline or grace timer expired
        if (wasDeviceCompletelyOffline) {
            AirVaultWsMessage onlineBroadcast = AirVaultWsMessage.builder()
                    .type("DEVICE_ONLINE")
                    .senderDeviceId(deviceId)
                    .targetDeviceId("broadcast")
                    .timestamp(now)
                    .build();
            broadcastToAll(onlineBroadcast, deviceId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String reason = status.getReason();
        String reasonTag = (status.equals(CloseStatus.NORMAL) || status.getCode() == 1000) ? "graceful" :
                (status.equals(CloseStatus.GOING_AWAY) ? "going_away" : "closed");
        handleSessionClosed(session, reason, reasonTag);
    }

    private void handleSessionClosed(WebSocketSession session, String reason, String reasonTag) {
        String deviceId = sessionDeviceMap.remove(session.getId());
        String username = sessionUserMap.remove(session.getId());
        sessionHeartbeatMap.remove(session.getId());
        sessionAtRiskMap.remove(session.getId());
        sessionLockMap.remove(session.getId());

        // Remove from all clipboard rooms
        java.util.Set<String> subscribedRooms = sessionClipboardRooms.remove(session.getId());
        if (subscribedRooms != null) {
            for (String room : subscribedRooms) {
                java.util.Set<WebSocketSession> roomSessions = clipboardRooms.get(room);
                if (roomSessions != null) {
                    roomSessions.remove(session);
                    if (roomSessions.isEmpty()) {
                        clipboardRooms.remove(room);
                    }
                }
            }
        }

        if (username != null) {
            java.util.Set<WebSocketSession> uSessions = userSessions.get(username);
            if (uSessions != null) {
                uSessions.remove(session);
                if (uSessions.isEmpty()) {
                    userSessions.remove(username);
                }
            }
        }

        metricsService.recordConnectionClosed(reasonTag != null ? reasonTag : "closed");

        if (deviceId != null) {
            java.util.Set<WebSocketSession> sessions = deviceSessions.get(deviceId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    deviceSessions.remove(deviceId);
                }
            }

            // Remove session presence in Redis asynchronously via wsOffloadExecutor
            wsOffloadExecutor.submit(() -> {
                try {
                    redisTracker.removeSessionPresence(deviceId, session.getId());
                } catch (Exception e) {
                    log.warn("[AirVault WS] Failed to remove session presence in Redis: {}", e.getMessage());
                }
            });

            // If this device has no remaining active sessions, schedule a grace-window debounce before broadcasting offline
            if ((sessions == null || sessions.isEmpty()) && !isShuttingDown) {
                scheduleGracefulDeviceOffline(deviceId);
            } else {
                log.debug("[AirVault WS] Session {} closed for deviceId='{}', active sessions remain: {}",
                        session.getId(), deviceId, sessions != null ? sessions.size() : 0);
            }
        }
    }

    /**
     * Debounces device offline broadcast by 10s grace window to prevent UI flicker on brief network drops / page refreshes.
     */
    private void scheduleGracefulDeviceOffline(String deviceId) {
        // Cancel existing timer if any
        java.util.concurrent.ScheduledFuture<?> prev = deviceOfflineGraceTimers.remove(deviceId);
        if (prev != null) {
            prev.cancel(false);
        }

        java.util.concurrent.ScheduledFuture<?> future = heartbeatScheduler.schedule(() -> {
            deviceOfflineGraceTimers.remove(deviceId);
            java.util.Set<WebSocketSession> currentSessions = deviceSessions.get(deviceId);
            if (currentSessions == null || currentSessions.isEmpty()) {
                deviceSessions.remove(deviceId);
                wsOffloadExecutor.submit(() -> {
                    try {
                        redisTracker.recordDeviceOffline(deviceId);
                    } catch (Exception e) {
                        log.warn("[AirVault WS] Failed to record device offline in Redis: {}", e.getMessage());
                    }
                });

                if (!isShuttingDown) {
                    log.debug("[AirVault WS] Grace window expired. Device '{}' marked OFFLINE.", deviceId);
                    AirVaultWsMessage offlineBroadcast = AirVaultWsMessage.builder()
                            .type("DEVICE_OFFLINE")
                            .senderDeviceId(deviceId)
                            .targetDeviceId("broadcast")
                            .timestamp(System.currentTimeMillis())
                            .build();
                    broadcastToAll(offlineBroadcast, deviceId);
                }
            }
        }, 10, TimeUnit.SECONDS);

        deviceOfflineGraceTimers.put(deviceId, future);
    }

    // Two-stage timeout thresholds: 45s soft monitoring window, 90s hard eviction cutoff
    private static final long SOFT_TIMEOUT_MS = 45_000L;
    private static final long HARD_TIMEOUT_MS = 90_000L;

    // sessionId -> boolean (flagged at risk during soft window to avoid log spam)
    private final Map<String, Boolean> sessionAtRiskMap = new ConcurrentHashMap<>();

    private void scanForHeartbeatTimeouts() {
        if (isShuttingDown) return;
        long now = System.currentTimeMillis();

        sessionHeartbeatMap.forEach((sessionId, lastHeartbeatTime) -> {
            long sinceLastHeartbeat = now - lastHeartbeatTime;
            String deviceId = sessionDeviceMap.get(sessionId);

            if (sinceLastHeartbeat > HARD_TIMEOUT_MS) {
                log.warn("[AirVault WS] ⚠️ Session {} (device='{}') hard heartbeat timed out ({}ms since last heartbeat). Closing socket.",
                        sessionId, deviceId, sinceLastHeartbeat);
                sessionAtRiskMap.remove(sessionId);

                java.util.Set<WebSocketSession> sessions = deviceId != null ? deviceSessions.get(deviceId) : null;
                if (sessions != null) {
                    for (WebSocketSession s : sessions) {
                        if (s.getId().equals(sessionId)) {
                            try {
                                if (s.isOpen()) {
                                    s.close(CloseStatus.GOING_AWAY.withReason("Heartbeat hard timeout (90s)"));
                                }
                            } catch (Exception ignored) {}
                            handleSessionClosed(s, "Heartbeat hard timeout", "heartbeat_timeout");
                            break;
                        }
                    }
                }
            } else if (sinceLastHeartbeat > SOFT_TIMEOUT_MS) {
                Boolean alreadyFlagged = sessionAtRiskMap.putIfAbsent(sessionId, Boolean.TRUE);
                if (alreadyFlagged == null || !alreadyFlagged) {
                    log.warn("[AirVault WS] ⏳ Session {} (device='{}') missed heartbeat window ({}ms) — monitoring within grace window.",
                            sessionId, deviceId, sinceLastHeartbeat);
                }
            } else {
                sessionAtRiskMap.remove(sessionId);
            }
        });
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) {
        final AirVaultWsMessage msg;
        try {
            String payload = textMessage.getPayload();
            msg = objectMapper.readValue(payload, AirVaultWsMessage.class);
            if (msg == null || msg.getType() == null) {
                return;
            }
        } catch (Exception e) {
            log.debug("[AirVault WS] Parse error on session {}: {}", session.getId(), e.getMessage());
            return;
        }

        final String senderDeviceId = (String) session.getAttributes().get("deviceId");
        if (msg.getSenderDeviceId() == null) {
            msg.setSenderDeviceId(senderDeviceId);
        }

        metricsService.recordMessageReceived();

        long now = System.currentTimeMillis();
        sessionHeartbeatMap.put(session.getId(), now);

        // 1. APPLICATION-LEVEL HEARTBEAT HANDLING
        if ("HEARTBEAT".equalsIgnoreCase(msg.getType())) {
            Long lastTime = sessionHeartbeatMap.get(session.getId());
            if (lastTime != null && (now - lastTime < 1000)) {
                return;
            }
            sessionHeartbeatMap.put(session.getId(), now);

            java.util.concurrent.ScheduledFuture<?> timer = deviceOfflineGraceTimers.remove(senderDeviceId);
            if (timer != null) {
                timer.cancel(false);
            }

            wsOffloadExecutor.submit(() -> {
                try {
                    redisTracker.recordSessionHeartbeat(senderDeviceId, session.getId());
                } catch (Exception e) {
                    log.warn("[AirVault WS] Failed updating heartbeat in Redis for session {}: {}", session.getId(), e.getMessage());
                }
            });
            return;
        }

        // 2. PING / PONG HANDLING
        if ("PING".equalsIgnoreCase(msg.getType())) {
            AirVaultWsMessage pong = AirVaultWsMessage.builder()
                    .type("PONG")
                    .senderDeviceId("server")
                    .targetDeviceId(senderDeviceId)
                    .timestamp(now)
                    .build();
            sendMessageAsync(session, pong);
            return;
        }

        // 3. ROOM SUBSCRIPTION: SUBSCRIBE {clipboardId}
        if ("SUBSCRIBE".equalsIgnoreCase(msg.getType())) {
            handleRoomSubscription(session, msg);
            return;
        }

        // 4. ROOM UNSUBSCRIPTION: UNSUBSCRIBE {clipboardId}
        if ("UNSUBSCRIBE".equalsIgnoreCase(msg.getType())) {
            handleRoomUnsubscription(session, msg);
            return;
        }

        // 5. DYNAMIC USER REGISTRATION / USERNAME UPDATE
        if ("REGISTER_USER".equalsIgnoreCase(msg.getType()) || "USERNAME_UPDATED".equalsIgnoreCase(msg.getType())) {
            String newUsername = null;
            if (msg.getMetadata() != null && msg.getMetadata().containsKey("username")) {
                newUsername = String.valueOf(msg.getMetadata().get("username"));
            } else if (msg.getPayload() != null && !msg.getPayload().isBlank()) {
                String payloadStr = msg.getPayload().trim();
                if (payloadStr.startsWith("{")) {
                    try {
                        com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(payloadStr);
                        if (node.has("username")) {
                            newUsername = node.get("username").asText();
                        } else if (node.has("newUsername")) {
                            newUsername = node.get("newUsername").asText();
                        }
                    } catch (Exception ignored) {}
                } else {
                    newUsername = payloadStr;
                }
            }

            if (newUsername != null && !newUsername.isBlank()) {
                String uKey = newUsername.toLowerCase().trim().replace("@", "");
                String oldUser = sessionUserMap.remove(session.getId());
                if (oldUser != null && !oldUser.equals(uKey)) {
                    java.util.Set<WebSocketSession> oldSet = userSessions.get(oldUser);
                    if (oldSet != null) {
                        oldSet.remove(session);
                        if (oldSet.isEmpty()) {
                            userSessions.remove(oldUser);
                        }
                    }
                }
                sessionUserMap.put(session.getId(), uKey);
                userSessions.computeIfAbsent(uKey, k -> ConcurrentHashMap.newKeySet()).add(session);
                session.getAttributes().put("username", uKey);
                log.debug("[AirVault WS] Dynamically mapped session {} to username '{}'", session.getId(), uKey);
            }
            return;
        }

        // 6. Device-level Signal Routing, RabbitMQ relay, Audit writes
        wsOffloadExecutor.submit(() -> {
            try {
                routeSignalMessage(msg, senderDeviceId);

                SignalMessageDto dto = SignalMessageDto.builder()
                        .id(msg.getMessageId() != null ? msg.getMessageId() : UUID.randomUUID().toString())
                        .senderDeviceId(senderDeviceId)
                        .targetDeviceId(msg.getTargetDeviceId())
                        .signalType(msg.getType())
                        .payload(msg.getPayload() != null ? String.valueOf(msg.getPayload()) : "{}")
                        .timestamp(Instant.now())
                        .build();

                wsOperationTimer.timeRunnable("rabbit.publish", session.getId(), () -> {
                    try {
                        syncRelayService.publishSyncEvent(dto);
                    } catch (Exception e) {
                        log.warn("[AirVault WS] Rabbit publish failed: {}", e.getMessage());
                    }
                });

                if ("ITEM_DELETE".equalsIgnoreCase(msg.getType())) {
                    wsOperationTimer.timeRunnable("audit.record", session.getId(), () -> {
                        try {
                            auditService.recordEvent("item_deleted", null, null, senderDeviceId, null, dto.getId(), "SUCCESS", null, null, Map.of("scope", "websocket", "signalType", msg.getType()));
                        } catch (Exception e) {
                            log.warn("[AirVault WS] Audit record failed: {}", e.getMessage());
                        }
                    });
                } else if ("SYNC_PACKET".equalsIgnoreCase(msg.getType())) {
                    wsOperationTimer.timeRunnable("audit.record", session.getId(), () -> {
                        try {
                            auditService.recordEvent("item_shared", null, null, senderDeviceId, null, dto.getId(), "SUCCESS", null, null, Map.of("target", String.valueOf(msg.getTargetDeviceId()), "signalType", msg.getType()));
                        } catch (Exception e) {
                            log.warn("[AirVault WS] Audit record failed: {}", e.getMessage());
                        }
                    });
                }
            } catch (Exception e) {
                log.error("[AirVault WS-OFFLOAD] Error processing message on session {}: {}", session.getId(), e.getMessage(), e);
            }
        });
    }

    private void handleRoomSubscription(WebSocketSession session, AirVaultWsMessage msg) {
        String clipboardId = extractClipboardId(msg);
        if (clipboardId == null || clipboardId.isBlank()) {
            sendSubscribeError(session, null, "Missing clipboardId for room subscription");
            return;
        }

        AirVaultPrincipal principal = (AirVaultPrincipal) session.getAttributes().get("principal");
        boolean canRead = authorizationService.canRead(principal, clipboardId);

        if (!canRead) {
            log.warn("[AirVault WS] 🚫 Denied SUBSCRIBE to clipboard='{}' for principal='{}'", clipboardId, principal != null ? principal.getUsername() : "null");
            sendSubscribeError(session, clipboardId, "Forbidden: unauthorized or expired clipboard access");
            return;
        }

        clipboardRooms.computeIfAbsent(clipboardId, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionClipboardRooms.computeIfAbsent(session.getId(), k -> ConcurrentHashMap.newKeySet()).add(clipboardId);

        log.info("[AirVault WS] 🟢 Session {} subscribed to clipboard room '{}'", session.getId(), clipboardId);

        AirVaultWsMessage ack = AirVaultWsMessage.builder()
                .type("SUBSCRIBE_ACK")
                .senderDeviceId("server")
                .clipboardId(clipboardId)
                .timestamp(System.currentTimeMillis())
                .metadata(Map.of("clipboardId", clipboardId, "status", "subscribed"))
                .build();
        sendMessageAsync(session, ack);
    }

    private void handleRoomUnsubscription(WebSocketSession session, AirVaultWsMessage msg) {
        String clipboardId = extractClipboardId(msg);
        if (clipboardId == null || clipboardId.isBlank()) return;

        java.util.Set<WebSocketSession> room = clipboardRooms.get(clipboardId);
        if (room != null) {
            room.remove(session);
            if (room.isEmpty()) clipboardRooms.remove(clipboardId);
        }

        java.util.Set<String> userRooms = sessionClipboardRooms.get(session.getId());
        if (userRooms != null) {
            userRooms.remove(clipboardId);
        }

        log.info("[AirVault WS] 🔴 Session {} unsubscribed from clipboard room '{}'", session.getId(), clipboardId);

        AirVaultWsMessage ack = AirVaultWsMessage.builder()
                .type("UNSUBSCRIBE_ACK")
                .senderDeviceId("server")
                .clipboardId(clipboardId)
                .timestamp(System.currentTimeMillis())
                .metadata(Map.of("clipboardId", clipboardId, "status", "unsubscribed"))
                .build();
        sendMessageAsync(session, ack);
    }

    private String extractClipboardId(AirVaultWsMessage msg) {
        if (msg.getClipboardId() != null && !msg.getClipboardId().isBlank()) {
            return msg.getClipboardId().trim();
        }
        if (msg.getMetadata() != null && msg.getMetadata().containsKey("clipboardId")) {
            return String.valueOf(msg.getMetadata().get("clipboardId")).trim();
        }
        if (msg.getPayload() != null && !msg.getPayload().isBlank()) {
            String p = msg.getPayload().trim();
            if (p.startsWith("{")) {
                try {
                    com.fasterxml.jackson.databind.JsonNode n = objectMapper.readTree(p);
                    if (n.has("clipboardId")) return n.get("clipboardId").asText().trim();
                } catch (Exception ignored) {}
            }
            return p;
        }
        return null;
    }

    private void sendSubscribeError(WebSocketSession session, String clipboardId, String error) {
        AirVaultWsMessage err = AirVaultWsMessage.builder()
                .type("SUBSCRIBE_ERROR")
                .senderDeviceId("server")
                .clipboardId(clipboardId)
                .payload(error)
                .timestamp(System.currentTimeMillis())
                .metadata(Map.of("status", "forbidden", "error", error))
                .build();
        sendMessageAsync(session, err);
    }

    /**
     * Room-scoped event distribution: Sends message ONLY to active sessions in clipboard's room.
     */
    public void sendToClipboardRoom(String clipboardId, AirVaultWsMessage message, String excludeSessionId) {
        if (clipboardId == null || clipboardId.isBlank()) return;
        java.util.Set<WebSocketSession> roomSessions = clipboardRooms.get(clipboardId);
        if (roomSessions != null && !roomSessions.isEmpty()) {
            for (WebSocketSession s : roomSessions) {
                if (s.isOpen() && (excludeSessionId == null || !s.getId().equals(excludeSessionId))) {
                    sendMessageAsync(s, message);
                }
            }
        }
    }

    /**
     * Revokes access to a clipboard room and notifies subscribers immediately.
     */
    public void revokeClipboardRoom(String clipboardId, String reason) {
        if (clipboardId == null) return;
        java.util.Set<WebSocketSession> roomSessions = clipboardRooms.remove(clipboardId);
        if (roomSessions != null && !roomSessions.isEmpty()) {
            AirVaultWsMessage revokedMsg = AirVaultWsMessage.builder()
                    .type("CLIPBOARD_REVOKED")
                    .senderDeviceId("server")
                    .clipboardId(clipboardId)
                    .payload(reason != null ? reason : "Clipboard access has been revoked or expired")
                    .timestamp(System.currentTimeMillis())
                    .build();
            for (WebSocketSession s : roomSessions) {
                java.util.Set<String> userRooms = sessionClipboardRooms.get(s.getId());
                if (userRooms != null) userRooms.remove(clipboardId);
                if (s.isOpen()) {
                    sendMessageAsync(s, revokedMsg);
                }
            }
        }
    }

    public boolean isSessionInClipboardRoom(String clipboardId, String sessionId) {
        java.util.Set<WebSocketSession> room = clipboardRooms.get(clipboardId);
        if (room == null || sessionId == null) return false;
        return room.stream().anyMatch(s -> s.getId().equals(sessionId) && s.isOpen());
    }

    public int getClipboardRoomSubscriberCount(String clipboardId) {
        java.util.Set<WebSocketSession> room = clipboardRooms.get(clipboardId);
        return room != null ? room.size() : 0;
    }

    private void routeSignalMessage(AirVaultWsMessage msg, String senderDeviceId) {
        String targetDeviceId = msg.getTargetDeviceId();
        if ("broadcast".equalsIgnoreCase(targetDeviceId) || targetDeviceId == null) {
            broadcastToAll(msg, senderDeviceId);
        } else {
            sendToDevice(targetDeviceId, msg);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        String deviceId = (String) session.getAttributes().get("deviceId");
        log.debug("[AirVault WS] Connection failure on session {} (device='{}'): {}",
                session.getId(), deviceId, exception.getMessage());
        evictDeadSession(session);
    }

    private void evictDeadSession(WebSocketSession session, String reasonTag) {
        if (session == null) return;
        try {
            if (session.isOpen()) {
                session.close(CloseStatus.SERVER_ERROR.withReason("Session evicted"));
            }
        } catch (Exception ignored) {}
        handleSessionClosed(session, "Session evicted", reasonTag != null ? reasonTag : "evicted");
    }

    private void evictDeadSession(WebSocketSession session) {
        evictDeadSession(session, "evicted");
    }

    public boolean sendToDevice(String targetDeviceId, AirVaultWsMessage message) {
        java.util.Set<WebSocketSession> targetSessions = deviceSessions.get(targetDeviceId);
        if (targetSessions != null && !targetSessions.isEmpty()) {
            for (WebSocketSession s : targetSessions) {
                if (s.isOpen()) {
                    sendMessageAsync(s, message);
                }
            }
            return true;
        }
        return false;
    }

    public void broadcastToAll(AirVaultWsMessage message, String excludeDeviceId) {
        deviceSessions.forEach((devId, sessions) -> {
            if (excludeDeviceId == null || !devId.equals(excludeDeviceId)) {
                for (WebSocketSession targetSession : sessions) {
                    if (targetSession.isOpen()) {
                        sendMessageAsync(targetSession, message);
                    }
                }
            }
        });
    }

    public boolean isDeviceConnected(String deviceId) {
        java.util.Set<WebSocketSession> sessions = deviceSessions.get(deviceId);
        if (sessions != null && !sessions.isEmpty()) {
            return sessions.stream().anyMatch(WebSocketSession::isOpen);
        }
        return false;
    }

    public int getConnectedDeviceCount() {
        return deviceSessions.size();
    }

    /**
     * Sends a WebSocket message to all active sessions/devices belonging to a specific user.
     */
    public boolean sendToUser(String targetUsername, AirVaultWsMessage message) {
        if (targetUsername == null || targetUsername.isBlank()) {
            return false;
        }
        String uKey = targetUsername.toLowerCase().trim().replace("@", "");
        java.util.Set<WebSocketSession> targetSessions = userSessions.get(uKey);
        if (targetSessions != null && !targetSessions.isEmpty()) {
            for (WebSocketSession s : targetSessions) {
                if (s.isOpen()) {
                    sendMessageAsync(s, message);
                }
            }
            return true;
        }
        return false;
    }

    /**
     * Sends a WebSocket message asynchronously to an individual target session with a 2-second timeout.
     */
    private void sendMessageAsync(WebSocketSession session, AirVaultWsMessage message) {
        if (session == null || !session.isOpen()) {
            return;
        }

        metricsService.recordMessageSent();

        wsOffloadExecutor.submit(() -> {
            try {
                CompletableFuture<Void> sendFuture = CompletableFuture.runAsync(() -> {
                    wsOperationTimer.timeRunnable("ws.session.send", session.getId(), () -> {
                        ReentrantLock lock = sessionLockMap.computeIfAbsent(session.getId(), k -> new ReentrantLock());
                        boolean acquired = false;
                        try {
                            acquired = lock.tryLock(2, TimeUnit.SECONDS);
                            if (acquired && session.isOpen()) {
                                String json = objectMapper.writeValueAsString(message);
                                session.sendMessage(new TextMessage(json));
                            }
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            throw new RuntimeException("Lock acquisition interrupted", e);
                        } finally {
                            if (acquired) {
                                lock.unlock();
                            }
                        }
                    });
                }, wsOffloadExecutor);

                sendFuture.get(2, TimeUnit.SECONDS);
            } catch (TimeoutException te) {
                log.warn("[WS-SLOW-CLIENT] session={} did not accept message within 2s — evicting stalled session", session.getId());
                evictDeadSession(session, "slow_client");
            } catch (Exception e) {
                log.warn("[AirVault WS] Failed to send message to session {}: {}", session.getId(), e.getMessage());
                evictDeadSession(session, "send_failed");
            }
        });
    }
}
