package com.code.acklet.discovery.service;

import com.code.acklet.ai.service.EmbeddingGenerationService;
import com.code.acklet.tool.entity.Tool;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Semantic Vector Search Engine for Acklet tools.
 *
 * Converts natural-language user queries ("validate json schema", "compress png without losing quality")
 * into dense vector representations using EmbeddingGenerationService, then performs pgvector
 * cosine similarity search (<=> operator) against stored tool embeddings.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SemanticSearchService {

    private final EmbeddingGenerationService embeddingService;
    private final EntityManager              entityManager;

    /**
     * Performs semantic vector search on tools.
     *
     * @param query    Natural-language query
     * @param pageable Pagination options
     * @return         Page of matching tools ordered by semantic similarity
     */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public Page<Tool> searchSemantic(String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return Page.empty(pageable);
        }

        try {
            float[] queryVector = embeddingService.embedText(query);
            String vectorString = embeddingService.formatVectorForPgVector(queryVector);

            String sql = """
                    SELECT t.* FROM tools t
                    WHERE t.status = 'ACTIVE' AND t.deleted_at IS NULL AND t.embedding IS NOT NULL
                    ORDER BY (t.embedding <=> :queryVector::vector) ASC
                    OFFSET :offset LIMIT :limit
                    """;

            List<Tool> results = entityManager.createNativeQuery(sql, Tool.class)
                    .setParameter("queryVector", vectorString)
                    .setParameter("offset", pageable.getOffset())
                    .setParameter("limit", pageable.getPageSize())
                    .getResultList();

            String countSql = """
                    SELECT COUNT(*) FROM tools t
                    WHERE t.status = 'ACTIVE' AND t.deleted_at IS NULL AND t.embedding IS NOT NULL
                    """;
            Number total = (Number) entityManager.createNativeQuery(countSql).getSingleResult();

            return new PageImpl<>(results, pageable, total.longValue());

        } catch (Exception e) {
            log.warn("pgvector semantic search unavailable or failed: {}. Returning empty page for fallback.", e.getMessage());
            return Page.empty(pageable);
        }
    }
}
