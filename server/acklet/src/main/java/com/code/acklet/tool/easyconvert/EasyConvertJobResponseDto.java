package com.code.acklet.tool.easyconvert;

import java.time.Instant;

public class EasyConvertJobResponseDto {
    private String jobId;
    private String originalFilename;
    private String targetFormat;
    private long inputSize;
    private long outputSize;
    private EasyConvertJobStatus status;
    private int progressPercent;
    private String stageMessage;
    private String downloadUrl;
    private String errorMessage;
    private Instant createdAt;
    private Instant completedAt;

    public EasyConvertJobResponseDto() {}

    public EasyConvertJobResponseDto(String jobId, String originalFilename, String targetFormat, long inputSize,
                                     long outputSize, EasyConvertJobStatus status, int progressPercent,
                                     String stageMessage, String downloadUrl, String errorMessage,
                                     Instant createdAt, Instant completedAt) {
        this.jobId = jobId;
        this.originalFilename = originalFilename;
        this.targetFormat = targetFormat;
        this.inputSize = inputSize;
        this.outputSize = outputSize;
        this.status = status;
        this.progressPercent = progressPercent;
        this.stageMessage = stageMessage;
        this.downloadUrl = downloadUrl;
        this.errorMessage = errorMessage;
        this.createdAt = createdAt;
        this.completedAt = completedAt;
    }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    public String getTargetFormat() { return targetFormat; }
    public void setTargetFormat(String targetFormat) { this.targetFormat = targetFormat; }

    public long getInputSize() { return inputSize; }
    public void setInputSize(long inputSize) { this.inputSize = inputSize; }

    public long getOutputSize() { return outputSize; }
    public void setOutputSize(long outputSize) { this.outputSize = outputSize; }

    public EasyConvertJobStatus getStatus() { return status; }
    public void setStatus(EasyConvertJobStatus status) { this.status = status; }

    public int getProgressPercent() { return progressPercent; }
    public void setProgressPercent(int progressPercent) { this.progressPercent = progressPercent; }

    public String getStageMessage() { return stageMessage; }
    public void setStageMessage(String stageMessage) { this.stageMessage = stageMessage; }

    public String getDownloadUrl() { return downloadUrl; }
    public void setDownloadUrl(String downloadUrl) { this.downloadUrl = downloadUrl; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
