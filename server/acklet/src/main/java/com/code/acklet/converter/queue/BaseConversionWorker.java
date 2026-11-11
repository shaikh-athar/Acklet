package com.code.acklet.converter.queue;

import com.code.acklet.converter.ConversionStatus;
import com.code.acklet.converter.FileConverterJobService;
import com.code.acklet.converter.FileJobItem;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class BaseConversionWorker {

    private final FileConverterJobService jobService;
    private final ConversionMessageProducer producer;

    public void processTask(ConversionTaskMessage message, Channel channel, long deliveryTag) throws IOException {
        String jobId = message.getJobId();
        String fileId = message.getFileId();

        log.info("Worker received conversion task: job={}, file={}, attempt={}, queue={}",
                jobId, fileId, message.getAttempt(), message.getQueue());

        // 1. Idempotency Check: if item is already DONE, ack and skip
        FileJobItem item = jobService.getFileItem(jobId, fileId);
        if (item != null && (item.getStatus() == ConversionStatus.DONE || item.getStatus() == ConversionStatus.COMPLETED)) {
            log.info("Idempotent skip: task for file {} in job {} is already complete.", fileId, jobId);
            channel.basicAck(deliveryTag, false);
            return;
        }

        try {
            // 2. Execute conversion
            jobService.processFileTask(jobId, fileId, message.getOptions());

            // 3. Output written & job row is DONE -> ack
            channel.basicAck(deliveryTag, false);
            log.info("Successfully converted and acknowledged task: job={}, file={}", jobId, fileId);

        } catch (Exception e) {
            String errorCode = resolveErrorCode(e);
            log.error("Conversion failed for file {} (job {}) with code {}: {}", fileId, jobId, errorCode, e.getMessage());

            if (ConverterErrorMapper.isPermanent(errorCode)) {
                // Permanent failure: no retry, send to DLQ
                jobService.markFileFailed(jobId, fileId, errorCode, ConverterErrorMapper.toUserMessage(errorCode));
                producer.routeToDlq(message);
                channel.basicAck(deliveryTag, false);
            } else {
                // Retryable error: retry with exponential backoff up to 3 times
                if (message.getAttempt() < ConverterQueueConstants.MAX_RETRIES) {
                    String retryQueue = selectRetryQueue(message.getAttempt());
                    message.setAttempt(message.getAttempt() + 1);
                    jobService.recordFileAttempt(jobId, fileId, message.getAttempt(), errorCode);
                    producer.routeToRetry(message, retryQueue);
                    channel.basicAck(deliveryTag, false);
                } else {
                    // Retries exhausted
                    log.warn("Exhausted retries ({}/{}) for file {} in job {}", message.getAttempt(), ConverterQueueConstants.MAX_RETRIES, fileId, jobId);
                    jobService.markFileFailed(jobId, fileId, errorCode, ConverterErrorMapper.toUserMessage(errorCode));
                    producer.routeToDlq(message);
                    channel.basicAck(deliveryTag, false);
                }
            }
        }
    }

    private String selectRetryQueue(int attempt) {
        return switch (attempt) {
            case 1 -> ConverterQueueConstants.QUEUE_RETRY_5S;
            case 2 -> ConverterQueueConstants.QUEUE_RETRY_30S;
            case 3 -> ConverterQueueConstants.QUEUE_RETRY_120S;
            default -> ConverterQueueConstants.QUEUE_RETRY_5S;
        };
    }

    private String resolveErrorCode(Exception e) {
        String msg = e.getMessage() != null ? e.getMessage().toUpperCase() : "";
        if (msg.contains("UNSUPPORTED") || e.getClass().getSimpleName().contains("Unsupported")) {
            return "UNSUPPORTED_PAIR";
        }
        if (msg.contains("CORRUPT") || msg.contains("INVALID FORMAT")) {
            return "CORRUPTED_FILE";
        }
        if (msg.contains("ENCRYPT") || msg.contains("PASSWORD")) {
            return "ENCRYPTED_FILE";
        }
        if (msg.contains("SIZE") || msg.contains("TOO LARGE")) {
            return "TOO_LARGE";
        }
        if (msg.contains("SIGNATURE")) {
            return "SIGNATURE_MISMATCH";
        }
        if (msg.contains("TIMEOUT") || e.getClass().getSimpleName().contains("Timeout")) {
            return "TIMEOUT";
        }
        if (msg.contains("BUSY")) {
            return "ENGINE_BUSY";
        }
        if (msg.contains("CRASH") || msg.contains("EXITED")) {
            return "ENGINE_CRASHED";
        }
        if (msg.contains("IO") || msg.contains("STORAGE")) {
            return "TEMP_IO";
        }
        return "ENGINE_CRASHED";
    }
}
