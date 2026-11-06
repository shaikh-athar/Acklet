package com.code.acklet.converter;

import lombok.Builder;
import lombok.Data;

import java.nio.file.Path;
import java.time.Instant;

/**
 * Internal state and storage metadata for an active or completed conversion job.
 */
@Data
@Builder
public class ConversionJob {

    private String id;
    private String originalFileName;
    private String sanitizedBaseName;
    private ConversionFormat sourceFormat;
    private ConversionFormat targetFormat;
    private Path jobDirectory;
    private Path sourcePath;
    private Path targetPath;
    private ConversionStatus status;
    private long sourceSizeBytes;
    private long convertedSizeBytes;
    private String errorMessage;
    private Instant createdAt;
    private Instant completedAt;

    public Long getDurationMs() {
        if (createdAt != null && completedAt != null) {
            return completedAt.toEpochMilli() - createdAt.toEpochMilli();
        }
        return null;
    }

    public ConversionResult toResult(String downloadBaseUrl) {
        String outputFileName = sanitizedBaseName + "." + targetFormat.getExtension();
        String downloadUrl = (status == ConversionStatus.COMPLETED)
                ? downloadBaseUrl + "/" + id
                : null;

        return ConversionResult.builder()
                .jobId(id)
                .originalFileName(originalFileName)
                .sanitizedFileName(outputFileName)
                .sourceFormat(sourceFormat.getExtension())
                .targetFormat(targetFormat.getExtension())
                .status(status)
                .downloadUrl(downloadUrl)
                .sourceSizeBytes(sourceSizeBytes)
                .convertedSizeBytes(convertedSizeBytes > 0 ? convertedSizeBytes : null)
                .durationMs(getDurationMs())
                .errorMessage(errorMessage)
                .createdAt(createdAt)
                .completedAt(completedAt)
                .build();
    }
}

