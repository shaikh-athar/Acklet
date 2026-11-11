package com.code.acklet.converter;

import com.code.acklet.converter.exception.InvalidFileException;
import com.code.acklet.converter.exception.UnsupportedFormatException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class ConverterValidatorTest {

    private ConverterValidator validator;
    private ConverterProperties properties;

    @BeforeEach
    void setUp() {
        properties = new ConverterProperties();
        properties.setMaxFileSizeBytes(10 * 1024 * 1024L); // 10MB
        validator = new ConverterValidator(properties);
    }

    @Test
    @DisplayName("Should validate valid DOCX to PDF conversion request")
    void testValidateValidRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "annual_report.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "sample content".getBytes()
        );

        ConversionFormat source = validator.validateRequest(file, "pdf");
        assertEquals(ConversionFormat.DOCX, source);
    }

    @Test
    @DisplayName("Should throw InvalidFileException when file is empty")
    void testValidateEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "empty.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                new byte[0]
        );

        assertThrows(InvalidFileException.class, () -> validator.validateRequest(emptyFile, "pdf"));
    }

    @Test
    @DisplayName("Should throw InvalidFileException when file size exceeds limit")
    void testValidateFileSizeLimit() {
        properties.setMaxFileSizeBytes(50); // Set low limit
        MockMultipartFile oversizedFile = new MockMultipartFile(
                "file", "huge.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                new byte[100]
        );

        assertThrows(InvalidFileException.class, () -> validator.validateRequest(oversizedFile, "pdf"));
    }

    @Test
    @DisplayName("Should throw UnsupportedFormatException for unsupported source extension")
    void testValidateUnsupportedSource() {
        MockMultipartFile exeFile = new MockMultipartFile(
                "file", "malicious.exe", "application/octet-stream",
                "fake-binary".getBytes()
        );

        assertThrows(UnsupportedFormatException.class, () -> validator.validateRequest(exeFile, "pdf"));
    }

    @Test
    @DisplayName("Should throw UnsupportedFormatException for incompatible target format")
    void testValidateIncompatibleTarget() {
        MockMultipartFile docxFile = new MockMultipartFile(
                "file", "doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "fake-content".getBytes()
        );

        // DOCX cannot convert to SVG
        assertThrows(UnsupportedFormatException.class, () -> validator.validateRequest(docxFile, "svg"));
    }

    @Test
    @DisplayName("Filename sanitization should neutralize path traversal and illegal characters")
    void testSanitizeFilename() {
        assertEquals("report.docx", validator.sanitizeFilename("../../etc/report.docx"));
        assertEquals("report.docx", validator.sanitizeFilename("..\\..\\Windows\\report.docx"));
        assertEquals("my_safe_report.docx", validator.sanitizeFilename("my:safe?report*.docx"));
        assertEquals("sample.pdf", validator.sanitizeFilename("sample\0.pdf"));
        assertEquals("clean.xlsx", validator.sanitizeFilename("...clean.xlsx"));
        assertEquals("document.docx", validator.sanitizeFilename("....docx"));
    }

    @Test
    @DisplayName("Should extract extension correctly")
    void testExtractExtension() {
        assertEquals("docx", validator.extractExtension("report.docx"));
        assertEquals("xlsx", validator.extractExtension("sheet.2024.final.XLSX"));
        assertEquals("", validator.extractExtension("no_extension_file"));
    }
}

