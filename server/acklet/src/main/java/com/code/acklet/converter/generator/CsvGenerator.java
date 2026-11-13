package com.code.acklet.converter.generator;

import com.code.acklet.converter.generator.model.PdfDocumentModel;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class CsvGenerator {

    public GenerationResult generate(PdfDocumentModel model) {
        StringBuilder sb = new StringBuilder();

        List<PdfDocumentModel.BlockModel> tableBlocks = model.getBlocks().stream()
                .filter(b -> "table".equalsIgnoreCase(b.getType()) && b.getRows() != null && !b.getRows().isEmpty())
                .toList();

        if (!tableBlocks.isEmpty()) {
            for (PdfDocumentModel.BlockModel tbl : tableBlocks) {
                for (List<String> row : tbl.getRows()) {
                    for (int c = 0; c < row.size(); c++) {
                        sb.append(escapeCsv(row.get(c)));
                        if (c < row.size() - 1) sb.append(",");
                    }
                    sb.append("\n");
                }
                sb.append("\n"); // Separate tables
            }
        } else {
            // Fallback: lines as single-column CSV
            for (PdfDocumentModel.BlockModel b : model.getBlocks()) {
                if (b.getText() != null && !b.getText().isBlank()) {
                    sb.append(escapeCsv(b.getText().trim())).append("\n");
                } else if (b.getItems() != null) {
                    for (String itm : b.getItems()) {
                        sb.append(escapeCsv(itm.trim())).append("\n");
                    }
                }
            }
        }

        byte[] bytes = sb.toString().trim().getBytes(StandardCharsets.UTF_8);
        return GenerationResult.builder()
                .data(bytes)
                .extension("csv")
                .mimeType("text/csv")
                .fidelity(model.getFidelity())
                .build();
    }

    private String escapeCsv(String val) {
        if (val == null) return "\"\"";
        String escaped = val.replace("\"", "\"\"");
        if (val.contains(",") || val.contains("\n") || val.contains("\"")) {
            return "\"" + escaped + "\"";
        }
        return val;
    }
}

