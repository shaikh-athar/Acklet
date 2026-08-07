package com.code.acklet.tool.service;

import com.code.acklet.github.repository.RepositoryRepository;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.CategoryRepository;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ToolService {

    private final ToolRepository toolRepository;
    private final RepositoryRepository repositoryRepository;

    private final CategoryRepository categoryRepository;

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

    @Transactional
    @CacheEvict(value = {"tools_detail", "tools_trending", "tools_featured"}, allEntries = true)
    public void deleteToolBySlug(UUID userId, String slug) {
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + slug));
        if (tool.getPublisherId() != null && !userId.equals(tool.getPublisherId())) {
            // If repository belongs to user, allow deletion
            if (tool.getRepositoryId() != null) {
                repositoryRepository.findByIdAndUserId(tool.getRepositoryId(), userId)
                        .orElseThrow(() -> new ForbiddenException("You do not own this tool or repository"));
            } else {
                throw new ForbiddenException("You do not own this tool");
            }
        }
        toolRepository.delete(tool);
    }
}
