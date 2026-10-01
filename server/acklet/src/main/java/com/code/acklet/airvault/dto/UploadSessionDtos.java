package com.code.acklet.airvault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.util.List;
import java.util.UUID;

public class UploadSessionDtos {

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class InitiateUploadRequest {
        @NotBlank
        private String fileId;

        @NotBlank
        private String fileName;

        private String category;

        @NotNull @Positive
        private Long declaredSize;

        @NotNull @Positive
        private Integer chunkSize;

        @NotNull @Positive
        private Integer totalChunks;

        private String senderDeviceId;
        private String senderDeviceName;
        private String previewUrl;
        private String batchId;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BatchFileStatusDto {
        private String fileId;
        private String fileName;
        private String category;
        private long byteSize;
        private String status; // PENDING, UPLOADING, COMPLETED, FAILED
        private double progressPercent;
        private String previewUrl;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BatchStatusResponse {
        private String batchId;
        private String clipboardId;
        private int totalFiles;
        private int completedFiles;
        private int failedFiles;
        private long totalBytes;
        private long receivedBytes;
        private double aggregateProgressPercent;
        private String status; // PENDING, UPLOADING, COMPLETED, PARTIAL_FAILURE, FAILED
        private List<BatchFileStatusDto> files;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class InitiateUploadResponse {
        private UUID uploadSessionId;
        private String fileId;
        private String fileName;
        private Long declaredSize;
        private Long currentClipboardBytes;
        private Long remainingCapBytes;
        private String status;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChunkUploadResponse {
        private UUID uploadSessionId;
        private String fileId;
        private int chunkIndex;
        private int totalChunks;
        private int chunksReceived;
        private long receivedBytes;
        private double progressPercent;
        private String status;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UploadSessionStatusResponse {
        private UUID uploadSessionId;
        private String fileId;
        private String fileName;
        private String status;
        private int totalChunks;
        private int chunksReceived;
        private List<Integer> missingChunkIndices;
        private long receivedBytes;
        private double progressPercent;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CompleteUploadRequest {
        private String checksum;
        private String previewUrl;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CompleteUploadResponse {
        private UUID uploadSessionId;
        private String fileId;
        private String fileName;
        private String category;
        private long finalByteSize;
        private String checksum;
        private String status;
        private String previewUrl;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClipboardUsageResponse {
        private String clipboardId;
        private long totalBytes;
        private long maxCapBytes;
        private double usedPercent;
        private long remainingBytes;
        private int totalFilesCount;
    }
}
