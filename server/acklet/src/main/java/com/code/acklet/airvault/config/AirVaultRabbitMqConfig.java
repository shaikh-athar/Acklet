package com.code.acklet.airvault.config;

import com.code.acklet.event.config.RabbitMqConfig;
import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AirVaultRabbitMqConfig {

    public static final String AIRVAULT_UPLOAD_EXCHANGE = "acklet.airvault.upload.exchange";
    public static final String AIRVAULT_UPLOAD_COMPLETED_QUEUE = "acklet.airvault.upload.completed.queue";
    public static final String AIRVAULT_UPLOAD_DLQ = "acklet.airvault.upload.dlq";
    public static final String ROUTING_KEY_UPLOAD_COMPLETED = "upload.completed";

    public static final String AIRVAULT_AUDIT_EXCHANGE = "acklet.airvault.audit.exchange";
    public static final String AIRVAULT_AUDIT_QUEUE = "acklet.airvault.audit.queue";
    public static final String AIRVAULT_AUDIT_DLQ = "acklet.airvault.audit.dlq";
    public static final String ROUTING_KEY_AUDIT_EVENT = "audit.event";

    // Operation-Based Sync Queue Infrastructure
    public static final String AIRVAULT_DOC_OPS_EXCHANGE = "acklet.airvault.doc.ops.exchange";
    public static final String AIRVAULT_DOC_OPS_QUEUE = "acklet.airvault.doc.ops.queue";
    public static final String AIRVAULT_DOC_OPS_DLQ = "acklet.airvault.doc.ops.dlq";
    public static final String ROUTING_KEY_DOC_OP = "doc.op";

    @Bean
    public TopicExchange airvaultUploadExchange() {
        return new TopicExchange(AIRVAULT_UPLOAD_EXCHANGE, true, false);
    }

    @Bean
    public Queue airvaultUploadCompletedQueue() {
        return QueueBuilder.durable(AIRVAULT_UPLOAD_COMPLETED_QUEUE)
                .withArgument("x-dead-letter-exchange", RabbitMqConfig.DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "airvault.upload.failed")
                .build();
    }

    @Bean
    public Queue airvaultUploadDlq() {
        return QueueBuilder.durable(AIRVAULT_UPLOAD_DLQ).build();
    }

    @Bean
    public Binding airvaultUploadCompletedBinding(Queue airvaultUploadCompletedQueue, TopicExchange airvaultUploadExchange) {
        return BindingBuilder.bind(airvaultUploadCompletedQueue)
                .to(airvaultUploadExchange)
        .with(ROUTING_KEY_UPLOAD_COMPLETED);
    }

    @Bean
    public Binding airvaultUploadDlqBinding(Queue airvaultUploadDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(airvaultUploadDlq)
                .to(deadLetterExchange)
                .with("airvault.upload.failed");
    }

    // --- Audit Queue Infrastructure ---

    @Bean
    public TopicExchange airvaultAuditExchange() {
        return new TopicExchange(AIRVAULT_AUDIT_EXCHANGE, true, false);
    }

    @Bean
    public Queue airvaultAuditQueue() {
        return QueueBuilder.durable(AIRVAULT_AUDIT_QUEUE)
                .withArgument("x-dead-letter-exchange", RabbitMqConfig.DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "airvault.audit.failed")
                .build();
    }

    @Bean
    public Queue airvaultAuditDlq() {
        return QueueBuilder.durable(AIRVAULT_AUDIT_DLQ).build();
    }

    @Bean
    public Binding airvaultAuditBinding(Queue airvaultAuditQueue, TopicExchange airvaultAuditExchange) {
        return BindingBuilder.bind(airvaultAuditQueue)
                .to(airvaultAuditExchange)
                .with(ROUTING_KEY_AUDIT_EVENT);
    }

    @Bean
    public Binding airvaultAuditDlqBinding(Queue airvaultAuditDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(airvaultAuditDlq)
                .to(deadLetterExchange)
                .with("airvault.audit.failed");
    }

    // --- Operation-Based Sync Queue Infrastructure ---

    @Bean
    public TopicExchange airvaultDocOpsExchange() {
        return new TopicExchange(AIRVAULT_DOC_OPS_EXCHANGE, true, false);
    }

    @Bean
    public Queue airvaultDocOpsQueue() {
        return QueueBuilder.durable(AIRVAULT_DOC_OPS_QUEUE)
                .withArgument("x-dead-letter-exchange", RabbitMqConfig.DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "airvault.doc.op.failed")
                .build();
    }

    @Bean
    public Queue airvaultDocOpsDlq() {
        return QueueBuilder.durable(AIRVAULT_DOC_OPS_DLQ).build();
    }

    @Bean
    public Binding airvaultDocOpsBinding(Queue airvaultDocOpsQueue, TopicExchange airvaultDocOpsExchange) {
        return BindingBuilder.bind(airvaultDocOpsQueue)
                .to(airvaultDocOpsExchange)
                .with(ROUTING_KEY_DOC_OP);
    }

    @Bean
    public Binding airvaultDocOpsDlqBinding(Queue airvaultDocOpsDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(airvaultDocOpsDlq)
                .to(deadLetterExchange)
                .with("airvault.doc.op.failed");
    }
}
