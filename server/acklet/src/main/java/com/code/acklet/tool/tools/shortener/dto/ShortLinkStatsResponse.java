package com.code.acklet.tool.tools.shortener.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortLinkStatsResponse {
    private String code;
    private long totalClicks;
    private long last7DaysClicks;
    private long last30DaysClicks;
    private Double trendRatio; // last 7 days vs previous 7 days
    private List<DailyClickData> dailyClicks;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyClickData {
        private LocalDate date;
        private long clicks;
    }
}

