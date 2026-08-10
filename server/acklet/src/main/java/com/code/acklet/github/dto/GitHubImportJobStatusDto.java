package com.code.acklet.github.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/** Status response for a github import job — polled by the frontend. */
@Data
@Builder
public class GitHubImportJobStatusDto {
    private UUID jobId;
    private String status;       // PENDING | CLONING | ANALYZING | AI_GENERATION | DONE | FAILED
    private String currentStep;
    private String errorMessage;
    private UUID toolId;         // non-null once DONE
    private UUID repositoryId;   // non-null once imported/created
    private Instant createdAt;
    private Instant updatedAt;
    /** Accumulated build + runtime logs from the active deployment — streamed to the UI terminal. */
    private String buildLogs;
    /** Tool slug for deep-linking to the tool dashboard after deployment completes. */
    private String toolSlug;
}
