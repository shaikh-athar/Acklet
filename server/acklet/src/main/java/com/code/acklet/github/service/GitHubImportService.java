package com.code.acklet.github.service;

import com.code.acklet.ai.service.AiOrchestrationService;
import com.code.acklet.github.dto.GitHubImportJobStatusDto;
import com.code.acklet.github.dto.GitHubImportResponse;
import com.code.acklet.github.dto.GitHubRepoMetadata;
import com.code.acklet.github.dto.RepoImportEvent;
import com.code.acklet.github.entity.GitHubAccount;
import com.code.acklet.github.entity.GitHubImportJob;
import com.code.acklet.github.entity.GitHubImportJob.ImportStatus;
import com.code.acklet.github.repository.DeploymentRepository;
import com.code.acklet.github.repository.GitHubAccountRepository;
import com.code.acklet.github.repository.GitHubImportJobRepository;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.CategoryRepository;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Orchestrates the async repository → tool import pipeline:
 * PENDING → CLONING → ANALYZING → AI_GENERATION → DONE
 *
 * The job is created synchronously; the heavy lifting runs in an @Async executor.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubImportService {

    private final GitHubAccountRepository  accountRepository;
    private final GitHubImportJobRepository jobRepository;
    private final GitHubApiClient           apiClient;
    private final ToolRepository            toolRepository;
    private final CategoryRepository        categoryRepository;
    private final AiOrchestrationService    aiOrchestrationService;
    private final com.code.acklet.github.repository.RepositoryRepository repositoryRepository;
    private final RepositoryImportPipelineService pipelineService;
    private final DeploymentRepository      deploymentRepository;
    private final TemporaryWorkspaceManager workspaceManager;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private GitHubImportService self;

    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9-]");

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Creates an import job and immediately kicks off the async pipeline.
     *
     * @param user          authenticated user
     * @param accountId     UUID of the user's linked GitHubAccount
     * @param repoFullName  e.g. "athar-taj/acklet-cli"
     */
    @Transactional
    public GitHubImportResponse startImport(User user, UUID accountId, String repoFullName, String branch, String buildCommand, String startCommand, String installCommand, java.util.Map<String, String> envVars) {
        GitHubAccount account = accountRepository.findByUserIdAndId(user.getId(), accountId)
                .orElseThrow(() -> new ForbiddenException("GitHub account not found or not yours"));

        GitHubImportJob job = GitHubImportJob.builder()
                .user(user)
                .githubAccount(account)
                .repoFullName(repoFullName)
                .status(ImportStatus.PENDING)
                .currentStep("Queued")
                .build();
        job = jobRepository.save(job);

        // Kick off async pipeline event
        RepoImportEvent event = RepoImportEvent.builder()
                .jobId(job.getId())
                .accountId(account.getId())
                .repoFullName(repoFullName)
                .branch(branch)
                .buildCommand(buildCommand)
                .startCommand(startCommand)
                .installCommand(installCommand)
                .envVars(envVars)
                .build();

        self.runImportAsync(job.getId(), account.getAccessToken(), repoFullName, user);

        return GitHubImportResponse.builder()
                .jobId(job.getId())
                .repoFullName(repoFullName)
                .status(ImportStatus.PENDING.name())
                .build();
    }

    /**
     * Retrieves current import job status for the frontend to poll.
     */
    public GitHubImportJobStatusDto getStatus(UUID jobId, UUID userId) {
        GitHubImportJob job = jobRepository.findByIdAndUserId(jobId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Import job not found: " + jobId));
        return toStatusDto(job);
    }

    // ── Async Pipeline ─────────────────────────────────────────────────────────

    @Transactional
    public void cancelImport(UUID jobId, UUID userId) {
        GitHubImportJob job = jobRepository.findByIdAndUserId(jobId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Import job not found: " + jobId));

        if (job.getStatus() == ImportStatus.DONE) {
            return;
        }

        // 1. Delete associated repository and metadata if it has been created
        repositoryRepository.findByUserIdAndFullName(userId, job.getRepoFullName()).ifPresent(repo -> {
            log.info("Cancelling import: Clean up repository data and workspace files for {}", repo.getFullName());
            
            // Delete workspace files on disk (use deterministic owner_repo path)
            java.nio.file.Path workspaceDir = workspaceManager.getWorkspacePath(repo.getFullName());
            try {
                org.springframework.util.FileSystemUtils.deleteRecursively(workspaceDir);
            } catch (Exception e) {
                log.warn("Failed to delete workspace folder during cancel: {}", e.getMessage());
            }

            // Delete associated tools first to bypass deleteRepository checks
            toolRepository.findByRepositoryId(repo.getId()).ifPresent(tool -> {
                log.info("Deleting tool associated with cancelled repository import: {}", tool.getSlug());
                try {
                    toolRepository.delete(tool);
                } catch (Exception e) {
                    log.warn("Failed to delete tool during cancel: {}", e.getMessage());
                }
            });

            try {
                pipelineService.deleteRepository(repo.getId(), userId);
            } catch (Exception e) {
                log.warn("Failed to delete repository database records during cancel: {}", e.getMessage());
            }
        });

        // 2. Delete any orphaned Tool Drafts if set
        UUID toolId = job.getToolId();
        if (toolId != null) {
            try {
                toolRepository.deleteById(toolId);
            } catch (Exception e) {
                log.warn("Failed to clean up tool draft {} during cancellation: {}", toolId, e.getMessage());
            }
        }

        // 3. Mark the job as FAILED/CANCELLED
        job.setStatus(ImportStatus.FAILED);
        job.setCurrentStep("Cancelled");
        job.setErrorMessage("Import cancelled by user");
        job.setUpdatedAt(Instant.now());
        jobRepository.save(job);
    }

    private boolean isCancelled(UUID jobId) {
        return jobRepository.findById(jobId)
                .map(j -> j.getStatus() == ImportStatus.FAILED)
                .orElse(true);
    }

    private void cleanUpTool(UUID jobId) {
        jobRepository.findById(jobId).ifPresent(job -> {
            if (job.getToolId() != null) {
                try {
                    toolRepository.deleteById(job.getToolId());
                } catch (Exception e) {
                    log.warn("Cleanup of tool draft failed for cancelled job {}: {}", jobId, e.getMessage());
                }
            }
        });
    }

    @Async("aiExecutor")
    public void runImportAsync(UUID jobId, String accessToken, String repoFullName, User user) {
        try {
            if (isCancelled(jobId)) return;

            // Step 1: Clone metadata
            advance(jobId, ImportStatus.CLONING, "Cloning repository metadata");
            GitHubRepoMetadata meta = apiClient.fetchRepoMetadata(repoFullName, accessToken);
            if (meta == null) {
                fail(jobId, "Repository not found or inaccessible: " + repoFullName);
                return;
            }

            if (isCancelled(jobId)) return;

            // Step 2: Analyze framework, language, etc.
            advance(jobId, ImportStatus.ANALYZING, "Analyzing repository structure");

            // Derive a unique slug
            String slug = slugify(meta.getName());
            while (toolRepository.existsBySlug(slug)) {
                slug = slug + "-" + UUID.randomUUID().toString().substring(0, 4);
            }

            if (isCancelled(jobId)) return;

            // Pick a default category ("developer-tools" or first available)
            Category category = categoryRepository.findBySlug("developer-tools")
                    .or(() -> categoryRepository.findAll().stream().findFirst())
                    .orElseThrow(() -> new IllegalStateException("No categories found in database"));

            // Create Tool in DRAFT status
            Tool tool = Tool.builder()
                    .name(meta.getName())
                    .slug(slug)
                    .description(meta.getDescription() != null ? meta.getDescription() : meta.getName())
                    .tagline(meta.getDescription())
                    .githubUrl(meta.getHtmlUrl())
                    .websiteUrl(meta.getHtmlUrl())
                    .version(meta.getLatestReleaseVersion() != null ? meta.getLatestReleaseVersion() : "1.0.0")
                    .category(category)
                    .publisherId(user.getId())
                    .author(meta.getOwner())
                    .isOpenSource(meta.getLicense() != null)
                    .status(Tool.ToolStatus.DRAFT)
                    .build();

            tool = toolRepository.save(tool);
            final UUID toolId = tool.getId();

            if (isCancelled(jobId)) {
                cleanUpTool(jobId);
                return;
            }

            // Patch job with toolId
            GitHubImportJob job = jobRepository.findById(jobId).orElseThrow();
            job.setToolId(toolId);
            jobRepository.save(job);

            if (isCancelled(jobId)) {
                cleanUpTool(jobId);
                return;
            }

            // Step 3: AI generation
            advance(jobId, ImportStatus.AI_GENERATION, "Generating AI metadata");
            try {
                aiOrchestrationService.enrich(toolId);
            } catch (Exception e) {
                log.warn("AI enrichment failed for tool {} (non-fatal): {}", toolId, e.getMessage());
            }

            if (isCancelled(jobId)) {
                cleanUpTool(jobId);
                return;
            }

            // Done
            GitHubImportJob finalJob = jobRepository.findById(jobId).orElseThrow();
            finalJob.setStatus(ImportStatus.DONE);
            finalJob.setCurrentStep("Ready for review");
            finalJob.setToolId(toolId);
            finalJob.setUpdatedAt(Instant.now());
            jobRepository.save(finalJob);

            log.info("Import completed: repo={} → toolId={}", repoFullName, toolId);

        } catch (Exception e) {
            log.error("Import pipeline failed for job {}: {}", jobId, e.getMessage(), e);
            if (isCancelled(jobId)) {
                cleanUpTool(jobId);
            } else {
                fail(jobId, e.getMessage());
            }
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void advance(UUID jobId, ImportStatus status, String step) {
        jobRepository.updateStatus(jobId, status, step, Instant.now());
        log.debug("Import job {} → {} : {}", jobId, status, step);
    }

    private void fail(UUID jobId, String error) {
        jobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(ImportStatus.FAILED);
            job.setCurrentStep("Failed");
            job.setErrorMessage(error);
            job.setUpdatedAt(Instant.now());
            jobRepository.save(job);
        });
    }

    private GitHubImportJobStatusDto toStatusDto(GitHubImportJob job) {
        com.code.acklet.github.entity.Repository repo = repositoryRepository
                .findByUserIdAndFullName(job.getUser().getId(), job.getRepoFullName())
                .orElse(null);
        UUID repositoryId = repo != null ? repo.getId() : null;

        // Gather accumulated build + runtime logs from the latest deployment
        String buildLogs = null;
        String toolSlug = null;
        if (repositoryId != null) {
            var deployments = deploymentRepository.findAllByRepositoryIdOrderByCreatedAtDesc(repositoryId);
            if (!deployments.isEmpty()) {
                var latest = deployments.get(0);
                StringBuilder logs = new StringBuilder();
                if (latest.getBuildLogs() != null) logs.append(latest.getBuildLogs());
                if (latest.getRuntimeLogs() != null) logs.append(latest.getRuntimeLogs());
                buildLogs = logs.length() > 0 ? logs.toString() : null;
            }
        }
        // Fetch the slug from the linked tool if DONE
        if (job.getToolId() != null) {
            toolSlug = toolRepository.findById(job.getToolId())
                    .map(com.code.acklet.tool.entity.Tool::getSlug)
                    .orElse(null);
        }

        return GitHubImportJobStatusDto.builder()
                .jobId(job.getId())
                .status(job.getStatus().name())
                .currentStep(job.getCurrentStep())
                .errorMessage(job.getErrorMessage())
                .toolId(job.getToolId())
                .repositoryId(repositoryId)
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .buildLogs(buildLogs)
                .toolSlug(toolSlug)
                .build();
    }

    private String slugify(String raw) {
        String normalized = Normalizer.normalize(raw.toLowerCase().trim(), Normalizer.Form.NFD);
        return NON_SLUG.matcher(normalized.replaceAll("\\s+", "-")).replaceAll("");
    }
}
