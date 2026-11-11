package com.code.acklet.converter.generator;

import com.code.acklet.converter.generator.model.PdfDocumentModel;
import org.apache.poi.xslf.usermodel.*;
import org.springframework.stereotype.Component;

import java.awt.*;
import java.awt.geom.Rectangle2D;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Component
public class PptxGenerator {

    public GenerationResult generate(PdfDocumentModel model) throws IOException {
        try (XMLSlideShow ppt = new XMLSlideShow();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            // Slide size: 720 x 540 (standard 4:3 presentation slide)
            ppt.setPageSize(new Dimension(720, 540));

            int pageCount = model.getPages() != null && !model.getPages().isEmpty() ? model.getPages().size() : 1;

            for (int p = 1; p <= pageCount; p++) {
                XSLFSlide slide = ppt.createSlide();
                int finalP = p;

                double pdfWidth = 612.0;
                double pdfHeight = 792.0;
                if (model.getPages() != null && p <= model.getPages().size()) {
                    pdfWidth = model.getPages().get(p - 1).getWidth();
                    pdfHeight = model.getPages().get(p - 1).getHeight();
                }

                double scaleX = 720.0 / Math.max(100.0, pdfWidth);
                double scaleY = 540.0 / Math.max(100.0, pdfHeight);

                List<PdfDocumentModel.BlockModel> pageBlocks = model.getBlocks().stream()
                        .filter(b -> b.getPage() == finalP)
                        .toList();

                double currentY = 40.0;

                for (PdfDocumentModel.BlockModel b : pageBlocks) {
                    double x = 40.0;
                    double y = currentY;
                    double w = 640.0;
                    double h = 40.0;

                    if (b.getBbox() != null && b.getBbox().size() == 4) {
                        x = Math.max(20.0, Math.min(680.0, b.getBbox().get(0) * scaleX));
                        y = Math.max(20.0, Math.min(500.0, b.getBbox().get(1) * scaleY));
                        w = Math.max(50.0, Math.min(680.0, (b.getBbox().get(2) - b.getBbox().get(0)) * scaleX));
                        h = Math.max(20.0, (b.getBbox().get(3) - b.getBbox().get(1)) * scaleY);
                    }

                    switch (b.getType() != null ? b.getType().toLowerCase() : "paragraph") {
                        case "heading" -> {
                            XSLFTextBox textBox = slide.createTextBox();
                            textBox.setAnchor(new Rectangle2D.Double(x, y, w, Math.max(35.0, h)));
                            XSLFTextParagraph pGraph = textBox.addNewTextParagraph();
                            XSLFTextRun run = pGraph.addNewTextRun();
                            run.setText(b.getText() != null ? b.getText() : "");
                            run.setBold(true);
                            run.setFontSize(22.0);
                            run.setFontColor(new Color(17, 24, 39));
                            currentY = y + h + 15.0;
                        }
                        case "table" -> {
                            List<List<String>> rows = b.getRows();
                            if (rows != null && !rows.isEmpty()) {
                                int numRows = rows.size();
                                int numCols = rows.get(0).size();
                                XSLFTable table = slide.createTable(numRows, numCols);
                                table.setAnchor(new Rectangle2D.Double(x, y, w, Math.min(250.0, numRows * 24.0)));

                                for (int r = 0; r < numRows; r++) {
                                    List<String> row = rows.get(r);
                                    for (int c = 0; c < numCols; c++) {
                                        XSLFTableCell cell = table.getCell(r, c);
                                        if (cell != null) {
                                            String val = c < row.size() ? row.get(c) : "";
                                            cell.setText(val);
                                            if (r == 0) {
                                                cell.setFillColor(new Color(229, 231, 235));
                                            }
                                        }
                                    }
                                }
                                currentY = y + table.getAnchor().getHeight() + 15.0;
                            }
                        }
                        case "list" -> {
                            XSLFTextBox textBox = slide.createTextBox();
                            textBox.setAnchor(new Rectangle2D.Double(x, y, w, Math.max(30.0, h)));
                            if (b.getItems() != null) {
                                for (String itm : b.getItems()) {
                                    XSLFTextParagraph pGraph = textBox.addNewTextParagraph();
                                    XSLFTextRun run = pGraph.addNewTextRun();
                                    run.setText("• " + itm.replaceFirst("^[•\\-\\*■\\u2022]\\s*", ""));
                                    run.setFontSize(14.0);
                                    run.setFontColor(new Color(55, 65, 81));
                                }
                            }
                            currentY = y + h + 15.0;
                        }
                        case "paragraph", "caption", "footer" -> {
                            XSLFTextBox textBox = slide.createTextBox();
                            textBox.setAnchor(new Rectangle2D.Double(x, y, w, Math.max(30.0, h)));
                            XSLFTextParagraph pGraph = textBox.addNewTextParagraph();
                            XSLFTextRun run = pGraph.addNewTextRun();
                            run.setText(b.getText() != null ? b.getText() : "");
                            run.setFontSize(14.0);
                            run.setFontColor(new Color(55, 65, 81));
                            currentY = y + h + 15.0;
                        }
                    }
                }
            }

            ppt.write(baos);

            // As specified: "Fidelity is medium by default and must say so in the result"
            PdfDocumentModel.FidelityModel pptxFidelity = PdfDocumentModel.FidelityModel.builder()
                    .overall("medium")
                    .reasons(List.of("Slide layout reconstructed from document blocks; verify element alignment"))
                    .build();

            return GenerationResult.builder()
                    .data(baos.toByteArray())
                    .extension("pptx")
                    .mimeType("application/vnd.openxmlformats-officedocument.presentationml.presentation")
                    .fidelity(pptxFidelity)
                    .build();
        }
    }
}
