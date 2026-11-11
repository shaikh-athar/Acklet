package com.code.acklet.converter;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Result DTO containing the conversion status, metadata, and download link.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConversionResult {

    private String jobId;
    private String originalFileName;
    private String sanitizedFileName;
    private String sourceFormat;
    private String targetFormat;
    private ConversionStatus status;
    private String downloadUrl;
    private Long sourceSizeBytes;
    private Long convertedSizeBytes;
    private Long durationMs;
    private String errorMessage;
    private Instant createdAt;
    private Instant completedAt;
}

