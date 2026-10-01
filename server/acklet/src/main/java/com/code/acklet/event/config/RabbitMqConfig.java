package com.code.acklet.event.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ Enterprise Topology & Event Bus Configuration.
 *
 * Exchanges:
 *  - acklet.tools.exchange (Topic)
 *  - acklet.ai.exchange (Topic)
 *  - acklet.notifications.exchange (Topic)
 *  - acklet.dlx (Direct Dead-Letter Exchange)
 *
 * Queues:
 *  - acklet.tools.published.queue
 *  - acklet.tools.updated.queue
 *  - acklet.tools.reviewed.queue
 *  - acklet.ai.enrichment.queue
 *  - acklet.notifications.queue
 *  - acklet.dlq (Dead Letter Queue)
 */
@Configuration
public class RabbitMqConfig {

    public static final String TOOLS_EXCHANGE         = "acklet.tools.exchange";
    public static final String AI_EXCHANGE            = "acklet.ai.exchange";
    public static final String NOTIFICATIONS_EXCHANGE = "acklet.notifications.exchange";
    public static final String DEAD_LETTER_EXCHANGE   = "acklet.dlx";

    public static final String TOOL_PUBLISHED_QUEUE   = "acklet.tools.published.queue";
    public static final String TOOL_UPDATED_QUEUE     = "acklet.tools.updated.queue";
    public static final String TOOL_REVIEWED_QUEUE    = "acklet.tools.reviewed.queue";
    public static final String AI_ENRICHMENT_QUEUE    = "acklet.ai.enrichment.queue";
    public static final String NOTIFICATIONS_QUEUE   = "acklet.notifications.queue";
    public static final String DEAD_LETTER_QUEUE      = "acklet.dlq";

    public static final String IMPORT_EXCHANGE        = "acklet.import.exchange";
    public static final String IMPORT_METADATA_QUEUE  = "acklet.import.metadata.queue";
    public static final String IMPORT_TREE_QUEUE      = "acklet.import.tree.queue";

    public static final String ROUTING_KEY_TOOL_PUBLISHED   = "tool.published";
    public static final String ROUTING_KEY_TOOL_UPDATED     = "tool.updated";
    public static final String ROUTING_KEY_TOOL_REVIEWED    = "tool.reviewed";
    public static final String ROUTING_KEY_AI_ENRICHMENT    = "ai.enrichment.requested";
    public static final String ROUTING_KEY_NOTIFICATION     = "notification.create";

    public static final String ROUTING_KEY_IMPORT_QUEUED            = "import.queued";
    public static final String ROUTING_KEY_IMPORT_METADATA_FETCHED  = "import.metadata.fetched";

    // ── Exchanges ────────────────────────────────────────────────────────────

    @Bean
    public TopicExchange toolsExchange() {
        return new TopicExchange(TOOLS_EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange aiExchange() {
        return new TopicExchange(AI_EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange notificationsExchange() {
        return new TopicExchange(NOTIFICATIONS_EXCHANGE, true, false);
    }

    @Bean
    public TopicExchange importExchange() {
        return new TopicExchange(IMPORT_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    // ── Queues with Dead-Letter Policy ────────────────────────────────────────

    @Bean
    public Queue toolPublishedQueue() {
        return QueueBuilder.durable(TOOL_PUBLISHED_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dead-letter")
                .build();
    }

    @Bean
    public Queue toolUpdatedQueue() {
        return QueueBuilder.durable(TOOL_UPDATED_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dead-letter")
                .build();
    }

    @Bean
    public Queue toolReviewedQueue() {
        return QueueBuilder.durable(TOOL_REVIEWED_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dead-letter")
                .build();
    }

    @Bean
    public Queue aiEnrichmentQueue() {
        return QueueBuilder.durable(AI_ENRICHMENT_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dead-letter")
                .build();
    }

    @Bean
    public Queue notificationsQueue() {
        return QueueBuilder.durable(NOTIFICATIONS_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dead-letter")
                .build();
    }

    @Bean
    public Queue importMetadataQueue() {
        return QueueBuilder.durable(IMPORT_METADATA_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dead-letter")
                .build();
    }

    @Bean
    public Queue importTreeQueue() {
        return QueueBuilder.durable(IMPORT_TREE_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "dead-letter")
                .build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DEAD_LETTER_QUEUE).build();
    }

    // ── Bindings ─────────────────────────────────────────────────────────────

    @Bean
    public Binding toolPublishedBinding() {
        return BindingBuilder.bind(toolPublishedQueue()).to(toolsExchange()).with(ROUTING_KEY_TOOL_PUBLISHED);
    }

    @Bean
    public Binding toolUpdatedBinding() {
        return BindingBuilder.bind(toolUpdatedQueue()).to(toolsExchange()).with(ROUTING_KEY_TOOL_UPDATED);
    }

    @Bean
    public Binding toolReviewedBinding() {
        return BindingBuilder.bind(toolReviewedQueue()).to(toolsExchange()).with(ROUTING_KEY_TOOL_REVIEWED);
    }

    @Bean
    public Binding aiEnrichmentBinding() {
        return BindingBuilder.bind(aiEnrichmentQueue()).to(aiExchange()).with(ROUTING_KEY_AI_ENRICHMENT);
    }

    @Bean
    public Binding notificationsBinding() {
        return BindingBuilder.bind(notificationsQueue()).to(notificationsExchange()).with(ROUTING_KEY_NOTIFICATION);
    }

    @Bean
    public Binding importMetadataBinding() {
        return BindingBuilder.bind(importMetadataQueue()).to(importExchange()).with(ROUTING_KEY_IMPORT_QUEUED);
    }

    @Bean
    public Binding importTreeBinding() {
        return BindingBuilder.bind(importTreeQueue()).to(importExchange()).with(ROUTING_KEY_IMPORT_METADATA_FETCHED);
    }

    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder.bind(deadLetterQueue()).to(deadLetterExchange()).with("dead-letter");
    }

    // ── JSON Converter & RabbitTemplate ──────────────────────────────────────

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jsonMessageConverter());
        rabbitTemplate.setReplyTimeout(3000L); // 3-second hard reply timeout to prevent caller threads from blocking indefinitely
        return rabbitTemplate;
    }
}
