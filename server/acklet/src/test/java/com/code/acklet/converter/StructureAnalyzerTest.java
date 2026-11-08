package com.code.acklet.converter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("StructureAnalyzer Tests")
class StructureAnalyzerTest {

    private final StructureAnalyzer analyzer = new StructureAnalyzer();

    @Test
    @DisplayName("Should analyze sample DOCX document structure")
    void testAnalyzeDocx() throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/samples/sample.docx")) {
            assertNotNull(is, "sample.docx fixture must exist");
            byte[] bytes = is.readAllBytes();
            StructureReport report = analyzer.analyze(bytes, "sample.docx", "docx");

            assertNotNull(report);
            assertFalse(report.getChips().isEmpty(), "Structure chips should be populated");
            assertTrue(report.getChips().stream().anyMatch(c -> c.getType().equals("headings")));
            assertTrue(report.getChips().stream().anyMatch(c -> c.getType().equals("tables")));
        }
    }

    @Test
    @DisplayName("Should analyze sample XLSX spreadsheet structure")
    void testAnalyzeXlsx() throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/samples/sample.xlsx")) {
            assertNotNull(is, "sample.xlsx fixture must exist");
            byte[] bytes = is.readAllBytes();
            StructureReport report = analyzer.analyze(bytes, "sample.xlsx", "xlsx");

            assertNotNull(report);
            assertTrue(report.getTablesCount() >= 1);
            assertTrue(report.getChips().stream().anyMatch(c -> c.getType().equals("tables")));
        }
    }

    @Test
    @DisplayName("Should handle empty bytes gracefully with fallback report")
    void testAnalyzeEmpty() {
        StructureReport report = analyzer.analyze(new byte[0], "empty.docx", "docx");
        assertNotNull(report);
        assertTrue(report.isHasLowConfidence());
    }
}

