package com.code.acklet.converter.generator;

import com.code.acklet.converter.generator.model.PdfDocumentModel.FidelityModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerationResult {
    private byte[] data;
    private String extension;
    private String mimeType;
    private FidelityModel fidelity;
}

