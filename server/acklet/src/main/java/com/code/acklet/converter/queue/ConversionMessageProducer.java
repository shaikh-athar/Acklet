package com.code.acklet.converter.queue;

import com.code.acklet.converter.exception.ConversionException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

import static com.code.acklet.converter.queue.ConverterQueueConstants.EXCHANGE_CONVERT;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversionMessageProducer {

    private final RabbitTemplate rabbitTemplate;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.amqp.rabbit.core.RabbitAdmin rabbitAdmin;

    /**
     * Inspects current message count in a specified queue.
     */
    public int getQueueDepth(String queueName) {
        if (rabbitAdmin == null) {
            return 0;
        }
        try {
            java.util.Properties props = rabbitAdmin.getQueueProperties(queueName);
            if (props != null && props.containsKey(org.springframework.amqp.rabbit.core.RabbitAdmin.QUEUE_MESSAGE_COUNT)) {
                return (Integer) props.get(org.springframework.amqp.rabbit.core.RabbitAdmin.QUEUE_MESSAGE_COUNT);
            }
        } catch (Exception e) {
            log.warn("Could not query queue depth for {}: {}", queueName, e.getMessage());
        }
        return 0;
    }

    /**
     * Publishes a conversion task with persistent delivery and synchronous publisher confirmation.
     * Returns true if the broker confirmed storage, false otherwise.
     */
    public boolean publishTask(ConversionTaskMessage taskMessage) {
        String queue = taskMessage.getQueue();
        if (queue == null || queue.isBlank()) {
            queue = ConverterQueueConstants.QUEUE_OFFICE;
        }

        CorrelationData correlationData = new CorrelationData(taskMessage.getJobId() + ":" + taskMessage.getFileId());

        try {
            rabbitTemplate.convertAndSend(
                    EXCHANGE_CONVERT,
                    queue,
                    taskMessage,
                    msg -> {
                        msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                        msg.getMessageProperties().setHeader("x-retry-count", taskMessage.getAttempt() - 1);
                        return msg;
                    },
                    correlationData
                );

            // Wait for publisher confirm
            CorrelationData.Confirm confirm = correlationData.getFuture().get(5, TimeUnit.SECONDS);
            if (confirm != null && confirm.isAck()) {
                log.info("Broker confirmed receipt of conversion task for file {} in job {}", taskMessage.getFileId(), taskMessage.getJobId());
                return true;
            } else {
                log.error("Broker NACKed task for file {} in job {}: {}", taskMessage.getFileId(), taskMessage.getJobId(), confirm != null ? confirm.getReason() : "unknown");
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to publish task to RabbitMQ for file {}: {}", taskMessage.getFileId(), e.getMessage());
            return false;
        }
    }

    /**
     * Publishes a message to retry exchange or dead-letter queue.
     */
    public void routeToRetry(ConversionTaskMessage taskMessage, String retryQueue) {
        log.info("Routing task {} to retry queue {}", taskMessage.getFileId(), retryQueue);
        rabbitTemplate.convertAndSend(
                ConverterQueueConstants.EXCHANGE_RETRY,
                retryQueue,
                taskMessage,
                msg -> {
                    msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    msg.getMessageProperties().setHeader("x-retry-count", taskMessage.getAttempt());
                    return msg;
                }
        );
    }

    public void routeToDlq(ConversionTaskMessage taskMessage) {
        log.warn("Routing unrecoverable task {} (job {}) to DLQ", taskMessage.getFileId(), taskMessage.getJobId());
        rabbitTemplate.convertAndSend(
                EXCHANGE_CONVERT,
                ConverterQueueConstants.QUEUE_DLQ,
                taskMessage,
                msg -> {
                    msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    return msg;
                }
        );
    }
}
