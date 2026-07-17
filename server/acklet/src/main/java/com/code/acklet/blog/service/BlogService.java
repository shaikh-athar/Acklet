package com.code.acklet.blog.service;

import com.code.acklet.blog.dto.ArticleRequest;
import com.code.acklet.blog.entity.Article;
import com.code.acklet.blog.repository.ArticleRepository;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BlogService {

    private final ArticleRepository articleRepository;

    public Page<Article> getAllArticles(Pageable pageable) {
        return articleRepository.findAll(pageable);
    }

    public Article getArticleBySlug(String slug) {
        return articleRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found with slug: " + slug));
    }

    @Transactional
    public Article createArticle(ArticleRequest request) {
        String slug = generateSlug(request.getTitle());
        Article article = Article.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .slug(slug)
                .readingTime(request.getReadingTime())
                .seoMetadata(request.getSeoMetadata())
                .build();
        return articleRepository.save(article);
    }

    private String generateSlug(String title) {
        return title.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", "-")
                + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
