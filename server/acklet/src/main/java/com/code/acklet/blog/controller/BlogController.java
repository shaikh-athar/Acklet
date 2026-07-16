package com.code.acklet.blog.controller;

import com.code.acklet.blog.dto.ArticleRequest;
import com.code.acklet.blog.dto.ArticleResponse;
import com.code.acklet.blog.entity.Article;
import com.code.acklet.blog.mapper.BlogMapper;
import com.code.acklet.blog.service.BlogService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/blog")
@RequiredArgsConstructor
@Tag(name = "Blog Insights", description = "Endpoints for reading system updates, articles, and documentation")
public class BlogController {

    private final BlogService blogService;
    private final BlogMapper blogMapper;

    @GetMapping
    @Operation(summary = "List blog articles", description = "Retrieves a paginated list of blog articles sorted chronologically")
    public ResponseEntity<ApiResponse<Page<ArticleResponse>>> getArticles(Pageable pageable) {
        Page<ArticleResponse> response = blogService.getAllArticles(pageable)
                .map(blogMapper::toResponse);
        return ResponseEntity.ok(ApiResponse.success(response, "Articles retrieved successfully"));
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Get article by slug", description = "Retrieves full content of a blog article by its slug")
    public ResponseEntity<ApiResponse<ArticleResponse>> getArticle(@PathVariable String slug) {
        Article article = blogService.getArticleBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(blogMapper.toResponse(article), "Article retrieved successfully"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Publish blog article", description = "Creates and publishes a new article. Authorized for ADMIN role only.")
    public ResponseEntity<ApiResponse<ArticleResponse>> createArticle(@Valid @RequestBody ArticleRequest request) {
        Article created = blogService.createArticle(request);
        return ResponseEntity.ok(ApiResponse.success(blogMapper.toResponse(created), "Article created successfully"));
    }
}
