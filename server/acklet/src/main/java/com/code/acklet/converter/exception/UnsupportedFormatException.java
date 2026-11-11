package com.code.acklet.converter.exception;

import lombok.Getter;
import java.util.Collections;
import java.util.List;

/**
 * Thrown when an input or output format is not supported by the converter engine.
 */
@Getter
public class UnsupportedFormatException extends ConversionException {

    private final String inputFormat;
    private final String targetFormat;
    private final String fileId;
    private final List<String> supportedTargets;

    public UnsupportedFormatException(String message) {
        super(message);
        this.inputFormat = null;
        this.targetFormat = null;
        this.fileId = null;
        this.supportedTargets = Collections.emptyList();
    }

    public UnsupportedFormatException(String inputFormat, String targetFormat, String fileId, List<String> supportedTargets) {
        super(String.format("Conversion from '%s' to '%s' is not supported.", inputFormat, targetFormat));
        this.inputFormat = inputFormat;
        this.targetFormat = targetFormat;
        this.fileId = fileId;
        this.supportedTargets = supportedTargets != null ? supportedTargets : Collections.emptyList();
    }

    public String getUserMessage() {
        if (inputFormat != null && !inputFormat.isBlank()) {
            return String.format("This format is not available for %s files yet. Choose another format.", inputFormat.toUpperCase());
        }
        return "This format is not available for this file yet. Choose another format.";
    }
}
