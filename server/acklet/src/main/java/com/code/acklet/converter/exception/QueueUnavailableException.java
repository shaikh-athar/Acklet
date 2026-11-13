package com.code.acklet.converter.exception;

/**
 * Thrown when the message broker queue is unreachable or rejects publisher confirmation.
 */
public class QueueUnavailableException extends ConversionException {

    private final String code;

    public QueueUnavailableException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

