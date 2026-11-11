package com.code.acklet.converter.engine;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionEntry {
    private String inputType;
    private String outputType;
    private String runtime; // "server" | "browser"
    private String engine;
    private String tier;    // "stable" | "beta"
    private int phase;
    private String status;  // "tested" | "planned"
    private String queue;   // "fc.convert.office" | "fc.convert.pdf" | "fc.convert.image" | "fc.convert.text"
    private int maxSizeMb;
    private int timeoutSec;
    private int recommendationScore;
    private Map<String, Boolean> flags;
}
