package com.code.acklet.event.publisher;

import com.code.acklet.event.config.RabbitMqConfig;
import com.code.acklet.event.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

/**
 * Publisher service for dispatching domain event messages to RabbitMQ exchanges.
 *
 * Implements graceful fallback handling so local dev without a running RabbitMQ container
 * logs a warning instead of aborting the user HTTP request.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RabbitMqEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishToolPublished(ToolPublishedEventMessage message) {
        log.info("Publishing tool.published event to RabbitMQ for tool: {}", message.getSlug());
        send(RabbitMqConfig.TOOLS_EXCHANGE, RabbitMqConfig.ROUTING_KEY_TOOL_PUBLISHED, message);
    }

    public void publishToolUpdated(ToolUpdatedEventMessage message) {
        log.info("Publishing tool.updated event to RabbitMQ for tool: {}", message.getSlug());
        send(RabbitMqConfig.TOOLS_EXCHANGE, RabbitMqConfig.ROUTING_KEY_TOOL_UPDATED, message);
    }

    public void publishToolReviewed(ToolReviewedEventMessage message) {
        log.info("Publishing tool.reviewed event to RabbitMQ for tool: {}", message.getToolSlug());
        send(RabbitMqConfig.TOOLS_EXCHANGE, RabbitMqConfig.ROUTING_KEY_TOOL_REVIEWED, message);
    }

    public void publishNotification(NotificationEventMessage message) {
        log.info("Publishing notification.create event to RabbitMQ for user: {}", message.getUserId());
        send(RabbitMqConfig.NOTIFICATIONS_EXCHANGE, RabbitMqConfig.ROUTING_KEY_NOTIFICATION, message);
    }

    private void send(String exchange, String routingKey, Object message) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, message);
        } catch (Exception e) {
            log.warn("RabbitMQ server unreachable or failed to publish event to [{}:{}]: {}",
                    exchange, routingKey, e.getMessage());
        }
    }
}
