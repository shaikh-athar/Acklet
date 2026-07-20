package com.code.acklet.discovery.service;

import com.code.acklet.discovery.entity.SearchSynonym;
import com.code.acklet.discovery.ranking.CompositeRankingEngine;
import com.code.acklet.discovery.repository.SearchSynonymRepository;
import com.code.acklet.discovery.search.ToolSpecification;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiscoverySearchService {

    private final ToolRepository toolRepository;
    private final SearchSynonymRepository synonymRepository;
    private final CompositeRankingEngine rankingEngine;

    @Transactional(readOnly = true)
    public Page<Tool> searchTools(String query, String categorySlug, Pageable pageable) {
        log.info("Executing specification discovery search for query: '{}', category: '{}'", query, categorySlug);

        String effectiveQuery = query;
        if (query != null && !query.trim().isEmpty()) {
            Optional<SearchSynonym> synonymOpt = synonymRepository.findByTermIgnoreCase(query.trim());
            if (synonymOpt.isPresent()) {
                effectiveQuery = synonymOpt.get().getSynonyms().split(",")[0].trim();
            }
        }

        Specification<Tool> spec = Specification.where(ToolSpecification.hasKeyword(effectiveQuery))
                .and(ToolSpecification.hasCategorySlug(categorySlug));

        List<Tool> rawTools = toolRepository.findAll(spec);
        List<Tool> rankedTools = rankingEngine.rankTools(rawTools, effectiveQuery);

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), rankedTools.size());

        if (start > rankedTools.size()) {
            return new PageImpl<>(List.of(), pageable, rankedTools.size());
        }

        List<Tool> pagedContent = rankedTools.subList(start, end);
        return new PageImpl<>(pagedContent, pageable, rankedTools.size());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "search_autocomplete", key = "#prefix.toLowerCase()")
    public List<String> autocomplete(String prefix) {
        if (prefix == null || prefix.trim().length() < 2) {
            return List.of();
        }
        return toolRepository.findAutocompleteNames(prefix.trim().toLowerCase(), PageRequest.of(0, 8));
    }
}
