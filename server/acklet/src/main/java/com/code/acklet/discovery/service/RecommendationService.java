package com.code.acklet.discovery.service;

import com.code.acklet.discovery.entity.ToolRelationship;
import com.code.acklet.discovery.repository.ToolRelationshipRepository;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final ToolRelationshipRepository relationshipRepository;
    private final ToolRepository toolRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "tool_recommendations", key = "#toolId + '_' + #relationshipType")
    public List<Tool> getRecommendations(UUID toolId, String relationshipType) {
        List<ToolRelationship> rels = relationshipRepository.findBySourceToolIdAndRelationshipType(toolId, relationshipType);

        if (!rels.isEmpty()) {
            return rels.stream().map(ToolRelationship::getTargetTool).collect(Collectors.toList());
        }

        // Fallback: Same category tools excluding the target tool
        Tool tool = toolRepository.findById(toolId).orElse(null);
        if (tool != null && tool.getCategory() != null) {
            return toolRepository.findByCategoryId(tool.getCategory().getId(), PageRequest.of(0, 4))
                    .getContent().stream()
                    .filter(t -> !t.getId().equals(toolId))
                    .collect(Collectors.toList());
        }

        return List.of();
    }
}
