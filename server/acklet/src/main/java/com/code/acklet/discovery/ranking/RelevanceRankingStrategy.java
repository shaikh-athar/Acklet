package com.code.acklet.discovery.ranking;

import com.code.acklet.tool.entity.Tool;
import org.springframework.stereotype.Component;

@Component
public class RelevanceRankingStrategy implements ToolRankingStrategy {

    @Override
    public double calculateScore(Tool tool, String searchKeyword) {
        if (searchKeyword == null || searchKeyword.trim().isEmpty()) {
            return 1.0;
        }
        String kw = searchKeyword.toLowerCase().trim();
        String name = tool.getName() != null ? tool.getName().toLowerCase() : "";
        String desc = tool.getDescription() != null ? tool.getDescription().toLowerCase() : "";

        double score = 0.0;
        if (name.equals(kw)) {
            score += 10.0;
        } else if (name.startsWith(kw)) {
            score += 7.0;
        } else if (name.contains(kw)) {
            score += 5.0;
        }

        if (desc.contains(kw)) {
            score += 2.0;
        }
        return score;
    }
}
