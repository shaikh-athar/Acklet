package com.code.acklet.publisher.service;

import com.code.acklet.github.entity.Repository;
import com.code.acklet.github.entity.RepositoryKnowledgeGraph;
import com.code.acklet.github.entity.RepositoryMetadata;
import com.code.acklet.github.repository.RepositoryKnowledgeGraphRepository;
import com.code.acklet.github.repository.RepositoryMetadataRepository;
import com.code.acklet.github.repository.RepositoryProjectRepository;
import com.code.acklet.github.repository.RepositoryRepository;
import com.code.acklet.publisher.dto.PatchDraftRequest;
import com.code.acklet.publisher.dto.ToolDraftDto;
import com.code.acklet.publisher.entity.ToolDraft;
import com.code.acklet.publisher.repository.ToolDraftRepository;
import com.code.acklet.shared.exception.ConflictException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.CategoryRepository;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PublishDraftService {

    private final ToolDraftRepository draftRepository;
    private final RepositoryRepository repositoryRepository;
    private final RepositoryMetadataRepository metadataRepository;
    private final RepositoryKnowledgeGraphRepository knowledgeGraphRepository;
    private final RepositoryProjectRepository projectRepository;
    private final ToolRepository toolRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    /** Emitters keyed by draftId for SSE progress streaming */
    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    // ── Create or Resume Draft ─────────────────────────────────────────────────

    @Transactional
    public ToolDraftDto createOrResumeDraft(UUID repositoryId, UUID userId) {
        Repository repo = repositoryRepository.findByIdAndUserId(repositoryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found"));

        ToolDraft draft = draftRepository.findByRepositoryIdAndUserId(repositoryId, userId)
                .orElseGet(() -> buildNewDraft(repo, userId));

        if (draft.getId() == null) {
            draft = draftRepository.save(draft);
        }

        return toDto(draft, repo);
    }

    private ToolDraft buildNewDraft(Repository repo, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Pre-fill from knowledge graph if available
        RepositoryKnowledgeGraph kg = knowledgeGraphRepository.findByRepositoryId(repo.getId()).orElse(null);
        RepositoryMetadata meta = metadataRepository.findByRepositoryId(repo.getId()).orElse(null);
        String framework = projectRepository.findRootByRepositoryId(repo.getId())
                .map(p -> p.getFramework()).orElse(null);

        String toolName = repo.getName();
        String slug = slugify(toolName);
        // Ensure slug is unique
        String baseSlug = slug;
        int counter = 1;
        while (toolRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }

        List<String> capabilities = kg != null && kg.getKeyCapabilities() != null
                ? kg.getKeyCapabilities() : List.of();
        List<String> aiTags = kg != null && kg.getAiTags() != null
                ? kg.getAiTags() : List.of();
        List<String> techStack = new ArrayList<>();
        if (meta != null && meta.getPrimaryLanguage() != null) techStack.add(meta.getPrimaryLanguage());
        if (framework != null && !framework.equals("Unknown")) techStack.add(framework);

        // Default category: first available
        String categorySlug = categoryRepository.findAll().stream()
                .findFirst().map(Category::getSlug).orElse("developer-tools");

        return ToolDraft.builder()
                .repository(repo)
                .user(user)
                .toolName(toolName)
                .slug(slug)
                .tagline(kg != null ? truncate(kg.getPurpose(), 300) : "")
                .description(kg != null ? kg.getSummary() : "")
                .problemStatement(kg != null ? kg.getPurpose() : "")
                .targetAudience(kg != null ? kg.getTargetAudience() : "")
                .businessDomain(kg != null ? kg.getBusinessDomain() : "")
                .aiConfidenceScore(0.85)
                .capabilities(capabilities)
                .techStack(techStack)
                .tags(aiTags)
                .primaryCategorySlug(categorySlug)
                .githubUrl(repo.getHtmlUrl())
                .isOpenSource(!repo.isPrivate())
                .pricingType("FREE")
                .build();
    }

    // ── Load ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ToolDraftDto getDraft(UUID draftId, UUID userId) {
        ToolDraft draft = draftRepository.findById(draftId)
                .orElseThrow(() -> new ResourceNotFoundException("Draft not found"));
        if (!draft.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Draft not found");
        }
        return toDto(draft, draft.getRepository());
    }

    // ── Patch (auto-save) ─────────────────────────────────────────────────────

    @Transactional
    public ToolDraftDto patchDraft(UUID draftId, UUID userId, PatchDraftRequest req) {
        ToolDraft draft = draftRepository.findById(draftId)
                .orElseThrow(() -> new ResourceNotFoundException("Draft not found"));
        if (!draft.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Draft not found");
        }

        if (req.getStepCompleted() != null) draft.setStepCompleted(req.getStepCompleted());
        if (req.getToolName() != null)      draft.setToolName(req.getToolName());
        if (req.getSlug() != null)          draft.setSlug(slugify(req.getSlug()));
        if (req.getTagline() != null)       draft.setTagline(req.getTagline());
        if (req.getDescription() != null)   draft.setDescription(req.getDescription());
        if (req.getProblemStatement() != null) draft.setProblemStatement(req.getProblemStatement());
        if (req.getTargetAudience() != null) draft.setTargetAudience(req.getTargetAudience());
        if (req.getUseCases() != null)      draft.setUseCases(req.getUseCases());
        if (req.getFeatures() != null)      draft.setFeatures(req.getFeatures());
        if (req.getBusinessDomain() != null) draft.setBusinessDomain(req.getBusinessDomain());
        if (req.getTechStack() != null)     draft.setTechStack(req.getTechStack());
        if (req.getCapabilities() != null)  draft.setCapabilities(req.getCapabilities());
        if (req.getPrimaryCategorySlug() != null) draft.setPrimaryCategorySlug(req.getPrimaryCategorySlug());
        if (req.getTags() != null)          draft.setTags(req.getTags());
        if (req.getPricingType() != null)   draft.setPricingType(req.getPricingType());
        if (req.getLicense() != null)       draft.setLicense(req.getLicense());
        if (req.getIsOpenSource() != null)  draft.setOpenSource(req.getIsOpenSource());
        if (req.getGithubUrl() != null)     draft.setGithubUrl(req.getGithubUrl());
        if (req.getWebsiteUrl() != null)    draft.setWebsiteUrl(req.getWebsiteUrl());
        if (req.getLogoUrl() != null)       draft.setLogoUrl(req.getLogoUrl());
        if (req.getCoverUrl() != null)      draft.setCoverUrl(req.getCoverUrl());
        if (req.getDocumentationUrl() != null) draft.setDocumentationUrl(req.getDocumentationUrl());
        if (req.getDiscordUrl() != null)    draft.setDiscordUrl(req.getDiscordUrl());

        draft.setUpdatedAt(Instant.now());
        draftRepository.save(draft);
        return toDto(draft, draft.getRepository());
    }

    // ── Publish ────────────────────────────────────────────────────────────────

    @Transactional
    public Tool publishDraft(UUID draftId, UUID userId) {
        ToolDraft draft = draftRepository.findById(draftId)
                .orElseThrow(() -> new ResourceNotFoundException("Draft not found"));
        if (!draft.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Draft not found");
        }
        if ("PUBLISHED".equals(draft.getStatus())) {
            throw new ConflictException("Already published");
        }

        String slug = draft.getSlug();
        if (toolRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis() % 10000;
        }

        String categorySlug = draft.getPrimaryCategorySlug() != null ? draft.getPrimaryCategorySlug() : "developer-tools";
        Category category = categoryRepository.findBySlug(categorySlug)
                .orElseGet(() -> categoryRepository.findAll().get(0));

        Repository repo = draft.getRepository();
        String framework = projectRepository.findRootByRepositoryId(repo.getId())
                .map(com.code.acklet.github.entity.RepositoryProject::getFramework).orElse("Unknown");

        Tool.ExecutionMode mode = Tool.ExecutionMode.BROWSER;
        String runtime = "web";
        String buildCommand = "";
        String startCommand = "";
        Integer port = 8080;

        if ("Spring Boot".equals(framework)) {
            mode = Tool.ExecutionMode.BACKEND;
            runtime = "java17";
            buildCommand = "mvn clean package -DskipTests";
            startCommand = "java -jar target/*.jar";
            port = 8080;
        } else if ("Rust".equals(framework)) {
            mode = Tool.ExecutionMode.BACKEND;
            runtime = "rust";
            buildCommand = "cargo build --release";
            startCommand = "./target/release/" + repo.getName();
            port = 8080;
        } else if ("React/NextJS".equals(framework) || "Node.js".equals(framework)) {
            mode = Tool.ExecutionMode.BROWSER;
            runtime = "nodejs";
            buildCommand = "npm install && npm run build";
            startCommand = "npm run start";
            port = 3000;
        }

        Tool tool = Tool.builder()
                .name(draft.getToolName())
                .slug(slug)
                .tagline(draft.getTagline())
                .description(draft.getDescription())
                .category(category)
                .publisherId(userId)
                .githubUrl(draft.getGithubUrl())
                .websiteUrl(draft.getWebsiteUrl())
                .logoUrl(draft.getLogoUrl())
                .coverUrl(draft.getCoverUrl())
                .pricingType(draft.getPricingType() != null ? draft.getPricingType() : "FREE")
                .isOpenSource(draft.isOpenSource())
                .repositoryId(repo.getId())
                .executionMode(mode)
                .subdomain(slug + ".acklet.app")
                .runtime(runtime)
                .buildCommand(buildCommand)
                .startCommand(startCommand)
                .port(port)
                .status(Tool.ToolStatus.ACTIVE)  // auto-approve for own repos
                .build();

        tool = toolRepository.save(tool);

        draft.setStatus("PUBLISHED");
        draft.setPublishedTool(tool);
        draft.setUpdatedAt(Instant.now());
        draftRepository.save(draft);

        log.info("Tool published from draft {}: slug={}", draftId, slug);
        return tool;
    }

    // ── SSE Progress ──────────────────────────────────────────────────────────

    public SseEmitter streamProgress(UUID draftId, UUID userId) {
        ToolDraft draft = draftRepository.findById(draftId)
                .orElseThrow(() -> new ResourceNotFoundException("Draft not found"));

        SseEmitter emitter = new SseEmitter(120_000L); // 2 min timeout
        emitters.computeIfAbsent(draftId, k -> Collections.synchronizedList(new ArrayList<>())).add(emitter);

        emitter.onCompletion(() -> removeEmitter(draftId, emitter));
        emitter.onTimeout(() -> removeEmitter(draftId, emitter));

        // Immediately send current status
        Repository repo = draft.getRepository();
        sendProgressSnapshot(emitter, repo);

        return emitter;
    }

    private void sendProgressSnapshot(SseEmitter emitter, Repository repo) {
        boolean hasKg = knowledgeGraphRepository.findByRepositoryId(repo.getId()).isPresent();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("metadataFetched", repo.isStatusMetadataFetched());
        payload.put("treeAnalyzed", repo.isStatusTreeAnalyzed());
        payload.put("aiAnalyzed", repo.isStatusAiAnalyzed());
        payload.put("knowledgeGraph", hasKg);
        try {
            emitter.send(SseEmitter.event().name("progress").data(payload));
        } catch (IOException e) {
            log.debug("SSE send failed: {}", e.getMessage());
        }
    }

    private void removeEmitter(UUID draftId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(draftId);
        if (list != null) list.remove(emitter);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private ToolDraftDto toDto(ToolDraft d, Repository repo) {
        RepositoryMetadata meta = metadataRepository.findByRepositoryId(repo.getId()).orElse(null);
        String framework = projectRepository.findRootByRepositoryId(repo.getId())
                .map(p -> p.getFramework()).orElse("Unknown");

        return ToolDraftDto.builder()
                .draftId(d.getId())
                .repositoryId(repo.getId())
                .stepCompleted(d.getStepCompleted())
                .status(d.getStatus())
                .repoFullName(repo.getFullName())
                .repoName(repo.getName())
                .defaultBranch(repo.getDefaultBranch())
                .htmlUrl(repo.getHtmlUrl())
                .isPrivate(repo.isPrivate())
                .primaryLanguage(meta != null ? meta.getPrimaryLanguage() : null)
                .repoDescription(meta != null ? meta.getDescription() : null)
                .framework(framework)
                .statusMetadataFetched(repo.isStatusMetadataFetched())
                .statusTreeAnalyzed(repo.isStatusTreeAnalyzed())
                .statusAiAnalyzed(repo.isStatusAiAnalyzed())
                .toolName(d.getToolName())
                .slug(d.getSlug())
                .tagline(d.getTagline())
                .description(d.getDescription())
                .problemStatement(d.getProblemStatement())
                .targetAudience(d.getTargetAudience())
                .useCases(d.getUseCases())
                .features(d.getFeatures())
                .businessDomain(d.getBusinessDomain())
                .aiConfidenceScore(d.getAiConfidenceScore())
                .techStack(d.getTechStack())
                .capabilities(d.getCapabilities())
                .primaryCategorySlug(d.getPrimaryCategorySlug())
                .tags(d.getTags())
                .pricingType(d.getPricingType())
                .license(d.getLicense())
                .isOpenSource(d.isOpenSource())
                .githubUrl(d.getGithubUrl())
                .websiteUrl(d.getWebsiteUrl())
                .logoUrl(d.getLogoUrl())
                .coverUrl(d.getCoverUrl())
                .documentationUrl(d.getDocumentationUrl())
                .discordUrl(d.getDiscordUrl())
                .publishedToolSlug(d.getPublishedTool() != null ? d.getPublishedTool().getSlug() : null)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String slugify(String s) {
        return s.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    private static String truncate(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) : s;
    }
}
