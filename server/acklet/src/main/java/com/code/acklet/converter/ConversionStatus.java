package com.code.acklet.converter;

/**
 * Lifecycle states of a document conversion operation.
 */
public enum ConversionStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED,
    TIMED_OUT
}

