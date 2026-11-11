package com.code.acklet.converter.generator;

import com.code.acklet.converter.generator.model.PdfDocumentModel;
import org.apache.poi.xwpf.usermodel.*;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTShd;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STShd;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Component
public class DocxGenerator {

    public GenerationResult generate(PdfDocumentModel model) throws IOException {
        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            int lastPage = 1;
            boolean firstBlock = true;

            for (PdfDocumentModel.BlockModel block : model.getBlocks()) {
                if (block.getPage() > lastPage) {
                    // Page break between pages
                    XWPFParagraph pageBreakP = doc.createParagraph();
                    pageBreakP.setPageBreak(true);
                    lastPage = block.getPage();
                }

                switch (block.getType() != null ? block.getType().toLowerCase() : "paragraph") {
                    case "heading" -> {
                        XWPFParagraph p = doc.createParagraph();
                        int level = block.getLevel() != null ? block.getLevel() : 1;
                        p.setStyle("Heading" + Math.min(level, 3));
                        p.setSpacingBefore(firstBlock ? 0 : 240);
                        p.setSpacingAfter(120);

                        XWPFRun r = p.createRun();
                        r.setText(block.getText() != null ? block.getText() : "");
                        r.setBold(true);
                        r.setFontFamily("Calibri");
                        r.setFontSize(level == 1 ? 18 : (level == 2 ? 14 : 12));
                        r.setColor("1F2937");
                    }
                    case "list" -> {
                        List<String> items = block.getItems();
                        if (items != null) {
                            for (String item : items) {
                                XWPFParagraph p = doc.createParagraph();
                                p.setSpacingBefore(40);
                                p.setSpacingAfter(40);
                                p.setIndentationLeft(360);

                                XWPFRun r = p.createRun();
                                String text = item.replaceFirst("^[•\\-\\*■\\u2022]\\s*", "");
                                r.setText("• " + text);
                                r.setFontFamily("Calibri");
                                r.setFontSize(11);
                                r.setColor("374151");
                            }
                        }
                    }
                    case "table" -> {
                        List<List<String>> rows = block.getRows();
                        if (rows != null && !rows.isEmpty()) {
                            int rowCount = rows.size();
                            int colCount = rows.stream().mapToInt(List::size).max().orElse(1);

                            XWPFTable table = doc.createTable(rowCount, colCount);
                            table.setWidth("100%");

                            for (int i = 0; i < rowCount; i++) {
                                List<String> rowData = rows.get(i);
                                XWPFTableRow tableRow = table.getRow(i);
                                if (tableRow == null) {
                                    tableRow = table.createRow();
                                }

                                boolean isHeader = (i == 0);
                                for (int j = 0; j < colCount; j++) {
                                    XWPFTableCell cell = tableRow.getCell(j);
                                    if (cell == null) {
                                        cell = tableRow.addNewTableCell();
                                    }

                                    String val = j < rowData.size() ? rowData.get(j) : "";
                                    cell.removeParagraph(0);
                                    XWPFParagraph cp = cell.addParagraph();
                                    cp.setSpacingBefore(60);
                                    cp.setSpacingAfter(60);

                                    XWPFRun cr = cp.createRun();
                                    cr.setText(val);
                                    cr.setFontFamily("Calibri");
                                    cr.setFontSize(10);

                                    if (isHeader) {
                                        cr.setBold(true);
                                        cr.setColor("111827");
                                        CTShd ctshd = cell.getCTTc().addNewTcPr().addNewShd();
                                        ctshd.setVal(STShd.CLEAR);
                                        ctshd.setColor("auto");
                                        ctshd.setFill("E5E7EB");
                                    } else {
                                        cr.setColor("374151");
                                    }
                                }
                            }
                            doc.createParagraph().setSpacingAfter(120);
                        }
                    }
                    case "caption" -> {
                        XWPFParagraph p = doc.createParagraph();
                        p.setAlignment(ParagraphAlignment.CENTER);
                        p.setSpacingBefore(60);
                        p.setSpacingAfter(140);

                        XWPFRun r = p.createRun();
                        r.setText(block.getText() != null ? block.getText() : "");
                        r.setItalic(true);
                        r.setFontFamily("Calibri");
                        r.setFontSize(9.5);
                        r.setColor("6B7280");
                    }
                    case "footer" -> {
                        XWPFParagraph p = doc.createParagraph();
                        p.setAlignment(ParagraphAlignment.RIGHT);
                        p.setSpacingBefore(180);

                        XWPFRun r = p.createRun();
                        r.setText(block.getText() != null ? block.getText() : "");
                        r.setFontFamily("Calibri");
                        r.setFontSize(9);
                        r.setColor("9CA3AF");
                    }
                    case "paragraph" -> {
                        XWPFParagraph p = doc.createParagraph();
                        p.setSpacingBefore(60);
                        p.setSpacingAfter(120);

                        XWPFRun r = p.createRun();
                        r.setText(block.getText() != null ? block.getText() : "");
                        r.setFontFamily("Calibri");
                        r.setFontSize(11);
                        r.setColor("374151");
                    }
                }
                firstBlock = false;
            }

            doc.write(baos);
            return GenerationResult.builder()
                    .data(baos.toByteArray())
                    .extension("docx")
                    .mimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                    .fidelity(model.getFidelity())
                    .build();
        }
    }
}
