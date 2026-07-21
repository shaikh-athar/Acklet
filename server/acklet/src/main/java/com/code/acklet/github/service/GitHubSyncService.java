package com.code.acklet.github.service;

import com.code.acklet.ai.service.AiOrchestrationService;
import com.code.acklet.github.dto.GitHubIntegrationResponse;
import com.code.acklet.github.dto.GitHubRepoMetadata;
import com.code.acklet.github.entity.GitHubIntegration;
import com.code.acklet.github.repository.GitHubIntegrationRepository;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.entity.knowledge.ToolKnowledge;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.tool.repository.knowledge.ToolKnowledgeRepository;
import com.code.acklet.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Service for connecting tools to GitHub repositories and automated syncing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubSyncService {

    private final GitHubIntegrationRepository integrationRepository;
    private final GitHubApiClient             apiClient;
    private final ToolRepository               toolRepository;
    private final ToolKnowledgeRepository      knowledgeRepository;
    private final AiOrchestrationService       orchestrationService;

    /**
     * Connects a tool to a GitHub repository.
     */
    @Transactional
    public GitHubIntegrationResponse connectRepository(User user, UUID toolId, String repoName, String oauthCode) {
        Tool tool = toolRepository.findById(toolId)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + toolId));

        if (tool.getPublisherId() != null && !tool.getPublisherId().equals(user.getId()) && user.getRole() != User.Role.ADMIN) {
            throw new ForbiddenException("You do not own this tool");
        }

        String token = (oauthCode != null && !oauthCode.isBlank())
                ? apiClient.exchangeCodeForToken(oauthCode)
                : null;

        String cleanRepo = (repoName != null && !repoName.isBlank()) ? repoName : extractRepoNameFromUrl(tool.getGithubUrl());
        if (cleanRepo == null || cleanRepo.isBlank()) {
            throw new IllegalArgumentException("GitHub repository name or URL is required");
        }

        GitHubRepoMetadata meta = apiClient.fetchRepoMetadata(cleanRepo, token);
        if (meta == null) {
            throw new ResourceNotFoundException("GitHub repository not found: " + cleanRepo);
        }

        GitHubIntegration integration = integrationRepository.findByToolId(toolId)
                .orElseGet(() -> GitHubIntegration.builder()
                        .user(user)
                        .tool(tool)
                        .build());

        integration.setGithubUser(meta.getOwner());
        integration.setGithubRepo(meta.getFullName());
        integration.setGithubRepoId(meta.getRepoId());
        integration.setDefaultBranch(meta.getDefaultBranch());
        if (token != null) integration.setAccessToken(token);
        integration.setLastSyncedAt(Instant.now());

        integration = integrationRepository.save(integration);

        // Perform initial sync
        syncToolWithMetadata(tool, meta);

        log.info("Successfully linked GitHub repository {} to tool {}", meta.getFullName(), tool.getSlug());
        return toResponse(integration);
    }

    /**
     * Syncs tool metadata from GitHub and triggers AI enrichment over README.
     */
    @Transactional
    public void syncRepository(UUID toolId) {
        GitHubIntegration integration = integrationRepository.findByToolId(toolId)
                .orElseThrow(() -> new ResourceNotFoundException("No GitHub integration found for tool: " + toolId));

        Tool tool = integration.getTool();
        GitHubRepoMetadata meta = apiClient.fetchRepoMetadata(integration.getGithubRepo(), integration.getAccessToken());

        if (meta != null) {
            syncToolWithMetadata(tool, meta);
            integration.setLastSyncedAt(Instant.now());
            integrationRepository.save(integration);

            // Trigger AI Enrichment over freshly imported GitHub README & Metadata
            orchestrationService.enrich(toolId);
            log.info("Triggered AI enrichment after GitHub sync for tool: {}", tool.getSlug());
        }
    }

    private void syncToolWithMetadata(Tool tool, GitHubRepoMetadata meta) {
        tool.setGithubUrl(meta.getHtmlUrl());
        tool.setOpenSource(true);

        if (tool.getTagline() == null || tool.getTagline().isBlank()) {
            tool.setTagline(meta.getDescription());
        }
        toolRepository.save(tool);

        // Update ToolKnowledge
        ToolKnowledge knowledge = knowledgeRepository.findById(tool.getId())
                .orElseGet(() -> ToolKnowledge.builder().toolId(tool.getId()).tool(tool).build());

        knowledge.setGithubRepository(meta.getHtmlUrl());
        if (meta.getReadmeContent() != null && !meta.getReadmeContent().isBlank()) {
            if (knowledge.getOverview() == null || knowledge.getOverview().isBlank()) {
                knowledge.setOverview(meta.getDescription() != null ? meta.getDescription() : meta.getName());
            }
        }
        knowledgeRepository.save(knowledge);
    }

    private String extractRepoNameFromUrl(String url) {
        if (url == null || !url.contains("github.com/")) return null;
        return url.substring(url.indexOf("github.com/") + 11).replaceAll("^/", "").replaceAll("/$", "");
    }

    private GitHubIntegrationResponse toResponse(GitHubIntegration g) {
        return GitHubIntegrationResponse.builder()
                .id(g.getId())
                .toolId(g.getTool() != null ? g.getTool().getId() : null)
                .toolSlug(g.getTool() != null ? g.getTool().getSlug() : null)
                .githubUser(g.getGithubUser())
                .githubRepo(g.getGithubRepo())
                .githubRepoId(g.getGithubRepoId())
                .defaultBranch(g.getDefaultBranch())
                .lastSyncedAt(g.getLastSyncedAt())
                .createdAt(g.getCreatedAt())
                .build();
    }
}
