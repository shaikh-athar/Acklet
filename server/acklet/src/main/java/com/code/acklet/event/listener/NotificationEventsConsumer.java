package com.code.acklet.event.listener;

import com.code.acklet.event.config.RabbitMqConfig;
import com.code.acklet.event.dto.NotificationEventMessage;
import com.code.acklet.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ Listener consuming notification events and creating in-app notification records.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventsConsumer {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMqConfig.NOTIFICATIONS_QUEUE)
    public void handleNotification(NotificationEventMessage message) {
        log.info("Received RabbitMQ message [notification.create] for user: {}", message.getUserId());
        try {
            notificationService.createNotification(
                    message.getUserId(),
                    message.getTitle(),
                    message.getContent(),
                    message.getType() != null ? message.getType() : "SYSTEM"
            );
        } catch (Exception e) {
            log.error("Failed to process notification RabbitMQ message for user {}: {}", message.getUserId(), e.getMessage(), e);
            throw e;
        }
    }
}
