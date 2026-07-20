package com.code.acklet.discovery.ranking;

import com.code.acklet.tool.entity.Tool;
import org.springframework.stereotype.Component;

@Component
public class PopularityQualityRankingStrategy implements ToolRankingStrategy {

    @Override
    public double calculateScore(Tool tool, String searchKeyword) {
        double score = 0.0;

        // Logarithmic usage count score
        if (tool.getUsageCount() > 0) {
            score += Math.log10(tool.getUsageCount() + 1) * 2.0;
        }

        if (tool.isFeatured()) {
            score += 3.0;
        }

        if (tool.isTrending()) {
            score += 2.5;
        }

        return score;
    }
}
