package com.code.acklet.converter;

import java.nio.file.Path;

/**
 * Abstraction layer for document transformation engines.
 * Hides concrete conversion libraries from callers and user interfaces.
 */
public interface FileConverterEngine {

    /**
     * Converts a source document file into the desired target format.
     */
    void convert(Path sourceFile, Path targetFile, String targetFormat, ConversionOptions options) throws Exception;

    /**
     * Checks if the underlying conversion runtime is healthy and ready.
     */
    boolean isAvailable();
}

