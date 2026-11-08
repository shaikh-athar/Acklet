package com.code.acklet.converter.generator;

import com.code.acklet.converter.generator.model.PdfDocumentModel;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class XlsxGenerator {

    public GenerationResult generate(PdfDocumentModel model) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.BLACK.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.MEDIUM);

            // Regular cell border style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            List<PdfDocumentModel.BlockModel> tableBlocks = model.getBlocks().stream()
                    .filter(b -> "table".equalsIgnoreCase(b.getType()) && b.getRows() != null && !b.getRows().isEmpty())
                    .toList();

            if (!tableBlocks.isEmpty()) {
                int tableIdx = 1;
                for (PdfDocumentModel.BlockModel tblBlock : tableBlocks) {
                    String sheetName = "Table " + tableIdx++;
                    Sheet sheet = workbook.createSheet(sheetName);
                    List<List<String>> rows = tblBlock.getRows();

                    int rIdx = 0;
                    for (List<String> rowData : rows) {
                        Row row = sheet.createRow(rIdx);
                        boolean isHeader = (rIdx == 0);

                        for (int cIdx = 0; cIdx < rowData.size(); cIdx++) {
                            Cell cell = row.createCell(cIdx);
                            String raw = rowData.get(cIdx);
                            writeParsedCellValue(cell, raw, isHeader ? headerStyle : dataStyle);
                        }
                        rIdx++;
                    }

                    // Auto-size columns up to 30 characters width
                    int maxCols = rows.stream().mapToInt(List::size).max().orElse(1);
                    for (int c = 0; c < maxCols; c++) {
                        sheet.autoSizeColumn(c);
                        int currentWidth = sheet.getColumnWidth(c);
                        if (currentWidth < 3000) sheet.setColumnWidth(c, 3500);
                        if (currentWidth > 12000) sheet.setColumnWidth(c, 12000);
                    }
                }
            } else {
                // When no table is found, create one sheet per page
                int pageCount = model.getPages() != null && !model.getPages().isEmpty() ? model.getPages().size() : 1;
                for (int p = 1; p <= pageCount; p++) {
                    Sheet sheet = workbook.createSheet("Page " + p);
                    int finalP = p;
                    List<PdfDocumentModel.BlockModel> pageBlocks = model.getBlocks().stream()
                            .filter(b -> b.getPage() == finalP)
                            .toList();

                    int rIdx = 0;
                    for (PdfDocumentModel.BlockModel b : pageBlocks) {
                        if (b.getText() != null && !b.getText().isBlank()) {
                            Row row = sheet.createRow(rIdx++);
                            Cell cell = row.createCell(0);
                            cell.setCellValue(b.getText().trim());
                            if ("heading".equalsIgnoreCase(b.getType())) {
                                cell.setCellStyle(headerStyle);
                            }
                        } else if (b.getItems() != null) {
                            for (String itm : b.getItems()) {
                                Row row = sheet.createRow(rIdx++);
                                Cell cell = row.createCell(0);
                                cell.setCellValue(itm.trim());
                            }
                        }
                    }
                    sheet.setColumnWidth(0, 15000);
                }
            }

            workbook.write(baos);
            return GenerationResult.builder()
                    .data(baos.toByteArray())
                    .extension("xlsx")
                    .mimeType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .fidelity(model.getFidelity())
                    .build();
        }
    }

    private void writeParsedCellValue(Cell cell, String raw, CellStyle style) {
        cell.setCellStyle(style);
        if (raw == null || raw.isBlank()) {
            cell.setCellValue("");
            return;
        }

        String trimmed = raw.trim();
        // Check numeric (e.g. "123", "45.67", "$1,234.50")
        String numCandidate = trimmed.replaceAll("[$,]", "");
        try {
            double d = Double.parseDouble(numCandidate);
            cell.setCellValue(d);
            return;
        } catch (NumberFormatException ignored) {
        }

        cell.setCellValue(trimmed);
    }
}
