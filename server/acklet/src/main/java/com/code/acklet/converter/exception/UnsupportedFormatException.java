package com.code.acklet.converter.exception;

/**
 * Thrown when an input or output format is not supported by the converter engine.
 */
public class UnsupportedFormatException extends ConversionException {

    public UnsupportedFormatException(String message) {
        super(message);
    }
}

