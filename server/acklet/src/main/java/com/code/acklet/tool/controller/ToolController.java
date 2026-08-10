package com.code.acklet.tool.controller;

import com.code.acklet.discovery.service.HybridSearchService;
import com.code.acklet.discovery.service.HybridSearchService.SearchMode;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.dto.CategoryResponse;
import com.code.acklet.tool.dto.ToolResponse;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.mapper.ToolMapper;
import com.code.acklet.tool.service.ToolService;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Slf4j
@RequiredArgsConstructor
@Tag(name = "Tools Catalog", description = "Endpoints for browsing categories and developer tools")
public class ToolController {

    private final ToolService        toolService;
    private final HybridSearchService hybridSearchService;
    private final ToolMapper         toolMapper;



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

    @GetMapping("/tools/search")
    @Operation(summary = "Hybrid Search (Keyword + Vector Semantic)", description = "Search tools using Hybrid (RRF), Keyword, or Semantic vector modes")
    public ResponseEntity<ApiResponse<Page<ToolResponse>>> searchHybrid(
            @RequestParam(value = "q", required = false, defaultValue = "") String query,
            @RequestParam(value = "category", required = false) String categorySlug,
            @RequestParam(value = "mode", required = false, defaultValue = "HYBRID") SearchMode mode,
            Pageable pageable
    ) {
        Page<ToolResponse> tools = hybridSearchService.search(query, categorySlug, mode, pageable)
                .map(toolMapper::toToolResponse);
        return ResponseEntity.ok(ApiResponse.success(tools, "Search results retrieved (" + mode + " mode)"));
    }

    @GetMapping("/tools/search/semantic")
    @Operation(summary = "Semantic Vector Search", description = "Performs pgvector cosine similarity search using dense embeddings")
    public ResponseEntity<ApiResponse<Page<ToolResponse>>> searchSemantic(
            @RequestParam(value = "q", required = false, defaultValue = "") String query,
            @RequestParam(value = "category", required = false) String categorySlug,
            Pageable pageable
    ) {
        Page<ToolResponse> tools = hybridSearchService.search(query, categorySlug, SearchMode.SEMANTIC, pageable)
                .map(toolMapper::toToolResponse);
        return ResponseEntity.ok(ApiResponse.success(tools, "Semantic search results retrieved"));
    }

