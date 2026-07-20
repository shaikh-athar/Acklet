package com.code.acklet.discovery.ranking;

import com.code.acklet.tool.entity.Tool;

public interface ToolRankingStrategy {
    double calculateScore(Tool tool, String searchKeyword);
}
