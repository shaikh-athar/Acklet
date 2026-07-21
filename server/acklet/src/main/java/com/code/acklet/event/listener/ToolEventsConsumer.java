package com.code.acklet.event.listener;

import com.code.acklet.ai.service.AiOrchestrationService;
import com.code.acklet.event.config.RabbitMqConfig;
import com.code.acklet.event.dto.ToolPublishedEventMessage;
import com.code.acklet.event.dto.ToolReviewedEventMessage;
import com.code.acklet.event.dto.ToolUpdatedEventMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ Listener consuming tool lifecycle events from RabbitMQ queues.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ToolEventsConsumer {

    private final AiOrchestrationService orchestrationService;

    @RabbitListener(queues = RabbitMqConfig.TOOL_PUBLISHED_QUEUE)
    public void handleToolPublished(ToolPublishedEventMessage message) {
        log.info("Received RabbitMQ message [tool.published] for tool: {} ({})", message.getSlug(), message.getToolId());
        try {
            orchestrationService.enrich(message.getToolId());
        } catch (Exception e) {
            log.error("Failed to process tool.published RabbitMQ message for tool {}: {}", message.getSlug(), e.getMessage(), e);
            throw e; // Triggers RabbitMQ retry / Dead-Letter Queue
        }
    }

    @RabbitListener(queues = RabbitMqConfig.TOOL_UPDATED_QUEUE)
    public void handleToolUpdated(ToolUpdatedEventMessage message) {
        log.info("Received RabbitMQ message [tool.updated] for tool: {}", message.getSlug());
    }

    @RabbitListener(queues = RabbitMqConfig.TOOL_REVIEWED_QUEUE)
    public void handleToolReviewed(ToolReviewedEventMessage message) {
        log.info("Received RabbitMQ message [tool.reviewed] for tool: {} (rating: {})", message.getToolSlug(), message.getRating());
    }
}
