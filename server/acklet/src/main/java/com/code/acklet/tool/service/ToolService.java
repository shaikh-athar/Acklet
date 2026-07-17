package com.code.acklet.tool.service;

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

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ToolService {

    private final ToolRepository toolRepository;
    private final CategoryRepository categoryRepository;

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Category getCategoryBySlug(String slug) {
        return categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with slug: " + slug));
    }

    public Page<Tool> getToolsByCategory(UUID categoryId, Pageable pageable) {
        return toolRepository.findByCategoryId(categoryId, pageable);
    }

    public Tool getToolBySlug(String slug) {
        return toolRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found with slug: " + slug));
    }

    public List<Tool> getFeaturedTools() {
        return toolRepository.findByIsFeaturedTrue();
    }

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
    public void incrementUsage(UUID toolId) {
        Tool tool = toolRepository.findById(toolId)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found with id: " + toolId));
        tool.setUsageCount(tool.getUsageCount() + 1);
        toolRepository.save(tool);
    }
}
