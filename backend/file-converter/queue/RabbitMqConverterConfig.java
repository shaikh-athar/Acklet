package com.code.acklet.converter.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

import static com.code.acklet.converter.queue.ConverterQueueConstants.*;

@Configuration
@ConditionalOnClass(RabbitTemplate.class)
public class RabbitMqConverterConfig {

    @Bean
    public DirectExchange convertExchange() {
        return new DirectExchange(EXCHANGE_CONVERT, true, false);
    }

    @Bean
    public DirectExchange retryExchange() {
        return new DirectExchange(EXCHANGE_RETRY, true, false);
    }

    @Bean
    public DirectExchange dlqExchange() {
        return new DirectExchange(EXCHANGE_DLQ, true, false);
    }

    // 1. Core Durable Queues
    @Bean
    public Queue officeQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-dead-letter-exchange", EXCHANGE_RETRY);
        args.put("x-dead-letter-routing-key", QUEUE_RETRY_5S);
        return new Queue(QUEUE_OFFICE, true, false, false, args);
    }

    @Bean
    public Queue pdfQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-dead-letter-exchange", EXCHANGE_RETRY);
        args.put("x-dead-letter-routing-key", QUEUE_RETRY_5S);
        return new Queue(QUEUE_PDF, true, false, false, args);
    }

    @Bean
    public Queue imageQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-dead-letter-exchange", EXCHANGE_RETRY);
        args.put("x-dead-letter-routing-key", QUEUE_RETRY_5S);
        return new Queue(QUEUE_IMAGE, true, false, false, args);
    }

    @Bean
    public Queue textQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-dead-letter-exchange", EXCHANGE_RETRY);
        args.put("x-dead-letter-routing-key", QUEUE_RETRY_5S);
        return new Queue(QUEUE_TEXT, true, false, false, args);
    }

    // 2. Retry TTL Queues (Dead-letters back to fc.convert)
    @Bean
    public Queue retry5sQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-message-ttl", 5000);
        args.put("x-dead-letter-exchange", EXCHANGE_CONVERT);
        return new Queue(QUEUE_RETRY_5S, true, false, false, args);
    }

    @Bean
    public Queue retry30sQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-message-ttl", 30000);
        args.put("x-dead-letter-exchange", EXCHANGE_CONVERT);
        return new Queue(QUEUE_RETRY_30S, true, false, false, args);
    }

    @Bean
    public Queue retry120sQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-message-ttl", 120000);
        args.put("x-dead-letter-exchange", EXCHANGE_CONVERT);
        return new Queue(QUEUE_RETRY_120S, true, false, false, args);
    }

    // 3. Dead Letter Queue
    @Bean
    public Queue dlqQueue() {
        return new Queue(QUEUE_DLQ, true, false, false);
    }

    // Bindings
    @Bean
    public Binding bindingOffice(Queue officeQueue, DirectExchange convertExchange) {
        return BindingBuilder.bind(officeQueue).to(convertExchange).with(QUEUE_OFFICE);
    }

    @Bean
    public Binding bindingPdf(Queue pdfQueue, DirectExchange convertExchange) {
        return BindingBuilder.bind(pdfQueue).to(convertExchange).with(QUEUE_PDF);
    }

    @Bean
    public Binding bindingImage(Queue imageQueue, DirectExchange convertExchange) {
        return BindingBuilder.bind(imageQueue).to(convertExchange).with(QUEUE_IMAGE);
    }

    @Bean
    public Binding bindingText(Queue textQueue, DirectExchange convertExchange) {
        return BindingBuilder.bind(textQueue).to(convertExchange).with(QUEUE_TEXT);
    }

    @Bean
    public Binding bindingRetry5s(Queue retry5sQueue, DirectExchange retryExchange) {
        return BindingBuilder.bind(retry5sQueue).to(retryExchange).with(QUEUE_RETRY_5S);
    }

    @Bean
    public Binding bindingRetry30s(Queue retry30sQueue, DirectExchange retryExchange) {
        return BindingBuilder.bind(retry30sQueue).to(retryExchange).with(QUEUE_RETRY_30S);
    }

    @Bean
    public Binding bindingRetry120s(Queue retry120sQueue, DirectExchange retryExchange) {
        return BindingBuilder.bind(retry120sQueue).to(retryExchange).with(QUEUE_RETRY_120S);
    }

    @Bean
    public Binding bindingDlq(Queue dlqQueue, DirectExchange convertExchange) {
        return BindingBuilder.bind(dlqQueue).to(convertExchange).with(QUEUE_DLQ);
    }

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(MessageConverter.class)
    public MessageConverter converterJsonMessageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    public RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
        RabbitAdmin admin = new RabbitAdmin(connectionFactory);
        admin.setAutoStartup(true);
        return admin;
    }
}
