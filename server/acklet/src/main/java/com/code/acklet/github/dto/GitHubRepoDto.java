package com.code.acklet.github.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.Instant;

/** Single repository entry from GitHub /user/repos or /repos/{owner}/{repo}. */
@Data
public class GitHubRepoDto {

    private Long id;
    private String name;

    @JsonProperty("full_name")
    private String fullName;

    private boolean fork;
    private boolean archived;

    @JsonProperty("private")
    private boolean privateRepo;

    private String description;

    @JsonProperty("html_url")
    private String htmlUrl;

    @JsonProperty("default_branch")
    private String defaultBranch;

    private String language;

    @JsonProperty("stargazers_count")
    private int stars;

    @JsonProperty("forks_count")
    private int forks;

    @JsonProperty("open_issues_count")
    private int openIssues;

    @JsonProperty("size")
    private int sizeKb;

    @JsonProperty("updated_at")
    private Instant updatedAt;

    @JsonProperty("pushed_at")
    private Instant pushedAt;

    @JsonProperty("owner")
    private OwnerDto owner;

    @Data
    public static class OwnerDto {
        private String login;
        @JsonProperty("avatar_url")
        private String avatarUrl;
        private String type;   // "User" or "Organization"
    }
}
