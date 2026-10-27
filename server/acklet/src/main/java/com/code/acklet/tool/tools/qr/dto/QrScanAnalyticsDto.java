package com.code.acklet.tool.tools.qr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrScanAnalyticsDto {

    private String code;
    private long totalScans;
    private long uniqueVisitors;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MetricEntry {
        private String key;
        private Long count;
    }

    private List<MetricEntry> dailyScans;
    private List<MetricEntry> byCountry;
    private List<MetricEntry> byDevice;
    private List<MetricEntry> byOs;
    private List<MetricEntry> byBrowser;
}
