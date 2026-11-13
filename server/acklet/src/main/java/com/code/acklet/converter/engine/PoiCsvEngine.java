package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.exception.ConversionException;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class PoiCsvEngine implements ConversionEngine {

    @Override
    public String getName() {
        return "poi-csv";
    }

    @Override
    public boolean supports(String inputType, String outputType) {
        if (inputType == null || outputType == null) return false;
        String in = inputType.toLowerCase().trim();
        String out = outputType.toLowerCase().trim();

        return ("xlsx".equals(in) && "csv".equals(out))
                || ("csv".equals(in) && "xlsx".equals(out))
                || ("tsv".equals(in) && "csv".equals(out))
                || ("csv".equals(in) && "tsv".equals(out));
    }

    @Override
    public void convert(Path source, Path target, String inExt, String outExt, ConversionOptions options, ProgressListener listener) throws Exception {
        String in = inExt.toLowerCase().trim();
        String out = outExt.toLowerCase().trim();

        if (listener != null) listener.onProgress(20);

        if ("xlsx".equals(in) && "csv".equals(out)) {
            convertXlsxToCsv(source, target);
        } else if ("csv".equals(in) && "xlsx".equals(out)) {
            convertCsvToXlsx(source, target, ',');
        } else if ("tsv".equals(in) && "csv".equals(out)) {
            translateDelimiters(source, target, '\t', ',');
        } else if ("csv".equals(in) && "tsv".equals(out)) {
            translateDelimiters(source, target, ',', '\t');
        } else {
            throw new ConversionException("UNSUPPORTED_PAIR: Unsupported tabular pair: " + in + " -> " + out);
        }

        if (listener != null) listener.onProgress(100);
    }

    private void convertXlsxToCsv(Path source, Path target) throws IOException {
        try (InputStream inp = Files.newInputStream(source);
             Workbook wb = WorkbookFactory.create(inp);
             BufferedWriter writer = Files.newBufferedWriter(target, StandardCharsets.UTF_8)) {

            Sheet sheet = wb.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            for (Row row : sheet) {
                List<String> line = new ArrayList<>();
                for (int i = 0; i < row.getLastCellNum(); i++) {
                    Cell cell = row.getCell(i, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                    String val = formatter.formatCellValue(cell);
                    if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
                        val = "\"" + val.replace("\"", "\"\"") + "\"";
                    }
                    line.add(val);
                }
                writer.write(String.join(",", line));
                writer.newLine();
            }
        }
    }

    private void convertCsvToXlsx(Path source, Path target, char delimiter) throws IOException {
        List<String> lines = Files.readAllLines(source, StandardCharsets.UTF_8);
        try (Workbook wb = new XSSFWorkbook();
             OutputStream out = Files.newOutputStream(target)) {

            Sheet sheet = wb.createSheet("Sheet1");
            int rowIdx = 0;

            for (String line : lines) {
                Row row = sheet.createRow(rowIdx++);
                String[] cells = splitLine(line, delimiter);
                for (int c = 0; c < cells.length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(cells[c]);
                }
            }

            wb.write(out);
        }
    }

    private void translateDelimiters(Path source, Path target, char from, char to) throws IOException {
        List<String> lines = Files.readAllLines(source, StandardCharsets.UTF_8);
        try (BufferedWriter writer = Files.newBufferedWriter(target, StandardCharsets.UTF_8)) {
            for (String line : lines) {
                String[] parts = splitLine(line, from);
                List<String> outCells = new ArrayList<>();
                for (String part : parts) {
                    if (part.indexOf(to) >= 0 || part.contains("\"") || part.contains("\n")) {
                        outCells.add("\"" + part.replace("\"", "\"\"") + "\"");
                    } else {
                        outCells.add(part);
                    }
                }
                writer.write(String.join(String.valueOf(to), outCells));
                writer.newLine();
            }
        }
    }

    private String[] splitLine(String line, char delimiter) {
        List<String> result = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '\"') {
                inQuotes = !inQuotes;
            } else if (c == delimiter && !inQuotes) {
                result.add(cur.toString().trim());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        result.add(cur.toString().trim());
        return result.toArray(new String[0]);
    }
}

