package com.code.acklet.airvault.websocket;

import com.code.acklet.airvault.dto.SignalMessageDto;
import com.code.acklet.airvault.service.AirVaultAuditService;
import com.code.acklet.airvault.service.AirVaultRedisTracker;
import com.code.acklet.airvault.service.AirVaultSyncRelayService;
import com.code.acklet.airvault.websocket.dto.AirVaultWsMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class AirVaultWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final AirVaultRedisTracker redisTracker;

    private final AirVaultSyncRelayService syncRelayService;
    private final AirVaultAuditService auditService;

    // deviceId -> WebSocketSession
    private final Map<String, WebSocketSession> deviceSessions = new ConcurrentHashMap<>();

    // sessionId -> deviceId
    private final Map<String, String> sessionDeviceMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String deviceId = (String) session.getAttributes().get("deviceId");
        if (deviceId == null || deviceId.isBlank()) {
            try {
                session.close(CloseStatus.BAD_DATA.withReason("Missing deviceId attribute"));
            } catch (IOException ignored) {}
            return;
        }

        // Close and evict any previous session for the same deviceId to guarantee exactly 1 active socket per device
        WebSocketSession existing = deviceSessions.put(deviceId, session);
        if (existing != null && existing.isOpen() && !existing.getId().equals(session.getId())) {
            try {
                existing.close(CloseStatus.NORMAL.withReason("Replaced by new WebSocket connection"));
            } catch (IOException ignored) {}
        }

        sessionDeviceMap.put(session.getId(), deviceId);
        redisTracker.recordDeviceOnline(deviceId);

        log.debug("[AirVault WS] Connected: deviceId='{}' (session={})", deviceId, session.getId());

        // Send CONNECT_ACK confirmation to client
        AirVaultWsMessage ack = AirVaultWsMessage.builder()
                .type("CONNECT_ACK")
                .senderDeviceId("server")
                .targetDeviceId(deviceId)
                .timestamp(System.currentTimeMillis())
                .metadata(Map.of(
                        "status", "connected",
                        "serverTime", Instant.now().toString(),
                        "protocolVersion", "1.0"
                ))
                .build();
        sendMessage(session, ack);

        // Notify all other connected peers immediately that this device is online
        AirVaultWsMessage onlineBroadcast = AirVaultWsMessage.builder()
                .type("DEVICE_ONLINE")
                .senderDeviceId(deviceId)
                .targetDeviceId("broadcast")
                .timestamp(System.currentTimeMillis())
                .build();
        broadcastToAll(onlineBroadcast, deviceId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String deviceId = sessionDeviceMap.remove(session.getId());
        if (deviceId != null) {
            deviceSessions.remove(deviceId, session);
            boolean stillActive = deviceSessions.containsKey(deviceId);
            if (!stillActive) {
                redisTracker.recordDeviceOffline(deviceId);
                log.debug("[AirVault WS] Disconnected: deviceId='{}' (code={}, reason='{}')",
                        deviceId, status.getCode(), status.getReason());

                // Notify remaining connected peers immediately that this device is offline
                AirVaultWsMessage offlineBroadcast = AirVaultWsMessage.builder()
                        .type("DEVICE_OFFLINE")
                        .senderDeviceId(deviceId)
                        .targetDeviceId("broadcast")
                        .timestamp(System.currentTimeMillis())
                        .build();
                broadcastToAll(offlineBroadcast, deviceId);
            } else {
                log.debug("[AirVault WS] Stale session {} closed for deviceId='{}', active session remains",
                        session.getId(), deviceId);
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) {
        try {
            String payload = textMessage.getPayload();
            AirVaultWsMessage msg = objectMapper.readValue(payload, AirVaultWsMessage.class);
            if (msg == null || msg.getType() == null) {
                return;
            }

            String senderDeviceId = (String) session.getAttributes().get("deviceId");
            if (msg.getSenderDeviceId() == null) {
                msg.setSenderDeviceId(senderDeviceId);
            }

            if ("PING".equalsIgnoreCase(msg.getType())) {
                AirVaultWsMessage pong = AirVaultWsMessage.builder()
                        .type("PONG")
                        .senderDeviceId("server")
                        .targetDeviceId(senderDeviceId)
                        .timestamp(System.currentTimeMillis())
                        .build();
                sendMessage(session, pong);
            } else {
                // Route real-time signal over WebSocket to destination session(s)
                routeSignalMessage(msg, senderDeviceId);

                // Publish to RabbitMQ relay for multi-node clustering and durable audit trail
                try {
                    SignalMessageDto dto = SignalMessageDto.builder()
                            .id(msg.getMessageId() != null ? msg.getMessageId() : UUID.randomUUID().toString())
                            .senderDeviceId(senderDeviceId)
                            .targetDeviceId(msg.getTargetDeviceId())
                            .signalType(msg.getType())
                            .payload(msg.getPayload() != null ? String.valueOf(msg.getPayload()) : "{}")
                            .timestamp(Instant.now())
                            .build();
                    syncRelayService.publishSyncEvent(dto);

                    if ("ITEM_DELETE".equalsIgnoreCase(msg.getType())) {
                        auditService.recordEvent("item_deleted", null, null, senderDeviceId, null, dto.getId(), "SUCCESS", null, null, Map.of("scope", "websocket", "signalType", msg.getType()));
                    } else if ("SYNC_PACKET".equalsIgnoreCase(msg.getType())) {
                        auditService.recordEvent("item_shared", null, null, senderDeviceId, null, dto.getId(), "SUCCESS", null, null, Map.of("target", String.valueOf(msg.getTargetDeviceId()), "signalType", msg.getType()));
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            log.debug("[AirVault WS] Error handling text message: {}", e.getMessage());
        }
    }

    private void routeSignalMessage(AirVaultWsMessage msg, String senderDeviceId) {
        String targetDeviceId = msg.getTargetDeviceId();
        if ("broadcast".equalsIgnoreCase(targetDeviceId) || targetDeviceId == null) {
            // Broadcast to all other connected device sessions
            deviceSessions.forEach((devId, targetSession) -> {
                if (!devId.equals(senderDeviceId) && targetSession.isOpen()) {
                    sendMessage(targetSession, msg);
                }
            });
        } else {
            // Direct targeted delivery
            WebSocketSession targetSession = deviceSessions.get(targetDeviceId);
            if (targetSession != null && targetSession.isOpen()) {
                sendMessage(targetSession, msg);
            } else {
                log.debug("[AirVault WS] Target session for device '{}' not available or closed", targetDeviceId);
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        String deviceId = (String) session.getAttributes().get("deviceId");
        log.debug("[AirVault WS] Connection failure on session {} (device='{}'): {}",
                session.getId(), deviceId, exception.getMessage());
        evictDeadSession(session);
    }

    private void evictDeadSession(WebSocketSession session) {
        if (session == null) return;
        String deviceId = sessionDeviceMap.remove(session.getId());
        if (deviceId != null) {
            deviceSessions.remove(deviceId, session);
            boolean stillActive = deviceSessions.containsKey(deviceId);
            if (!stillActive) {
                redisTracker.recordDeviceOffline(deviceId);
                try {
                    if (session.isOpen()) {
                        session.close(CloseStatus.SERVER_ERROR);
                    }
                } catch (Exception ignored) {}

                AirVaultWsMessage offlineBroadcast = AirVaultWsMessage.builder()
                        .type("DEVICE_OFFLINE")
                        .senderDeviceId(deviceId)
                        .targetDeviceId("broadcast")
                        .timestamp(System.currentTimeMillis())
                        .build();
                broadcastToAll(offlineBroadcast, deviceId);
            }
        }
    }

    public boolean sendToDevice(String targetDeviceId, AirVaultWsMessage message) {
        WebSocketSession targetSession = deviceSessions.get(targetDeviceId);
        if (targetSession != null && targetSession.isOpen()) {
            return sendMessage(targetSession, message);
        }
        return false;
    }

    public void broadcastToAll(AirVaultWsMessage message, String excludeDeviceId) {
        deviceSessions.forEach((devId, targetSession) -> {
            if ((excludeDeviceId == null || !devId.equals(excludeDeviceId)) && targetSession.isOpen()) {
                sendMessage(targetSession, message);
            }
        });
    }

    public boolean isDeviceConnected(String deviceId) {
        WebSocketSession session = deviceSessions.get(deviceId);
        return session != null && session.isOpen();
    }

    public int getConnectedDeviceCount() {
        return deviceSessions.size();
    }

    private boolean sendMessage(WebSocketSession session, AirVaultWsMessage message) {
        if (session == null || !session.isOpen()) {
            return false;
        }
        synchronized (session) {
            try {
                if (!session.isOpen()) return false;
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
                return true;
            } catch (IOException e) {
                log.warn("[AirVault WS] Failed to send message to session {}: {}", session.getId(), e.getMessage());
                evictDeadSession(session);
                return false;
            }
        }
    }
}
