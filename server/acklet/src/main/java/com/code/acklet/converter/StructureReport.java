package com.code.acklet.converter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Detailed report produced by document structure analysis and fidelity assessment.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StructureReport {

    @Builder.Default
    private int headingsCount = 0;

    @Builder.Default
    private int tablesCount = 0;

    @Builder.Default
    private int columnsCount = 1;

    @Builder.Default
    private int imagesCount = 0;

    @Builder.Default
    private boolean hasLowConfidence = false;

    @Builder.Default
    private List<StructureChip> chips = new ArrayList<>();

    @Builder.Default
    private String summary = "";

    @Builder.Default
    private String fidelityLevel = "high"; // high, medium, low

    @Builder.Default
    private List<String> fidelityReasons = new ArrayList<>();

    private String recommendedTarget; // docx, xlsx, etc.

    @Builder.Default
    private List<StructureReviewItem> reviewItems = new ArrayList<>();
}
