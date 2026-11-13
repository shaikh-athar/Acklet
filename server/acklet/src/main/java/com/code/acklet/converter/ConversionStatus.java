package com.code.acklet.converter;

/**
 * Lifecycle states of a document conversion operation.
 */
public enum ConversionStatus {
    PENDING,
    QUEUED,
    PROCESSING,
    COMPLETED,
    DONE,
    FAILED,
    TIMED_OUT
}
