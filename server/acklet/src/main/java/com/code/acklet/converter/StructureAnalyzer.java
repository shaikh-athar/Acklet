package com.code.acklet.converter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Analyzes document structure to detect headings, tables, columns, and images.
 * Emits visual structure chips with confidence grading.
 */
@Slf4j
@Component
public class StructureAnalyzer {

    private final com.code.acklet.converter.generator.PdfStructureClient pdfStructureClient;

    public StructureAnalyzer() {
        this.pdfStructureClient = new com.code.acklet.converter.generator.PdfStructureClient();
    }

    @org.springframework.beans.factory.annotation.Autowired
    public StructureAnalyzer(com.code.acklet.converter.generator.PdfStructureClient pdfStructureClient) {
        this.pdfStructureClient = pdfStructureClient;
    }

    /**
     * Performs structural inspection of uploaded document bytes.
     */
    public StructureReport analyze(byte[] content, String fileName, String extension) {
        if (content == null || content.length == 0) {
            return buildFallbackReport("Empty document");
        }

        String ext = (extension != null ? extension : "").toLowerCase().trim();
        try {
            return switch (ext) {
                case "docx" -> analyzeDocx(content);
                case "xlsx", "xls" -> analyzeSpreadsheet(content, ext);
                case "pptx", "ppt" -> analyzePresentation(content, ext);
                case "pdf" -> analyzePdf(content);
                case "odt", "ods", "odp" -> analyzeOpenDocument(content);
                case "csv", "tsv" -> analyzeDelimited(content, ext);
                case "txt" -> analyzePlainText(content);
                default -> analyzeHeuristic(content);
            };
        } catch (Exception e) {
            log.warn("Structure analysis error on file '{}': {}", fileName, e.getMessage());
            return analyzeHeuristic(content);
        }
    }

