package com.code.acklet.converter.generator.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PdfDocumentModel {

    @Builder.Default
    private String schemaVersion = "1.0";

    @Builder.Default
    private List<PageInfo> pages = new ArrayList<>();

    @Builder.Default
    private List<BlockModel> blocks = new ArrayList<>();

    private FidelityModel fidelity;

    @Builder.Default
    private List<WarningModel> warnings = new ArrayList<>();

    private boolean hasScannedPages;
    private int headingCount;
    private int tableCount;
    private int imageCount;
    private boolean isTwoColumn;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PageInfo {
        private int number;
        private double width;
        private double height;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BlockModel {
        private String type; // heading, paragraph, list, table, image, caption, footer
        private int page;
        private Integer level;
        private String text;
        private List<String> items;
        private List<List<String>> rows;
        private List<Double> bbox;
        private double confidence;
        private boolean reviewRequired;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FidelityModel {
        private String overall; // high, medium, low
        @Builder.Default
        private List<String> reasons = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WarningModel {
        private String code;
        private int page;
        private String message;
    }
}

