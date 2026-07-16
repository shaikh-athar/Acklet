package com.code.acklet.search.service;

import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final ToolRepository toolRepository;

    public List<String> getAutocompleteSuggestions(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }
        return toolRepository.searchTools(query, PageRequest.of(0, 5))
                .getContent()
                .stream()
                .map(Tool::getName)
                .toList();
    }
}