    private StructureReport analyzeDocx(byte[] content) {
        int headings = 0;
        int tables = 0;
        int images = 0;
        int columns = 1;
        boolean lowConfidence = false;

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(content))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String name = entry.getName();
                if (name.startsWith("word/media/")) {
                    images++;
                } else if ("word/document.xml".equals(name)) {
                    byte[] docBytes = zis.readAllBytes();
                    String xml = new String(docBytes, StandardCharsets.UTF_8);

                    // Count tables (<w:tbl)
                    tables += countOccurrences(xml, "<w:tbl");

                    // Count headings
                    headings += countOccurrences(xml, "Heading");
                    headings += countOccurrences(xml, "w:val=\"Title\"");

                    // Count inline drawings if not already covered by media entries
                    int drawings = countOccurrences(xml, "<w:drawing");
                    if (images == 0 && drawings > 0) {
                        images = drawings;
                    }

                    // Check column definitions
                    if (xml.contains("<w:cols") && xml.contains("w:num=\"2\"")) {
                        columns = 2;
                    } else if (xml.contains("<w:cols") && xml.contains("w:num=\"3\"")) {
                        columns = 3;
                    }
                }
            }
        } catch (Exception e) {
            lowConfidence = true;
        }

        // Apply realistic bounds for empty sample templates
        if (headings == 0 && tables == 0 && images == 0) {
            headings = 1;
            lowConfidence = true;
        }

        return buildReport(headings, tables, columns, images, lowConfidence);
    }

    private StructureReport analyzeSpreadsheet(byte[] content, String ext) {
        int tables = 1;
        int columns = 4;
        int images = 0;
        boolean lowConfidence = false;

        if ("xlsx".equalsIgnoreCase(ext)) {
            try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(content))) {
                ZipEntry entry;
                while ((entry = zis.getNextEntry()) != null) {
                    String name = entry.getName();
                    if (name.startsWith("xl/media/")) {
                        images++;
                    } else if (name.startsWith("xl/tables/")) {
                        tables++;
                    }
                }
            } catch (Exception e) {
                lowConfidence = true;
            }
        } else {
            lowConfidence = true;
        }

        return buildReport(0, tables, columns, images, lowConfidence);
    }

    private StructureReport analyzePresentation(byte[] content, String ext) {
        int headings = 0;
        int tables = 0;
        int images = 0;
        boolean lowConfidence = false;

        if ("pptx".equalsIgnoreCase(ext)) {
            try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(content))) {
                ZipEntry entry;
                while ((entry = zis.getNextEntry()) != null) {
                    String name = entry.getName();
                    if (name.startsWith("ppt/slides/slide")) {
                        headings++; // each slide title
                    } else if (name.startsWith("ppt/media/")) {
                        images++;
                    }
                }
            } catch (Exception e) {
                lowConfidence = true;
            }
        } else {
            lowConfidence = true;
        }

        return buildReport(Math.max(1, headings), tables, 1, images, lowConfidence);
    }

    private StructureReport analyzePdf(byte[] content) {
        try {
            com.code.acklet.converter.generator.model.PdfDocumentModel model = pdfStructureClient.extractStructure(content, false, 0.85);
            return buildReportFromModel(model);
        } catch (Exception e) {
            log.warn("Structure client extraction failed, using fallback regex: {}", e.getMessage());
            return fallbackAnalyzePdf(content);
        }
    }

    private StructureReport fallbackAnalyzePdf(byte[] content) {
        String raw = new String(content, 0, Math.min(content.length, 32768), StandardCharsets.ISO_8859_1);
        int images = countOccurrences(raw, "/Subtype /Image") + countOccurrences(raw, "/Subtype/Image");
        int pages = Math.max(1, countOccurrences(raw, "/Type /Page") - countOccurrences(raw, "/Type /Pages"));
        int headings = Math.max(1, pages);
        boolean lowConfidence = (images == 0 && pages == 1);

        return buildReport(headings, 0, 1, images, lowConfidence);
    }

    private StructureReport buildReportFromModel(com.code.acklet.converter.generator.model.PdfDocumentModel model) {
        int headings = model.getHeadingCount();
        int tables = model.getTableCount();
        int columns = model.isTwoColumn() ? 2 : 1;
        int images = model.getImageCount();
        boolean lowConfidence = "low".equalsIgnoreCase(model.getFidelity() != null ? model.getFidelity().getOverall() : "high");

        List<StructureChip> chips = new ArrayList<>();
        chips.add(StructureChip.builder()
                .type("headings")
                .label(headings + " " + (headings == 1 ? "Heading" : "Headings"))
                .count(headings)
                .lowConfidence(headings == 0)
                .confidenceLabel(headings > 0 ? "Verified" : "No headings")
                .build());

        chips.add(StructureChip.builder()
                .type("tables")
                .label(tables + " " + (tables == 1 ? "Table" : "Tables"))
                .count(tables)
                .lowConfidence(false)
                .confidenceLabel(tables > 0 ? "Tabular data" : "Standard text")
                .build());

        chips.add(StructureChip.builder()
                .type("columns")
                .label(columns + " " + (columns == 1 ? "Column" : "Columns"))
                .count(columns)
                .lowConfidence(model.isTwoColumn())
                .confidenceLabel(model.isTwoColumn() ? "Multi-column" : "Standard flow")
                .build());

        chips.add(StructureChip.builder()
                .type("images")
                .label(images + " " + (images == 1 ? "Image" : "Images"))
                .count(images)
                .lowConfidence(false)
                .confidenceLabel(images > 0 ? "Graphics" : "No graphics")
                .build());

        String fidelityLevel = model.getFidelity() != null && model.getFidelity().getOverall() != null
                ? model.getFidelity().getOverall().toLowerCase()
                : "high";

        List<String> reasons = model.getFidelity() != null && model.getFidelity().getReasons() != null
                ? model.getFidelity().getReasons()
                : new ArrayList<>();

        List<StructureReviewItem> reviewItems = new ArrayList<>();
        if (model.getBlocks() != null) {
            for (com.code.acklet.converter.generator.model.PdfDocumentModel.BlockModel b : model.getBlocks()) {
                if (b.isReviewRequired()) {
                    String snippet = b.getText() != null ? b.getText() : (b.getItems() != null ? String.join(" ", b.getItems()) : "Table block");
                    if (snippet.length() > 60) snippet = snippet.substring(0, 57) + "...";
                    reviewItems.add(StructureReviewItem.builder()
                            .page(b.getPage())
                            .blockType(b.getType() != null ? b.getType() : "element")
                            .reason("Low layout confidence on " + b.getType())
                            .snippet(snippet)
                            .confidence(b.getConfidence())
                            .build());
                }
            }
        }

        // Determine recommended target: XLSX for tables/invoices, DOCX for resume/reports
        String recommendedTarget = (tables > 0) ? "xlsx" : "docx";

        String summary = String.format("Detected %d headings, %d tables, %d columns, and %d images.",
                headings, tables, columns, images);

        return StructureReport.builder()
                .headingsCount(headings)
                .tablesCount(tables)
                .columnsCount(columns)
                .imagesCount(images)
                .hasLowConfidence(lowConfidence)
                .chips(chips)
                .summary(summary)
                .fidelityLevel(fidelityLevel)
                .fidelityReasons(reasons)
                .recommendedTarget(recommendedTarget)
                .reviewItems(reviewItems)
                .build();
    }

    private StructureReport analyzeOpenDocument(byte[] content) {
        int headings = 0;
        int tables = 0;
        int images = 0;
        boolean lowConfidence = false;

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(content))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().startsWith("Pictures/")) {
                    images++;
                } else if ("content.xml".equals(entry.getName())) {
                    String xml = new String(zis.readAllBytes(), StandardCharsets.UTF_8);
                    tables += countOccurrences(xml, "<table:table");
                    headings += countOccurrences(xml, "<text:h");
                }
            }
        } catch (Exception e) {
            lowConfidence = true;
        }

        return buildReport(headings, tables, 1, images, lowConfidence);
    }

    private StructureReport analyzeDelimited(byte[] content, String ext) {
        String text = new String(content, 0, Math.min(content.length, 4096), StandardCharsets.UTF_8);
        String[] lines = text.split("\r?\n");
        int cols = 1;
        if (lines.length > 0) {
            char delim = "csv".equalsIgnoreCase(ext) ? ',' : '\t';
            cols = Math.max(1, (int) lines[0].chars().filter(ch -> ch == delim).count() + 1);
        }
        return buildReport(0, 1, cols, 0, false);
    }

    private StructureReport analyzePlainText(byte[] content) {
        return buildReport(1, 0, 1, 0, true);
    }

    private StructureReport analyzeHeuristic(byte[] content) {
        boolean lowConfidence = true;
        return buildReport(1, 0, 1, 0, lowConfidence);
    }

    private StructureReport buildReport(int headings, int tables, int columns, int images, boolean lowConfidence) {
        List<StructureChip> chips = new ArrayList<>();

        chips.add(StructureChip.builder()
                .type("headings")
                .label(headings + " " + (headings == 1 ? "Heading" : "Headings"))
                .count(headings)
                .lowConfidence(lowConfidence && headings <= 1)
                .confidenceLabel(lowConfidence ? "Estimated" : "High confidence")
                .build());

        chips.add(StructureChip.builder()
                .type("tables")
                .label(tables + " " + (tables == 1 ? "Table" : "Tables"))
                .count(tables)
                .lowConfidence(false)
                .confidenceLabel("High confidence")
                .build());

        chips.add(StructureChip.builder()
                .type("columns")
                .label(columns + " " + (columns == 1 ? "Column" : "Columns"))
                .count(columns)
                .lowConfidence(columns > 2)
                .confidenceLabel(columns > 2 ? "Multi-column layout" : "Standard flow")
                .build());

        chips.add(StructureChip.builder()
                .type("images")
                .label(images + " " + (images == 1 ? "Image" : "Images"))
                .count(images)
                .lowConfidence(false)
                .confidenceLabel(images > 0 ? "Embedded graphics" : "Vector layout")
                .build());

        String summary = String.format("Detected %d headings, %d tables, %d columns, and %d images.",
                headings, tables, columns, images);

        return StructureReport.builder()
                .headingsCount(headings)
                .tablesCount(tables)
                .columnsCount(columns)
                .imagesCount(images)
                .hasLowConfidence(lowConfidence)
                .chips(chips)
                .summary(summary)
                .build();
    }

    private StructureReport buildFallbackReport(String message) {
        List<StructureChip> chips = List.of(
                new StructureChip("headings", "0 Headings", 0, true, "No content"),
                new StructureChip("tables", "0 Tables", 0, false, "Verified"),
                new StructureChip("columns", "1 Column", 1, false, "Standard flow"),
                new StructureChip("images", "0 Images", 0, false, "No images")
        );
        return StructureReport.builder()
                .headingsCount(0)
                .tablesCount(0)
                .columnsCount(1)
                .imagesCount(0)
                .hasLowConfidence(true)
                .chips(chips)
                .summary(message)
                .build();
    }

    private int countOccurrences(String haystack, String needle) {
        if (haystack == null || needle == null || needle.isEmpty()) return 0;
        int count = 0;
        int idx = 0;
        while ((idx = haystack.indexOf(needle, idx)) != -1) {
            count++;
            idx += needle.length();
        }
        return count;
    }
}

