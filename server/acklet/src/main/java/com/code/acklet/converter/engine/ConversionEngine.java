package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import java.nio.file.Path;

/**
 * Common abstraction for all document, image, and structured data conversion engines.
 */
public interface ConversionEngine {

    String getName();

    boolean supports(String inputType, String outputType);

    void convert(Path source, Path target, String inExt, String outExt, ConversionOptions options, ProgressListener listener) throws Exception;

    default boolean isAvailable() {
        return true;
    }
}

