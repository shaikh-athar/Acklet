package com.code.acklet.converter.exception;

/**
 * Thrown when document conversion exceeds the configured timeout duration.
 */
public class ConversionTimeoutException extends ConversionException {

    public ConversionTimeoutException(String message) {
        super(message);
    }

    public ConversionTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}

