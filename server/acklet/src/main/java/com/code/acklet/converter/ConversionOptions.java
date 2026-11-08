package com.code.acklet.converter;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Options configuring batch conversion behavior and fidelity.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConversionOptions {

    /**
     * Target format (e.g., pdf, docx, xlsx).
     */
    @Builder.Default
    private String targetFormat = "pdf";

    /**
     * Layout fidelity: "editable", "balanced" (default), or "exact".
     */
    @Builder.Default
    private String fidelity = "balanced";

    /**
     * Whether to apply OCR for scanned documents.
     */
    @Builder.Default
    private boolean ocr = false;

    /**
     * Whether to preserve embedded raster and vector images.
     */
    @Builder.Default
    private boolean keepImages = true;

    /**
     * Page range specification (e.g., "1-3, 5", or "all").
     */
    @Builder.Default
    private String pageRange = "";

    /**
     * Output delivery mode: "individual" (default) or "zip".
     */
    @Builder.Default
    private String deliveryMode = "individual";
}

