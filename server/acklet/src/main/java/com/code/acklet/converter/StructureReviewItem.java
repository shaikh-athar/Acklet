package com.code.acklet.converter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StructureReviewItem {
    private int page;
    private String blockType;
    private String reason;
    private String snippet;
    private double confidence;
}

