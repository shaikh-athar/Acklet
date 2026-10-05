package com.code.acklet.airvault.service;

import com.code.acklet.airvault.config.AirVaultRabbitMqConfig;
import com.code.acklet.airvault.controller.AirVaultSyncController;
import com.code.acklet.airvault.dto.DocOperationDto;
import com.code.acklet.airvault.dto.SignalMessageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Single ordered consumer for discrete document operations with manual ACK durability.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultDocOpsQueueConsumer {

    private final AirVaultDocSequencerService sequencerService;
    private final com.code.acklet.airvault.websocket.AirVaultWebSocketHandler webSocketHandler;
    private final AirVaultSyncRelayService syncRelayService;
    private final ObjectMapper objectMapper;

    @RabbitListener(
            queues = AirVaultRabbitMqConfig.AIRVAULT_DOC_OPS_QUEUE,
            concurrency = "1",
            ackMode = "MANUAL"
    )
    public void consumeDocOperation(
            DocOperationDto operation,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag
    ) {
        log.debug("[DocOps Consumer] 📥 Received operation opId={} for docId={}, type={}, lineId={}",
                operation.getOpId(), operation.getDocId(), operation.getType(), operation.getLineId());

        try {
            // 1. Process operation via sequencer (monotonic sequencing, deduplication, conflict resolution)
            DocOperationDto sequenced = sequencerService.processOperation(operation);

            String payloadJson = objectMapper.writeValueAsString(sequenced);
            String authorId = sequenced.getAuthorId() != null ? sequenced.getAuthorId() : "server-sequencer";

            // 2. Broadcast sequenced operation to all connected peers via WebSocket
            com.code.acklet.airvault.websocket.dto.AirVaultWsMessage wsMsg = com.code.acklet.airvault.websocket.dto.AirVaultWsMessage.builder()
                    .type("DOC_OPERATION")
                    .senderDeviceId(authorId)
                    .targetDeviceId("broadcast")
                    .payload(payloadJson)
                    .timestamp(System.currentTimeMillis())
                    .build();
            webSocketHandler.broadcastToAll(wsMsg, null);

            // Also publish event to RabbitMQ
            SignalMessageDto broadcastSignal = SignalMessageDto.builder()
                    .id(UUID.randomUUID().toString())
                    .senderDeviceId(authorId)
                    .targetDeviceId("broadcast")
                    .signalType("DOC_OPERATION")
                    .payload(payloadJson)
                    .timestamp(Instant.now())
                    .build();
            syncRelayService.publishSyncEvent(broadcastSignal);

            // 3. Durably ACK only after persistence, sequencing, and broadcast preparation succeed
            channel.basicAck(deliveryTag, false);
            log.debug("[DocOps Consumer] ✅ Successfully sequenced (seq={}) & ACKed opId={} for docId={}",
                    sequenced.getSequenceNumber(), sequenced.getOpId(), sequenced.getDocId());

        } catch (Exception ex) {
            log.error("[DocOps Consumer] ❌ Failed to process doc opId={}: {}", operation.getOpId(), ex.getMessage(), ex);
            try {
                // Requeue or NACK based on transient failure to prevent silent data loss
                channel.basicNack(deliveryTag, false, true);
            } catch (Exception nackEx) {
                log.error("[DocOps Consumer] ⛔ Failed to basicNack deliveryTag={}: {}", deliveryTag, nackEx.getMessage());
            }
        }
    }
}
