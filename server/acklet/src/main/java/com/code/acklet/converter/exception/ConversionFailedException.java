package com.code.acklet.converter.exception;

/**
 * Thrown when document conversion fails during execution by the underlying office engine.
 */
public class ConversionFailedException extends ConversionException {

    public ConversionFailedException(String message) {
        super(message);
    }

    public ConversionFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}

