package com.code.acklet.converter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

/**
 * Request payload for converting a document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionRequest {

    /**
     * The file payload to be converted.
     */
    private MultipartFile file;

    /**
     * Target output format extension (e.g., "pdf", "docx", "xlsx").
     */
    private String targetFormat;

    /**
     * Optional explicit flag to force asynchronous background execution.
     * When null, async is selected automatically if the file exceeds the configured threshold.
     */
    private Boolean async;
}

