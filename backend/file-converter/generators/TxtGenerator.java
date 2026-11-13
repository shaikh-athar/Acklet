package com.code.acklet.converter.generator;

import com.code.acklet.converter.generator.model.PdfDocumentModel;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class TxtGenerator {

    public GenerationResult generate(PdfDocumentModel model) {
        StringBuilder sb = new StringBuilder();

        for (PdfDocumentModel.BlockModel block : model.getBlocks()) {
            switch (block.getType() != null ? block.getType().toLowerCase() : "paragraph") {
                case "heading" -> {
                    sb.append("\n").append(block.getText() != null ? block.getText().trim() : "").append("\n\n");
                }
                case "list" -> {
                    List<String> items = block.getItems();
                    if (items != null) {
                        for (String item : items) {
                            sb.append(item.trim()).append("\n");
                        }
                        sb.append("\n");
                    }
                }
                case "table" -> {
                    List<List<String>> rows = block.getRows();
                    if (rows != null && !rows.isEmpty()) {
                        for (List<String> row : rows) {
                            sb.append(String.join("\t", row)).append("\n");
                        }
                        sb.append("\n");
                    }
                }
                case "caption", "footer", "paragraph" -> {
                    if (block.getText() != null && !block.getText().isBlank()) {
                        sb.append(block.getText().trim()).append("\n\n");
                    }
                }
            }
        }

        byte[] bytes = sb.toString().trim().getBytes(StandardCharsets.UTF_8);
        return GenerationResult.builder()
                .data(bytes)
                .extension("txt")
                .mimeType("text/plain")
                .fidelity(model.getFidelity())
                .build();
    }
}
