package com.code.acklet.github.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/** Response after triggering a repo import. */
@Data
@Builder
public class GitHubImportResponse {
    private UUID jobId;
    private String repoFullName;
    private String status;
}
