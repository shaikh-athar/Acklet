package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.SignalMessageDto;
import com.code.acklet.airvault.websocket.AirVaultMetricsService;
import com.code.acklet.airvault.websocket.AirVaultWebSocketHandler;
import com.code.acklet.airvault.websocket.dto.AirVaultWsMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

/**
 * Cluster-wide sync & presence consumer.
 * Subscribes to the node-specific anonymous broadcast queue bound to airvault.exchange.
 * When any cluster node publishes a sync/presence event, this listener forwards it to
 * locally-connected WebSocket sessions on this node if applicable.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultClusterSyncListener {

    private final AirVaultWebSocketHandler webSocketHandler;
    private final AirVaultMetricsService metricsService;

    @RabbitListener(queues = "#{airvaultNodeBroadcastQueue.name}")
    public void onClusterSignalReceived(SignalMessageDto signal) {
        if (signal == null || signal.getSignalType() == null) {
            return;
        }

        log.debug("[AirVault Cluster Bus] 📥 Received cross-node event: type={}, sender={}, target={}, node={}",
                signal.getSignalType(), signal.getSenderDeviceId(), signal.getTargetDeviceId(), metricsService.getNodeId());

        AirVaultWsMessage wsMsg = AirVaultWsMessage.builder()
                .messageId(signal.getId())
                .type(signal.getSignalType())
                .senderDeviceId(signal.getSenderDeviceId())
                .targetDeviceId(signal.getTargetDeviceId())
                .payload(signal.getPayload())
                .timestamp(signal.getTimestamp() != null ? signal.getTimestamp().toEpochMilli() : System.currentTimeMillis())
                .build();

        String targetDeviceId = signal.getTargetDeviceId();

        // If target is broadcast or not specified, broadcast to all local sessions (except sender if on this node)
        if (targetDeviceId == null || "broadcast".equalsIgnoreCase(targetDeviceId)) {
            webSocketHandler.broadcastToAll(wsMsg, signal.getSenderDeviceId());
        } else {
            // Forward strictly to local sessions connected for this targetDeviceId on this node
            if (webSocketHandler.isDeviceConnected(targetDeviceId)) {
                webSocketHandler.sendToDevice(targetDeviceId, wsMsg);
                log.debug("[AirVault Cluster Bus] 🎯 Dispatched cross-node event to locally-held session for device '{}'", targetDeviceId);
            }
        }
    }
}
