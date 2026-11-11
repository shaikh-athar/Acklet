package com.code.acklet.converter.queue;

/**
 * Direct exchange names and durable queue definitions for RabbitMQ conversion pipeline.
 */
public final class ConverterQueueConstants {

    private ConverterQueueConstants() {}

    public static final String EXCHANGE_CONVERT = "fc.convert";
    public static final String EXCHANGE_RETRY = "fc.retry";
    public static final String EXCHANGE_DLQ = "fc.dlq.exchange";

    public static final String QUEUE_OFFICE = "fc.convert.office";
    public static final String QUEUE_PDF = "fc.convert.pdf";
    public static final String QUEUE_IMAGE = "fc.convert.image";
    public static final String QUEUE_TEXT = "fc.convert.text";

    public static final String QUEUE_RETRY_5S = "fc.retry.5s";
    public static final String QUEUE_RETRY_30S = "fc.retry.30s";
    public static final String QUEUE_RETRY_120S = "fc.retry.120s";

    public static final String QUEUE_DLQ = "fc.dlq";

    public static final int MAX_RETRIES = 3;
}

