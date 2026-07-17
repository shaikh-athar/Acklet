package com.code.acklet.tool.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.dto.CategoryResponse;
import com.code.acklet.tool.dto.ToolResponse;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.mapper.ToolMapper;
import com.code.acklet.tool.service.ToolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Tools Catalog", description = "Endpoints for browsing categories and developer tools")
public class ToolController {

    private final ToolService toolService;
    private final ToolMapper toolMapper;

    @GetMapping("/categories")
    @Operation(summary = "List all tool categories", description = "Retrieves all categories configured in the system")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories() {
        List<CategoryResponse> categories = toolService.getAllCategories().stream()
                .map(toolMapper::toCategoryResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(categories, "Categories retrieved successfully"));
    }

    @GetMapping("/categories/{slug}")
    @Operation(summary = "Get category details", description = "Retrieves a category profile by its URL slug")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryBySlug(@PathVariable String slug) {
        Category category = toolService.getCategoryBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(toolMapper.toCategoryResponse(category), "Category retrieved successfully"));
    }

    @GetMapping("/categories/{slug}/tools")
    @Operation(summary = "Get tools in category", description = "Retrieves paginated tools belonging to the specified category slug")
    public ResponseEntity<ApiResponse<Page<ToolResponse>>> getToolsByCategory(@PathVariable String slug, Pageable pageable) {
        Category category = toolService.getCategoryBySlug(slug);
        Page<ToolResponse> tools = toolService.getToolsByCategory(category.getId(), pageable)
                .map(toolMapper::toToolResponse);
        return ResponseEntity.ok(ApiResponse.success(tools, "Category tools retrieved successfully"));
    }

    @GetMapping("/tools")
    @Operation(summary = "Search developer tools", description = "Performs keyword search against tool name and descriptions")
    public ResponseEntity<ApiResponse<Page<ToolResponse>>> searchTools(
            @RequestParam(value = "q", required = false, defaultValue = "") String query,
            Pageable pageable
    ) {
        Page<ToolResponse> tools = toolService.searchTools(query, pageable)
                .map(toolMapper::toToolResponse);
        return ResponseEntity.ok(ApiResponse.success(tools, "Tools retrieved successfully"));
    }

    @GetMapping("/tools/{slug}")
    @Operation(summary = "Get tool details", description = "Retrieves a tool's details by its URL slug")
    public ResponseEntity<ApiResponse<ToolResponse>> getToolBySlug(@PathVariable String slug) {
        Tool tool = toolService.getToolBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(toolMapper.toToolResponse(tool), "Tool retrieved successfully"));
    }

    @GetMapping("/tools/featured")
    @Operation(summary = "List featured tools", description = "Retrieves tools currently marked as featured")
    public ResponseEntity<ApiResponse<List<ToolResponse>>> getFeatured() {
        List<ToolResponse> tools = toolService.getFeaturedTools().stream()
                .map(toolMapper::toToolResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(tools, "Featured tools retrieved successfully"));
    }

    @GetMapping("/tools/trending")
    @Operation(summary = "List trending tools", description = "Retrieves tools marked as trending based on utilization")
    public ResponseEntity<ApiResponse<List<ToolResponse>>> getTrending() {
        List<ToolResponse> tools = toolService.getTrendingTools().stream()
                .map(toolMapper::toToolResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(tools, "Trending tools retrieved successfully"));
    }

    @GetMapping("/tools/new-releases")
    @Operation(summary = "List newly released tools", description = "Retrieves recently added developer tools up to the limit")
    public ResponseEntity<ApiResponse<List<ToolResponse>>> getNewReleases(@RequestParam(value = "limit", defaultValue = "10") int limit) {
        List<ToolResponse> tools = toolService.getNewReleases(limit).stream()
                .map(toolMapper::toToolResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(tools, "New releases retrieved successfully"));
    }

    @PostMapping("/tools/{id}/use")
    @Operation(summary = "Record tool usage analytics", description = "Increments execution statistics counter for the specified tool ID")
    public ResponseEntity<ApiResponse<Void>> recordUsage(@PathVariable UUID id) {
        toolService.incrementUsage(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Usage recorded successfully"));
    }
}
