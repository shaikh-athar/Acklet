package com.code.acklet.converter.exception;

/**
 * Thrown when an uploaded file fails validation (e.g., empty, exceeds size limit, malicious filename).
 */
public class InvalidFileException extends ConversionException {

    public InvalidFileException(String message) {
        super(message);
    }
}

