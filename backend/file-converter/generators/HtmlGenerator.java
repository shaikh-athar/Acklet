package com.code.acklet.converter.generator;

import com.code.acklet.converter.generator.model.PdfDocumentModel;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class HtmlGenerator {

    public GenerationResult generate(PdfDocumentModel model) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n")
                .append("<meta charset=\"UTF-8\">\n")
                .append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n")
                .append("<title>Document</title>\n")
                .append("<style>\n")
                .append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; }\n")
                .append("h1, h2, h3, h4 { color: #111827; margin-top: 1.5em; margin-bottom: 0.5em; }\n")
                .append("p { margin-bottom: 1em; }\n")
                .append("ul { margin-bottom: 1em; padding-left: 24px; }\n")
                .append("li { margin-bottom: 0.35em; }\n")
                .append("table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }\n")
                .append("th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-size: 14px; }\n")
                .append("th { background-color: #f3f4f6; font-weight: 600; }\n")
                .append("caption { font-style: italic; color: #6b7280; margin-top: 6px; caption-side: bottom; }\n")
                .append("footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 12px; color: #9ca3af; text-align: right; }\n")
                .append("</style>\n</head>\n<body>\n<article>\n");

        for (PdfDocumentModel.BlockModel block : model.getBlocks()) {
            switch (block.getType() != null ? block.getType().toLowerCase() : "paragraph") {
                case "heading" -> {
                    int level = block.getLevel() != null ? block.getLevel() : 1;
                    int tagLevel = Math.max(1, Math.min(level, 4));
                    sb.append("<h").append(tagLevel).append(">")
                            .append(HtmlUtils.htmlEscape(block.getText() != null ? block.getText() : ""))
                            .append("</h").append(tagLevel).append(">\n");
                }
                case "list" -> {
                    List<String> items = block.getItems();
                    if (items != null) {
                        sb.append("<ul>\n");
                        for (String item : items) {
                            String text = item.replaceFirst("^[•\\-\\*■\\u2022]\\s*", "");
                            sb.append("  <li>").append(HtmlUtils.htmlEscape(text)).append("</li>\n");
                        }
                        sb.append("</ul>\n");
                    }
                }
                case "table" -> {
                    List<List<String>> rows = block.getRows();
                    if (rows != null && !rows.isEmpty()) {
                        sb.append("<table>\n");
                        List<String> header = rows.get(0);
                        sb.append("  <thead>\n    <tr>\n");
                        for (String hVal : header) {
                            sb.append("      <th>").append(HtmlUtils.htmlEscape(hVal)).append("</th>\n");
                        }
                        sb.append("    </tr>\n  </thead>\n  <tbody>\n");

                        for (int r = 1; r < rows.size(); r++) {
                            sb.append("    <tr>\n");
                            for (String cellVal : rows.get(r)) {
                                sb.append("      <td>").append(HtmlUtils.htmlEscape(cellVal)).append("</td>\n");
                            }
                            sb.append("    </tr>\n");
                        }
                        sb.append("  </tbody>\n</table>\n");
                    }
                }
                case "caption" -> {
                    sb.append("<p class=\"caption\"><em>")
                            .append(HtmlUtils.htmlEscape(block.getText() != null ? block.getText() : ""))
                            .append("</em></p>\n");
                }
                case "footer" -> {
                    sb.append("<footer>")
                            .append(HtmlUtils.htmlEscape(block.getText() != null ? block.getText() : ""))
                            .append("</footer>\n");
                }
                case "paragraph" -> {
                    sb.append("<p>")
                            .append(HtmlUtils.htmlEscape(block.getText() != null ? block.getText() : ""))
                            .append("</p>\n");
                }
            }
        }

        sb.append("</article>\n</body>\n</html>");
        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);

        return GenerationResult.builder()
                .data(bytes)
                .extension("html")
                .mimeType("text/html")
                .fidelity(model.getFidelity())
                .build();
    }
}
