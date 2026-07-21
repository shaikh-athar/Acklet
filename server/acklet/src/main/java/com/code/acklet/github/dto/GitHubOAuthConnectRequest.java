package com.code.acklet.github.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class GitHubOAuthConnectRequest {

    @NotBlank(message = "OAuth code is required")
    private String code;

    /** Tool ID to link this GitHub repo to */
    private UUID toolId;

    /** Full GitHub repo name e.g. "acklet/acklet" */
    private String githubRepo;
}
