package com.code.acklet.converter;

import com.code.acklet.converter.generator.model.PdfDocumentModel;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a single file within a batch conversion job.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileJobItem {

    private String fileId;
    private String originalFileName;
    private String sanitizedFileName;
    private String sourceFormat;
    private String targetFormat;
    private long sizeBytes;
    private long convertedSizeBytes;

    @Builder.Default
    private ConversionStatus status = ConversionStatus.PENDING;

    @Builder.Default
    private int progress = 0;

    @Builder.Default
    private int attempts = 1;

    private String errorCode;
    private String errorMessage;
    private String downloadUrl;
    private String outputReference;
    private String tier;    // "stable" | "beta"
    private String runtime; // "server" | "browser"
    private StructureReport structureReport;

    private String fidelityLevel;
    @Builder.Default
    private List<String> fidelityReasons = new ArrayList<>();

    @JsonIgnore
    private PdfDocumentModel documentModel;

    @JsonIgnore
    private Path sourcePath;

    @JsonIgnore
    private Path outputPath;
}
