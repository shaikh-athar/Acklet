package com.code.acklet.converter.exception;

/**
 * Thrown when the LibreOffice conversion backend is not installed or unavailable.
 */
public class EngineUnavailableException extends ConversionException {

    public EngineUnavailableException(String message) {
        super(message);
    }

    public EngineUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}

