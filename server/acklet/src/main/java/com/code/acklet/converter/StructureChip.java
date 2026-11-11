package com.code.acklet.converter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Visual badge representing a detected structural element within a document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StructureChip {

    /**
     * Element type identifier: "headings", "tables", "columns", or "images".
     */
    private String type;

    /**
     * Human-readable label (e.g. "4 Headings", "2 Tables").
     */
    private String label;

    /**
     * Number of detected items.
     */
    private int count;

    /**
     * True if detection confidence is low (rendered in amber warning color).
     */
    private boolean lowConfidence;

    /**
     * Confidence description (e.g. "High confidence", "Heuristic estimate").
     */
    private String confidenceLabel;
}

