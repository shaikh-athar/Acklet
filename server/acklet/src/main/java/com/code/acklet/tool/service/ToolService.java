package com.code.acklet.tool.service;

import com.code.acklet.github.repository.RepositoryRepository;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.CategoryRepository;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ToolService {

    @Value("${app.tools.public-base-url:}")
    private String toolsPublicBaseUrl;

    private final ToolRepository toolRepository;
    private final RepositoryRepository repositoryRepository;
    private final CategoryRepository categoryRepository;
    private final com.code.acklet.github.service.RepositoryImportPipelineService repositoryImportPipelineService;

    @Cacheable(value = "categories")
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Cacheable(value = "categories", key = "#slug")
    public Category getCategoryBySlug(String slug) {
        return categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with slug: " + slug));
    }

    public Page<Tool> getToolsByCategory(UUID categoryId, Pageable pageable) {
        return toolRepository.findByCategoryId(categoryId, pageable);
    }

    @Cacheable(value = "tools_detail", key = "#slug")
    public Tool getToolBySlug(String slug) {
        return toolRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found with slug: " + slug));
    }

    @Cacheable(value = "tools_featured")
    public List<Tool> getFeaturedTools() {
        return toolRepository.findByIsFeaturedTrue();
    }

    @Cacheable(value = "tools_trending")
    public List<Tool> getTrendingTools() {
        return toolRepository.findByIsTrendingTrue();
    }

    public List<Tool> getNewReleases(int limit) {
        return toolRepository.findNewReleases(PageRequest.of(0, limit));
    }

    public Page<Tool> searchTools(String query, Pageable pageable) {
        return toolRepository.searchTools(query, pageable);
    }

    @Transactional
    @CacheEvict(value = {"tools_detail", "tools_trending", "tools_featured"}, allEntries = true)
    public void incrementUsage(UUID toolId) {
        Tool tool = toolRepository.findById(toolId)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found with id: " + toolId));
        tool.setUsageCount(tool.getUsageCount() + 1);
        toolRepository.save(tool);
    }

    public boolean existsBySlug(String slug) {
        return toolRepository.existsBySlug(slug);
    }

    /**
     * Captures a screenshot of the tool's live URL locally using Puppeteer-core
     * and saves it to a static workspace directory. Saves the path in the database.
     */
    @Transactional
    @CacheEvict(value = "tools_detail", key = "#slug")
    public String refreshPreviewImage(String slug, String liveUrl) {
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + slug));

        // Return cached path if already captured
        if (tool.getPreviewImageUrl() != null && !tool.getPreviewImageUrl().isBlank()) {
            return tool.getPreviewImageUrl();
        }

        try {
            java.nio.file.Path outputDir = java.nio.file.Path.of("a:\\Acklet\\server\\acklet\\workspaces\\previews");
            if (!java.nio.file.Files.exists(outputDir)) {
                java.nio.file.Files.createDirectories(outputDir);
            }
            java.nio.file.Path outputPath = outputDir.resolve(slug + ".png");

            // Execute local Node.js Puppeteer screenshot capture script
            ProcessBuilder pb = new ProcessBuilder(
                    "node",
                    "a:\\Acklet\\server\\acklet\\scripts\\capture.js",
                    liveUrl,
                    outputPath.toAbsolutePath().toString()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // Read output logs for debugging
            try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[Capture Script] {}", line);
                }
            }

            int exitCode = process.waitFor();
            if (exitCode == 0 && java.nio.file.Files.exists(outputPath)) {
                // Return URL relative path that maps to our endpoint: /api/v1/tools/{slug}/preview-image
                String localUrl = "/api/v1/tools/" + slug + "/preview-image";
                tool.setPreviewImageUrl(localUrl);
                toolRepository.save(tool);
                log.info("Successfully captured and saved local preview screenshot for tool '{}': {}", slug, localUrl);
                return localUrl;
            } else {
                log.warn("Screenshot capture script failed with exit code: {}", exitCode);
            }
        } catch (Exception e) {
            log.error("Failed to capture local preview screenshot for tool '{}': {}", slug, e.getMessage(), e);
        }
        return null;
    }

    @Transactional
    @CacheEvict(value = {"tools_detail", "tools_trending", "tools_featured"}, allEntries = true)
    public void deleteToolBySlug(UUID userId, String slug) {
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + slug));
        if (tool.getPublisherId() != null && !userId.equals(tool.getPublisherId())) {
            if (tool.getRepositoryId() != null) {
                repositoryRepository.findByIdAndUserId(tool.getRepositoryId(), userId)
                        .orElseThrow(() -> new ForbiddenException("You do not own this tool or repository"));
            } else {
                throw new ForbiddenException("You do not own this tool");
            }
        }
        UUID repoId = tool.getRepositoryId();
        toolRepository.delete(tool);

        if (repoId != null) {
            try {
                repositoryImportPipelineService.deleteRepository(repoId, userId);
            } catch (Exception e) {
                repositoryRepository.deleteById(repoId);
            }
        }
    }
}
