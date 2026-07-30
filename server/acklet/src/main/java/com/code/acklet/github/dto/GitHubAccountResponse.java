package com.code.acklet.github.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/** Response sent to frontend after connecting a GitHub account. */
@Data
@Builder
public class GitHubAccountResponse {
    private UUID id;
    private String githubLogin;
    private String avatarUrl;
    private String scopes;
    private Instant connectedAt;
}
