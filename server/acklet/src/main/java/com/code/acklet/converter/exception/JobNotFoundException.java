package com.code.acklet.converter.exception;

/**
 * Thrown when a queried conversion job ID is not found or has expired.
 */
public class JobNotFoundException extends ConversionException {

    public JobNotFoundException(String message) {
        super(message);
    }
}

