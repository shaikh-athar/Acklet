package com.code.acklet.github.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubRepoMetadata {
    private Long repoId;
    private String name;
    private String fullName; // e.g. "facebook/react"
    private String owner;
    private String description;
    private String htmlUrl;
    private String defaultBranch;
    private String license;
    private int stars;
    private int forks;
    private int openIssues;
    private String readmeContent;
    private String latestReleaseNotes;
    private String latestReleaseVersion;
    private List<String> detectedFrameworks;
}