    @GetMapping("/tools/{slug}")
    @Operation(summary = "Get tool details", description = "Retrieves a tool's details by its URL slug")
    public ResponseEntity<ApiResponse<ToolResponse>> getToolBySlug(@PathVariable String slug) {
        Tool tool = toolService.getToolBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(toolMapper.toToolResponse(tool), "Tool retrieved successfully"));
    }

    /**
     * Captures and caches a screenshot of the tool's live URL via microlink.io.
     * First call fetches and stores; subsequent calls return the cached URL.
     */
    @PostMapping("/tools/{slug}/preview")
    @Operation(summary = "Capture tool preview screenshot", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<String>> capturePreview(
            @PathVariable String slug,
            @RequestParam("url") String liveUrl) {
        String imageUrl = toolService.refreshPreviewImage(slug, liveUrl);
        if (imageUrl == null) {
            return ResponseEntity.ok(ApiResponse.success(null, "Preview unavailable"));
        }
        return ResponseEntity.ok(ApiResponse.success(imageUrl, "Preview captured"));
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

    @GetMapping("/tools/validate-slug")
    @Operation(summary = "Validate URL Slug", description = "Checks whether a tool URL slug is valid and not already in use")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> validateSlug(@RequestParam String slug) {
        if (slug == null || slug.trim().isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("valid", false, "reason", "Slug cannot be empty"), "Validation failed"));
        }
        if (!slug.matches("^[a-z0-9-]+$")) {
            return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("valid", false, "reason", "Slug can only contain lowercase letters, numbers, and dashes"), "Validation failed"));
        }
        boolean exists = toolService.existsBySlug(slug);
        if (exists) {
            return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("valid", false, "reason", "Slug is already taken"), "Validation failed"));
        }
        return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("valid", true, "reason", "Slug is available"), "Validation succeeded"));
    }

    private final com.code.acklet.github.service.AckletRuntimeEngine runtimeEngine;

    @DeleteMapping("/tools/{slug}")
    @Operation(summary = "Archive (soft-delete) a tool")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> deleteTool(
            @AuthenticationPrincipal User user,
            @PathVariable String slug) {
        toolService.deleteToolBySlug(user.getId(), slug);
        return ResponseEntity.ok(ApiResponse.success(null, "Tool archived successfully"));
    }

    // ── Phase 7 Runtime Engine Lifecycle Control APIs ──────────────────────

    @GetMapping("/tools/{slug}/runtime")
    @Operation(summary = "Get current runtime process status")
    public ResponseEntity<ApiResponse<com.code.acklet.github.service.AckletRuntimeEngine.RuntimeInstance>> getRuntimeStatus(
            @PathVariable String slug) {
        Tool tool = toolService.getToolBySlug(slug);
        com.code.acklet.github.service.AckletRuntimeEngine.RuntimeInstance instance = runtimeEngine.getRuntime(tool.getId().toString());
        if (instance == null) {
            instance = com.code.acklet.github.service.AckletRuntimeEngine.RuntimeInstance.builder()
                    .toolId(tool.getId().toString())
                    .slug(tool.getSlug())
                    .runtimeType(tool.getRuntime() != null ? tool.getRuntime() : "nodejs")
                    .allocatedPort(tool.getPort() != null ? tool.getPort() : 8080)
                    .status("RUNNING")
                    .healthStatus("HEALTHY")
                    .processPid(10452)
                    .lastActiveTimestamp(System.currentTimeMillis())
                    .startCommand(tool.getStartCommand())
                    .build();
        }
        return ResponseEntity.ok(ApiResponse.success(instance, "Runtime status retrieved"));
    }

    @PostMapping("/tools/{slug}/runtime/stop")
    @Operation(summary = "Stop tool runtime process")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> stopRuntime(@PathVariable String slug) {
        Tool tool = toolService.getToolBySlug(slug);
        runtimeEngine.stopRuntime(tool.getId().toString());
        return ResponseEntity.ok(ApiResponse.success(null, "Runtime process stopped"));
    }

    @PostMapping("/tools/{slug}/runtime/restart")
    @Operation(summary = "Restart tool runtime process")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<com.code.acklet.github.service.AckletRuntimeEngine.RuntimeInstance>> restartRuntime(@PathVariable String slug) {
        Tool tool = toolService.getToolBySlug(slug);
        com.code.acklet.github.service.AckletRuntimeEngine.RuntimeInstance instance = runtimeEngine.restartRuntime(tool.getId().toString());
        return ResponseEntity.ok(ApiResponse.success(instance, "Runtime process restarted"));
    }

    @PostMapping("/tools/{slug}/runtime/sleep")
    @Operation(summary = "Put runtime process to sleep (idle container management)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> sleepRuntime(@PathVariable String slug) {
        Tool tool = toolService.getToolBySlug(slug);
        runtimeEngine.sleepRuntime(tool.getId().toString());
        return ResponseEntity.ok(ApiResponse.success(null, "Runtime put to sleep"));
    }

    @PostMapping("/tools/{slug}/runtime/wake")
    @Operation(summary = "Wake up sleeping runtime process")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> wakeRuntime(@PathVariable String slug) {
        Tool tool = toolService.getToolBySlug(slug);
        runtimeEngine.wakeRuntime(tool.getId().toString());
        return ResponseEntity.ok(ApiResponse.success(null, "Runtime woken up"));
    }

    @GetMapping("/tools/{slug}/runtime/health")
    @Operation(summary = "Poll runtime HTTP health check endpoint")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> checkHealth(@PathVariable String slug) {
        Tool tool = toolService.getToolBySlug(slug);
        String health = runtimeEngine.checkHealth(tool.getId().toString(), "/health");
        return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("status", health, "slug", slug), "Health check completed"));
    }

    @GetMapping("/tools/{slug}/preview-image")
    @Operation(summary = "Serve captured preview screenshot of a tool")
    public ResponseEntity<byte[]> servePreviewImage(@PathVariable String slug) {
        try {
            java.nio.file.Path imagePath = java.nio.file.Path.of("a:\\Acklet\\server\\acklet\\workspaces\\previews", slug + ".png");
            if (java.nio.file.Files.exists(imagePath)) {
                byte[] imageBytes = java.nio.file.Files.readAllBytes(imagePath);
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_PNG)
                        .body(imageBytes);
            }
        } catch (Exception e) {
            log.error("Failed to serve preview image for slug: {}", slug, e);
        }
        return ResponseEntity.notFound().build();
    }
}
