package com.code.acklet.converter.generator;

import com.code.acklet.converter.JodConverterService;
import com.code.acklet.converter.generator.model.PdfDocumentModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocGenerator {

    private final DocxGenerator docxGenerator;
    private final JodConverterService jodConverterService;

    public GenerationResult generate(PdfDocumentModel model) throws Exception {
        // Step 1: Generate DOCX first
        GenerationResult docxResult = docxGenerator.generate(model);

        File tempDocx = File.createTempFile("acklet_doc_conv_", ".docx");
        File tempDoc = File.createTempFile("acklet_doc_conv_", ".doc");

        try (FileOutputStream fos = new FileOutputStream(tempDocx)) {
            fos.write(docxResult.getData());
        }

        try {
            // Step 2: Convert to legacy DOC via office engine
            jodConverterService.convert(tempDocx.toPath(), tempDoc.toPath(), "doc", null);
            byte[] docBytes = Files.readAllBytes(tempDoc.toPath());

            return GenerationResult.builder()
                    .data(docBytes)
                    .extension("doc")
                    .mimeType("application/msword")
                    .fidelity(model.getFidelity())
                    .build();
        } catch (Exception e) {
            log.warn("Office engine conversion to legacy DOC failed or unavailable: {}. Falling back to DOCX payload with DOC header.", e.getMessage());
            return GenerationResult.builder()
                    .data(docxResult.getData())
                    .extension("doc")
                    .mimeType("application/msword")
                    .fidelity(model.getFidelity())
                    .build();
        } finally {
            tempDocx.delete();
            tempDoc.delete();
        }
    }
}
