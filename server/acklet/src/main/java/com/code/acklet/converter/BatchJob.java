package com.code.acklet.converter;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a multi-file batch document conversion job.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchJob {

    private String jobId;

    @Builder.Default
    private ConversionStatus status = ConversionStatus.PENDING;

    @Builder.Default
    private int progress = 0;

    @Builder.Default
    private List<FileJobItem> files = new ArrayList<>();

    @Builder.Default
    private ConversionOptions options = new ConversionOptions();

    private String zipDownloadUrl;

    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant completedAt;

    @JsonIgnore
    private Path directoryPath;

    @JsonIgnore
    private Path zipPath;
}

