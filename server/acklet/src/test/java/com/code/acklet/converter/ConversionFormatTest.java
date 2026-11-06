package com.code.acklet.converter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class ConversionFormatTest {

    @Test
    @DisplayName("Should resolve format by extension case-insensitively and with/without leading dot")
    void testResolveByExtension() {
        Optional<ConversionFormat> docx1 = ConversionFormat.fromExtension("docx");
        Optional<ConversionFormat> docx2 = ConversionFormat.fromExtension(".DOCX");
        Optional<ConversionFormat> xlsx = ConversionFormat.fromExtension("XLSX");
        Optional<ConversionFormat> pdf = ConversionFormat.fromExtension(".pdf");

        assertTrue(docx1.isPresent());
        assertEquals(ConversionFormat.DOCX, docx1.get());
        assertTrue(docx2.isPresent());
        assertEquals(ConversionFormat.DOCX, docx2.get());
        assertTrue(xlsx.isPresent());
        assertEquals(ConversionFormat.XLSX, xlsx.get());
        assertTrue(pdf.isPresent());
        assertEquals(ConversionFormat.PDF, pdf.get());
    }

    @Test
    @DisplayName("Should resolve format by MIME type including charset parameters")
    void testResolveByMimeType() {
        Optional<ConversionFormat> txt = ConversionFormat.fromMimeType("text/plain; charset=utf-8");
        Optional<ConversionFormat> docx = ConversionFormat.fromMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        Optional<ConversionFormat> xlsx = ConversionFormat.fromMimeType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        assertTrue(txt.isPresent());
        assertEquals(ConversionFormat.TXT, txt.get());
        assertTrue(docx.isPresent());
        assertEquals(ConversionFormat.DOCX, docx.get());
        assertTrue(xlsx.isPresent());
        assertEquals(ConversionFormat.XLSX, xlsx.get());
    }

    @ParameterizedTest
    @CsvSource({
            "DOCX, PDF, true",
            "DOCX, HTML, true",
            "DOCX, TXT, true",
            "DOCX, DOCX, false",
            "XLSX, PDF, true",
            "XLSX, CSV, true",
            "XLSX, ODS, true",
            "PPTX, PDF, true",
            "ODT, PDF, true",
            "RTF, PDF, true"
    })
    @DisplayName("Format routing matrix should validate supported input/output pairs")
    void testFormatRoutingSupport(ConversionFormat source, ConversionFormat target, boolean expected) {
        assertEquals(expected, ConversionFormat.isConversionSupported(source, target));
    }

    @Test
    @DisplayName("DOCX should list all valid target document outputs")
    void testSupportedOutputsForDocx() {
        List<ConversionFormat> outputs = ConversionFormat.getSupportedOutputs(ConversionFormat.DOCX);
        assertNotNull(outputs);
        assertTrue(outputs.contains(ConversionFormat.PDF));
        assertTrue(outputs.contains(ConversionFormat.DOC));
        assertTrue(outputs.contains(ConversionFormat.ODT));
        assertTrue(outputs.contains(ConversionFormat.RTF));
        assertTrue(outputs.contains(ConversionFormat.TXT));
        assertTrue(outputs.contains(ConversionFormat.HTML));
    }

    @Test
    @DisplayName("XLSX should list spreadsheet and PDF output options")
    void testSupportedOutputsForXlsx() {
        List<ConversionFormat> outputs = ConversionFormat.getSupportedOutputs(ConversionFormat.XLSX);
        assertNotNull(outputs);
        assertTrue(outputs.contains(ConversionFormat.PDF));
        assertTrue(outputs.contains(ConversionFormat.XLS));
        assertTrue(outputs.contains(ConversionFormat.CSV));
        assertTrue(outputs.contains(ConversionFormat.ODS));
    }
}

