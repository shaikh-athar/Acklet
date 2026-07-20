package com.code.acklet.discovery.ranking;

import com.code.acklet.discovery.entity.DiscoveryRankingWeight;
import com.code.acklet.discovery.repository.DiscoveryRankingWeightRepository;
import com.code.acklet.tool.entity.Tool;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompositeRankingEngine {

    private final RelevanceRankingStrategy relevanceStrategy;
    private final PopularityQualityRankingStrategy popularityStrategy;
    private final DiscoveryRankingWeightRepository weightsRepository;

    public List<Tool> rankTools(List<Tool> tools, String searchKeyword) {
        DiscoveryRankingWeight weightConfig = weightsRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> DiscoveryRankingWeight.builder()
                        .relevanceWeight(0.4)
                        .popularityWeight(0.25)
                        .trendingWeight(0.15)
                        .qualityWeight(0.2)
                        .build());

        return tools.stream()
                .sorted(Comparator.comparingDouble((Tool tool) -> computeCompositeScore(tool, searchKeyword, weightConfig)).reversed())
                .collect(Collectors.toList());
    }

    public double computeCompositeScore(Tool tool, String keyword, DiscoveryRankingWeight weights) {
        double relScore = relevanceStrategy.calculateScore(tool, keyword);
        double popScore = popularityStrategy.calculateScore(tool, keyword);

        return (relScore * weights.getRelevanceWeight()) + (popScore * weights.getPopularityWeight());
    }
}
