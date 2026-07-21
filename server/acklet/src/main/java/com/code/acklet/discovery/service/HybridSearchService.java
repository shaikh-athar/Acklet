package com.code.acklet.discovery.service;

import com.code.acklet.tool.entity.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Hybrid Search Engine — blends keyword search (PostgreSQL FTS & Ranking Engine)
 * with semantic vector search (pgvector embeddings).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HybridSearchService {

    private final DiscoverySearchService discoverySearchService;
    private final SemanticSearchService  semanticSearchService;

    public enum SearchMode {
        KEYWORD,
        SEMANTIC,
        HYBRID
    }

    @Transactional(readOnly = true)
    public Page<Tool> search(String query, String categorySlug, SearchMode mode, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return discoverySearchService.searchTools("", categorySlug, pageable);
        }

        switch (mode) {
            case KEYWORD:
                return discoverySearchService.searchTools(query, categorySlug, pageable);

            case SEMANTIC:
                Page<Tool> semanticPage = semanticSearchService.searchSemantic(query, pageable);
                if (semanticPage.isEmpty()) {
                    log.info("Semantic vector search yielded 0 results, falling back to keyword search for query: '{}'", query);
                    return discoverySearchService.searchTools(query, categorySlug, pageable);
                }
                return semanticPage;

            case HYBRID:
            default:
                return executeHybridSearch(query, categorySlug, pageable);
        }
    }

    /**
     * Executes Hybrid Search using Reciprocal Rank Fusion (RRF).
     * RRF score = (1 / (k + keywordRank)) + (1 / (k + semanticRank))
     */
    private Page<Tool> executeHybridSearch(String query, String categorySlug, Pageable pageable) {
        log.info("Executing Hybrid Search (Keyword + Semantic RRF) for query: '{}'", query);

        List<Tool> keywordResults = discoverySearchService.searchTools(query, categorySlug, Pageable.unpaged()).getContent();
        List<Tool> semanticResults = semanticSearchService.searchSemantic(query, Pageable.unpaged()).getContent();

        if (semanticResults.isEmpty()) {
            // Fallback to keyword search if vector search returns no results
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), keywordResults.size());
            if (start > keywordResults.size()) return Page.empty(pageable);
            return new PageImpl<>(keywordResults.subList(start, end), pageable, keywordResults.size());
        }

        Map<UUID, Tool> toolMap = new HashMap<>();
        Map<UUID, Double> rrfScores = new HashMap<>();
        final double k = 60.0; // Standard RRF constant

        // 1. Accumulate RRF score for Keyword search ranks
        for (int i = 0; i < keywordResults.size(); i++) {
            Tool t = keywordResults.get(i);
            toolMap.put(t.getId(), t);
            rrfScores.merge(t.getId(), 1.0 / (k + (i + 1)), Double::sum);
        }

        // 2. Accumulate RRF score for Semantic search ranks
        for (int i = 0; i < semanticResults.size(); i++) {
            Tool t = semanticResults.get(i);
            toolMap.put(t.getId(), t);
            rrfScores.merge(t.getId(), 1.0 / (k + (i + 1)), Double::sum);
        }

        // 3. Sort tools by highest RRF score
        List<Tool> fusedResults = rrfScores.entrySet().stream()
                .sorted(Map.Entry.<UUID, Double>comparingByValue().reversed())
                .map(entry -> toolMap.get(entry.getKey()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), fusedResults.size());
        if (start > fusedResults.size()) {
            return new PageImpl<>(List.of(), pageable, fusedResults.size());
        }

        return new PageImpl<>(fusedResults.subList(start, end), pageable, fusedResults.size());
    }
}
