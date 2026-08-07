package com.code.acklet.github.service;

import com.code.acklet.event.config.RabbitMqConfig;
import com.code.acklet.github.dto.GitHubImportJobStatusDto;
import com.code.acklet.github.dto.GitHubImportResponse;
import com.code.acklet.github.dto.RepoImportEvent;
import com.code.acklet.github.dto.RepositorySummaryDto;
import com.code.acklet.github.entity.*;
import com.code.acklet.github.repository.*;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.user.entity.User;
import com.code.acklet.publisher.repository.ToolDraftRepository;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RepositoryImportPipelineService {

    private final GitHubAccountRepository accountRepository;
    private final GitHubImportJobRepository jobRepository;
    private final RepositoryRepository repositoryRepository;
    private final RepositoryMetadataRepository metadataRepository;
    private final RepositoryStatisticsRepository statisticsRepository;
    private final RepositoryHealthRepository healthRepository;
    private final RepositoryTreeRepository treeRepository;
    private final RabbitTemplate rabbitTemplate;

    // ── STEP 1: Repository Import Request ──────────────────────────────────────

    @Transactional
    public GitHubImportResponse queueRepositoryImport(User user, UUID accountId, String repoFullName) {
        if (repoFullName == null || repoFullName.trim().isEmpty() || repoFullName.equalsIgnoreCase("undefined")) {
            throw new IllegalArgumentException("Repository name cannot be empty or undefined");
        }
        if (!repoFullName.contains("/") || repoFullName.indexOf('/') == 0 || repoFullName.indexOf('/') == repoFullName.length() - 1) {
            throw new IllegalArgumentException("Repository name must be in the format 'owner/repo'");
        }

        GitHubAccount account = accountRepository.findByUserIdAndId(user.getId(), accountId)
                .orElseThrow(() -> new ForbiddenException("GitHub account not found or not yours"));

        // Create the Import Job in QUEUED status
        GitHubImportJob job = GitHubImportJob.builder()
                .user(user)
                .githubAccount(account)
                .repoFullName(repoFullName)
                .status(GitHubImportJob.ImportStatus.PENDING)
                .currentStep("Queued in RabbitMQ")
                .build();
        job = jobRepository.save(job);

        // Pre-create basic Repository entity record in PENDING state
        Repository repo = repositoryRepository.findByUserIdAndFullName(user.getId(), repoFullName)
                .orElseGet(() -> Repository.builder()
                        .user(user)
                        .name(repoFullName.substring(repoFullName.indexOf('/') + 1))
                        .fullName(repoFullName)
                        .externalId("PENDING_" + UUID.randomUUID())
                        .htmlUrl("https://github.com/" + repoFullName)
                        .build());
        repositoryRepository.save(repo);

        // Dispatch Event to RabbitMQ
        RepoImportEvent event = RepoImportEvent.builder()
                .jobId(job.getId())
                .accountId(accountId)
                .repoFullName(repoFullName)
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMqConfig.IMPORT_EXCHANGE,
                    RabbitMqConfig.ROUTING_KEY_IMPORT_QUEUED,
                    event
            );
            log.info("Successfully queued Repository Import for {} (Job: {})", repoFullName, job.getId());
        } catch (Exception e) {
            log.warn("Failed to publish Repository Import event to RabbitMQ, falling back: {}", e.getMessage());
            // In a production setup, we might persist failed events or throw an error.
            // For resilience, we proceed as the consumer can poll/retry.
        }

        return GitHubImportResponse.builder()
                .jobId(job.getId())
                .repoFullName(repoFullName)
                .status(GitHubImportJob.ImportStatus.PENDING.name())
                .build();
    }

    // ── Get Data APIs ──────────────────────────────────────────────────────────

    public Repository getRepository(UUID id, UUID userId) {
        return repositoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));
    }

    public Page<RepositorySummaryDto> listRepositories(UUID userId, Pageable pageable) {
        Page<Repository> page = repositoryRepository.findAllByUserIdAndExternalIdNotStartingWith(userId, "PENDING_", pageable);
        List<RepositorySummaryDto> dtos = page.getContent().stream().map(repo -> {
            var meta = metadataRepository.findByRepositoryId(repo.getId());
            String primaryLanguage = meta.map(RepositoryMetadata::getPrimaryLanguage).orElse(null);
            String description = meta.map(RepositoryMetadata::getDescription).orElse(null);
            String framework = projectRepository.findRootByRepositoryId(repo.getId())
                    .map(RepositoryProject::getFramework).orElse("Unknown");
            return RepositorySummaryDto.builder()
                    .id(repo.getId())
                    .fullName(repo.getFullName())
                    .name(repo.getName())
                    .defaultBranch(repo.getDefaultBranch())
                    .isPrivate(repo.isPrivate())
                    .htmlUrl(repo.getHtmlUrl())
                    .provider(repo.getProvider())
                    .description(description)
                    .primaryLanguage(primaryLanguage)
                    .framework(framework)
                    .statusMetadataFetched(repo.isStatusMetadataFetched())
                    .statusTreeAnalyzed(repo.isStatusTreeAnalyzed())
                    .statusAiAnalyzed(repo.isStatusAiAnalyzed())
                    .build();
        }).toList();
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }


    @Cacheable(value = "repo_meta", key = "#repositoryId")
    public RepositoryMetadata getRepositoryMetadata(UUID repositoryId) {
        return metadataRepository.findByRepositoryId(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository metadata not found"));
    }

    @Cacheable(value = "repo_tree", key = "#repositoryId")
    public RepositoryTree getRepositoryTree(UUID repositoryId) {
        return treeRepository.findByRepositoryId(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository tree structure not found"));
    }

    @Cacheable(value = "repo_health", key = "#repositoryId")
    public RepositoryHealth getRepositoryHealth(UUID repositoryId) {
        return healthRepository.findByRepositoryId(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository health metrics not found"));
    }

    @Cacheable(value = "repo_stats", key = "#repositoryId")
    public RepositoryStatistics getRepositoryStatistics(UUID repositoryId) {
        return statisticsRepository.findByRepositoryId(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository statistics not found"));
    }

    private final RepositoryProjectRepository projectRepository;

    public java.util.List<RepositoryProject> getDiscoveredProjects(UUID repositoryId) {
        return projectRepository.findAllByRepositoryId(repositoryId);
    }

    @Transactional
    public void selectProjectsForImport(UUID repositoryId, java.util.List<String> paths) {
        java.util.List<RepositoryProject> projects = projectRepository.findAllByRepositoryId(repositoryId);
        for (RepositoryProject project : projects) {
            if (paths.contains(project.getPath())) {
                log.info("Selected project for import: {} in path {}", project.getName(), project.getPath());
                // In Phase 5, these selections map to the generated Draft Tools list
            }
        }
    }

    private final RepositoryKnowledgeGraphRepository knowledgeGraphRepository;
    private final ToolDraftRepository draftRepository;
    private final ToolRepository toolRepository;

    public RepositoryKnowledgeGraph getRepositoryKnowledgeGraph(UUID repositoryId) {
        return knowledgeGraphRepository.findByRepositoryId(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository knowledge graph not found"));
    }

    @Transactional
    public void unlinkRepository(UUID id, UUID userId) {
        Repository repo = repositoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));

        // Delete any related Tool Drafts so it can be re-drafted/re-published
        draftRepository.findByRepositoryIdAndUserId(id, userId).ifPresent(draftRepository::delete);

        // Dissociate the published tool from the repository
        toolRepository.findByRepositoryId(id).ifPresent(tool -> {
            log.info("Unlinking repository: {} from tool: {}", id, tool.getSlug());
            tool.setRepositoryId(null);
            toolRepository.save(tool);
        });
        
        log.info("Successfully unlinked repository: {} for user: {}", repo.getFullName(), userId);
    }

    @Transactional
    public void deleteRepository(UUID id, UUID userId) {
        Repository repo = repositoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));

        // Enforce: Cannot delete if linked to a published tool
        if (toolRepository.findByRepositoryId(id).isPresent()) {
            throw new IllegalStateException("Repository cannot be deleted because it is currently linked to a published Tool. Please unlink the tool first.");
        }

        // Delete any related Tool Drafts
        draftRepository.findByRepositoryIdAndUserId(id, userId).ifPresent(draftRepository::delete);

        // Clean up metadata
        metadataRepository.findByRepositoryId(id).ifPresent(metadataRepository::delete);
        treeRepository.findByRepositoryId(id).ifPresent(treeRepository::delete);
        healthRepository.findByRepositoryId(id).ifPresent(healthRepository::delete);
        statisticsRepository.findByRepositoryId(id).ifPresent(statisticsRepository::delete);
        
        java.util.List<RepositoryProject> projects = projectRepository.findAllByRepositoryId(id);
        projectRepository.deleteAll(projects);

        knowledgeGraphRepository.findByRepositoryId(id).ifPresent(knowledgeGraphRepository::delete);

        // Delete import jobs
        java.util.List<GitHubImportJob> jobs = jobRepository.findAllByRepoFullName(repo.getFullName());
        jobRepository.deleteAll(jobs);

        // Finally delete the repository
        repositoryRepository.delete(repo);
        log.info("Successfully deleted/disconnected repository: {} for user: {}", repo.getFullName(), userId);
    }
}
