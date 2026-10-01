package com.code.acklet.airvault.service;

import com.code.acklet.airvault.config.AirVaultRabbitMqConfig;
import com.code.acklet.airvault.dto.AirVaultAuditEventDto;
import com.code.acklet.airvault.entity.AirVaultAuditEvent;
import com.code.acklet.airvault.repository.AirVaultAuditEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultAuditService {

    private final RabbitTemplate rabbitTemplate;
    private final AirVaultAuditEventRepository auditRepository;
    private final AirVaultRedisTracker redisTracker;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Publishes an audit event asynchronously to RabbitMQ (non-blocking).
     * Automatically invalidates Redis day cache for the actor identity.
     */
    public void recordEvent(
            String eventType,
            UUID actorIdentityId,
            String actorUsername,
            String deviceId,
            String ipAddress,
            String targetResourceId,
            String result,
            String beforeValue,
            String afterValue,
            Map<String, Object> metadata) {
        try {
            AirVaultAuditEventDto dto = AirVaultAuditEventDto.builder()
                    .eventId(UUID.randomUUID())
                    .timestampUtc(Instant.now())
                    .eventType(eventType)
                    .actorIdentityId(actorIdentityId)
                    .actorUsername(actorUsername)
                    .deviceId(deviceId)
                    .ipAddress(ipAddress)
                    .targetResourceId(targetResourceId)
                    .result(result != null ? result : "SUCCESS")
                    .beforeValue(beforeValue)
                    .afterValue(afterValue)
                    .metadata(metadata)
                    .build();

            // Invalidate Redis cache for this actor and today
            if (actorIdentityId != null || actorUsername != null || deviceId != null) {
                String actorKey = actorIdentityId != null ? actorIdentityId.toString() : (actorUsername != null ? actorUsername : deviceId);
                redisTracker.invalidateHistoryCache("audit", actorKey, dto.getTimestampUtc());
            }

            rabbitTemplate.convertAndSend(
                    AirVaultRabbitMqConfig.AIRVAULT_AUDIT_EXCHANGE,
                    AirVaultRabbitMqConfig.ROUTING_KEY_AUDIT_EVENT,
                    dto
            );
            log.debug("[AirVault Audit] 📨 Published audit event: type={}, actor={}, result={}", eventType, actorUsername, result);
        } catch (Exception e) {
            log.debug("[AirVault Audit] RabbitMQ publish deferred/fallback to direct DB: {}", e.getMessage());
            // Fallback direct persist in edge cases where RabbitMQ connection drops
            try {
                AirVaultAuditEvent entity = AirVaultAuditEvent.builder()
                        .timestampUtc(Instant.now())
                        .eventType(eventType)
                        .actorIdentityId(actorIdentityId)
                        .actorUsername(actorUsername)
                        .deviceId(deviceId)
                        .ipAddress(ipAddress)
                        .targetResourceId(targetResourceId)
                        .result(result != null ? result : "SUCCESS")
                        .beforeValue(beforeValue)
                        .afterValue(afterValue)
                        .metadata(metadata)
                        .build();
                auditRepository.save(entity);
            } catch (Exception ex) {
                log.error("[AirVault Audit] Direct DB fallback also failed: {}", ex.getMessage());
            }
        }
    }

    /**
     * RabbitMQ consumer that ingests audit events from the durable queue and persists them to Postgres.
     */
    @RabbitListener(queues = AirVaultRabbitMqConfig.AIRVAULT_AUDIT_QUEUE)
    @Transactional
    public void processAuditEvent(AirVaultAuditEventDto dto) {
        try {
            AirVaultAuditEvent entity = AirVaultAuditEvent.builder()
                    .eventId(dto.getEventId())
                    .timestampUtc(dto.getTimestampUtc() != null ? dto.getTimestampUtc() : Instant.now())
                    .eventType(dto.getEventType())
                    .actorIdentityId(dto.getActorIdentityId())
                    .actorUsername(dto.getActorUsername())
                    .deviceId(dto.getDeviceId())
                    .ipAddress(dto.getIpAddress())
                    .targetResourceId(dto.getTargetResourceId())
                    .result(dto.getResult())
                    .beforeValue(dto.getBeforeValue())
                    .afterValue(dto.getAfterValue())
                    .metadata(dto.getMetadata())
                    .build();

            auditRepository.save(entity);
            log.debug("[AirVault Audit Consumer] 💾 Persisted audit event: id={}, type={}", entity.getEventId(), entity.getEventType());
        } catch (Exception e) {
            log.error("[AirVault Audit Consumer] Error processing audit event {}: {}", dto.getEventId(), e.getMessage());
            throw e; // trigger dead letter queue routing
        }
    }
}
