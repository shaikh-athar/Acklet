package com.code.acklet.github.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/** GitHub /user API response. */
@Data
public class GitHubUserProfileDto {
    private Long id;
    private String login;
    private String name;
    private String email;
    @JsonProperty("avatar_url")
    private String avatarUrl;
    @JsonProperty("html_url")
    private String htmlUrl;
    @JsonProperty("public_repos")
    private int publicRepos;
    @JsonProperty("total_private_repos")
    private int totalPrivateRepos;
}
