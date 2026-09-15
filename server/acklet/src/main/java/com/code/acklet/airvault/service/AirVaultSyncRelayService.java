package com.code.acklet.airvault.service;

import com.code.acklet.airvault.config.AirVaultRabbitConfig;
import com.code.acklet.airvault.dto.SignalMessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultSyncRelayService {

    private final RabbitTemplate rabbitTemplate;

    public void publishSyncEvent(SignalMessageDto signal) {
        try {
            String routingKey = "airvault.sync." + (signal.getTargetDeviceId() != null ? signal.getTargetDeviceId() : "broadcast");
            rabbitTemplate.convertAndSend(AirVaultRabbitConfig.AIRVAULT_EXCHANGE, routingKey, signal);
            log.debug("[AirVault RabbitMQ] 📨 Published persistent sync event: type={}, sender={}, target={}, msgId={}",
                    signal.getSignalType(), signal.getSenderDeviceId(), signal.getTargetDeviceId(), signal.getId());
        } catch (Exception ex) {
            log.debug("[AirVault RabbitMQ] ⚠️ Failed to publish to RabbitMQ, relying on in-memory/Redis fallback: {}", ex.getMessage());
        }
    }
}
