package com.code.acklet.github.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubIntegrationResponse {
    private UUID id;
    private UUID toolId;
    private String toolSlug;
    private String githubUser;
    private String githubRepo;
    private Long githubRepoId;
    private String defaultBranch;
    private Instant lastSyncedAt;
    private Instant createdAt;
}
