package com.code.acklet.airvault.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AirVaultRabbitConfig {

    public static final String AIRVAULT_EXCHANGE = "airvault.exchange";
    public static final String AIRVAULT_DEAD_LETTER_EXCHANGE = "airvault.dlx";

    public static final String AIRVAULT_SYNC_QUEUE = "airvault.sync.queue";
    public static final String AIRVAULT_DEAD_LETTER_QUEUE = "airvault.dlq";

    public static final String SYNC_ROUTING_KEY = "airvault.sync.#";
    public static final String DLQ_ROUTING_KEY = "airvault.dlq";

    @Bean
    public TopicExchange airvaultExchange() {
        return ExchangeBuilder.topicExchange(AIRVAULT_EXCHANGE)
                .durable(true)
                .build();
    }

    @Bean
    public DirectExchange airvaultDeadLetterExchange() {
        return ExchangeBuilder.directExchange(AIRVAULT_DEAD_LETTER_EXCHANGE)
                .durable(true)
                .build();
    }

    @Bean
    public Queue airvaultSyncQueue() {
        return QueueBuilder.durable(AIRVAULT_SYNC_QUEUE)
                .withArgument("x-dead-letter-exchange", AIRVAULT_DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", DLQ_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue airvaultDeadLetterQueue() {
        return QueueBuilder.durable(AIRVAULT_DEAD_LETTER_QUEUE)
                .build();
    }

    @Bean
    public Binding bindingSyncQueue(Queue airvaultSyncQueue, TopicExchange airvaultExchange) {
        return BindingBuilder.bind(airvaultSyncQueue)
                .to(airvaultExchange)
                .with(SYNC_ROUTING_KEY);
    }

    @Bean
    public Binding bindingDeadLetterQueue(Queue airvaultDeadLetterQueue, DirectExchange airvaultDeadLetterExchange) {
        return BindingBuilder.bind(airvaultDeadLetterQueue)
                .to(airvaultDeadLetterExchange)
                .with(DLQ_ROUTING_KEY);
    }

    @Bean
    public Queue airvaultNodeBroadcastQueue() {
        // Unique exclusive autodelete queue per node instance for horizontal cross-node fanout
        return new AnonymousQueue();
    }

    @Bean
    public Binding bindingNodeBroadcastQueue(Queue airvaultNodeBroadcastQueue, TopicExchange airvaultExchange) {
        return BindingBuilder.bind(airvaultNodeBroadcastQueue)
                .to(airvaultExchange)
                .with(SYNC_ROUTING_KEY);
    }
}


