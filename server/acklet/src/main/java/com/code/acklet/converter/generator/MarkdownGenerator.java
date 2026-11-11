package com.code.acklet.converter.generator;

import com.code.acklet.converter.generator.model.PdfDocumentModel;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class MarkdownGenerator {

    public GenerationResult generate(PdfDocumentModel model) {
        StringBuilder sb = new StringBuilder();

        for (PdfDocumentModel.BlockModel block : model.getBlocks()) {
            switch (block.getType() != null ? block.getType().toLowerCase() : "paragraph") {
                case "heading" -> {
                    int level = block.getLevel() != null ? block.getLevel() : 1;
                    sb.append("\n").append("#".repeat(Math.max(1, Math.min(level, 4))))
                            .append(" ")
                            .append(cleanMarkdown(block.getText()))
                            .append("\n\n");
                }
                case "list" -> {
                    List<String> items = block.getItems();
                    if (items != null) {
                        for (String item : items) {
                            String text = item.replaceFirst("^[•\\-\\*■\\u2022]\\s*", "");
                            sb.append("- ").append(cleanMarkdown(text)).append("\n");
                        }
                        sb.append("\n");
                    }
                }
                case "table" -> {
                    List<List<String>> rows = block.getRows();
                    if (rows != null && !rows.isEmpty()) {
                        int colCount = rows.stream().mapToInt(List::size).max().orElse(1);
                        List<String> header = rows.get(0);

                        sb.append("|");
                        for (int c = 0; c < colCount; c++) {
                            String hVal = c < header.size() ? header.get(c) : "";
                            sb.append(" ").append(cleanMarkdown(hVal)).append(" |");
                        }
                        sb.append("\n|");
                        for (int c = 0; c < colCount; c++) {
                            sb.append(" --- |");
                        }
                        sb.append("\n");

                        for (int r = 1; r < rows.size(); r++) {
                            List<String> row = rows.get(r);
                            sb.append("|");
                            for (int c = 0; c < colCount; c++) {
                                String rVal = c < row.size() ? row.get(c) : "";
                                sb.append(" ").append(cleanMarkdown(rVal)).append(" |");
                            }
                            sb.append("\n");
                        }
                        sb.append("\n");
                    }
                }
                case "caption" -> {
                    sb.append("*" + cleanMarkdown(block.getText()) + "*\n\n");
                }
                case "footer" -> {
                    sb.append("\n---\n*" + cleanMarkdown(block.getText()) + "*\n\n");
                }
                case "paragraph" -> {
                    sb.append(cleanMarkdown(block.getText())).append("\n\n");
                }
            }
        }

        byte[] bytes = sb.toString().trim().getBytes(StandardCharsets.UTF_8);
        return GenerationResult.builder()
                .data(bytes)
                .extension("md")
                .mimeType("text/markdown")
                .fidelity(model.getFidelity())
                .build();
    }

    private String cleanMarkdown(String text) {
        if (text == null) return "";
        return text.replace("|", "\\|").replace("\r", "").trim();
    }
}

