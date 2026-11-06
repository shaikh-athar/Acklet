package com.code.acklet.converter;

import com.code.acklet.converter.exception.EngineUnavailableException;
import com.code.acklet.converter.exception.JobNotFoundException;
import org.jodconverter.core.DocumentConverter;
import org.jodconverter.core.job.ConversionJobWithOptionalSourceFormatUnspecified;
import org.jodconverter.core.job.ConversionJobWithOptionalTargetFormatUnspecified;
import org.jodconverter.core.office.OfficeException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JodConverterServiceTest {

    private JodConverterService service;
    private ConverterProperties properties;
    private ConverterValidator validator;
    private DocumentConverter mockConverter;

    @TempDir
    Path tempFolder;

    @BeforeEach
    void setUp() {
        properties = new ConverterProperties();
        properties.setTempDir(tempFolder.toString());
        properties.setMaxFileSizeBytes(20 * 1024 * 1024L);
        properties.setTimeoutSeconds(10);
        properties.setAsyncThresholdBytes(1024 * 1024L); // 1MB

        validator = new ConverterValidator(properties);
        service = new JodConverterService(properties, validator);

        mockConverter = mock(DocumentConverter.class);
        service.setCustomConverter(mockConverter);
    }

    @AfterEach
    void tearDown() {
        service.shutdown();
    }

    @Test
    @DisplayName("isAvailable() should reflect converter presence")
    void testIsAvailable() {
        assertTrue(service.isAvailable());

        service.setCustomConverter(null);
        assertFalse(service.isAvailable());
    }

    @Test
    @DisplayName("Should list supported source and target formats")
    void testSupportedFormats() {
        List<ConversionFormat> sources = service.getSupportedSourceFormats();
        assertFalse(sources.isEmpty());
        assertTrue(sources.contains(ConversionFormat.DOCX));
        assertTrue(sources.contains(ConversionFormat.XLSX));

        List<ConversionFormat> docxTargets = service.getSupportedTargetFormats("docx");
        assertTrue(docxTargets.contains(ConversionFormat.PDF));
    }

    @Test
    @DisplayName("Should throw EngineUnavailableException when engine is offline")
    void testEngineUnavailable() {
        service.setCustomConverter(null);
        MockMultipartFile file = new MockMultipartFile(
                "file", "report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "content".getBytes()
        );

        assertThrows(EngineUnavailableException.class, () -> service.convert(file, "pdf", false));
    }

    @Test
    @DisplayName("Should successfully convert small file synchronously")
    void testSynchronousConversion() throws Exception {
        ConversionJobWithOptionalSourceFormatUnspecified jobUnspec = mock(ConversionJobWithOptionalSourceFormatUnspecified.class);
        ConversionJobWithOptionalTargetFormatUnspecified jobTarget = mock(ConversionJobWithOptionalTargetFormatUnspecified.class);

        when(mockConverter.convert(any(File.class))).thenReturn(jobUnspec);
        when(jobUnspec.to(any(File.class))).thenAnswer(invocation -> {
            File targetFile = invocation.getArgument(0);
            Files.writeString(targetFile.toPath(), "%PDF-1.4 Mock Converted PDF Content");
            return jobTarget;
        });
        doNothing().when(jobTarget).execute();

        MockMultipartFile file = new MockMultipartFile(
                "file", "quarterly.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "quarterly docx content".getBytes()
        );

        ConversionResult result = service.convert(file, "pdf", false);

        assertNotNull(result);
        assertEquals(ConversionStatus.COMPLETED, result.getStatus());
        assertEquals("docx", result.getSourceFormat());
        assertEquals("pdf", result.getTargetFormat());
        assertEquals("quarterly.pdf", result.getSanitizedFileName());
        assertNotNull(result.getDownloadUrl());
        assertTrue(result.getConvertedSizeBytes() > 0);

        // Verify download
        Resource resource = service.downloadConvertedFile(result.getJobId());
        assertNotNull(resource);
        assertTrue(resource.exists());
        assertEquals("quarterly.pdf", service.getConvertedFileName(result.getJobId()));
        assertEquals("application/pdf", service.getConvertedContentType(result.getJobId()));
    }

    @Test
    @DisplayName("Should submit large or forced async file and track status")
    void testAsynchronousConversion() throws Exception {
        ConversionJobWithOptionalSourceFormatUnspecified jobUnspec = mock(ConversionJobWithOptionalSourceFormatUnspecified.class);
        ConversionJobWithOptionalTargetFormatUnspecified jobTarget = mock(ConversionJobWithOptionalTargetFormatUnspecified.class);

        when(mockConverter.convert(any(File.class))).thenReturn(jobUnspec);
        when(jobUnspec.to(any(File.class))).thenAnswer(invocation -> {
            File targetFile = invocation.getArgument(0);
            Files.writeString(targetFile.toPath(), "%PDF-1.4 Async Converted PDF");
            return jobTarget;
        });
        doNothing().when(jobTarget).execute();

        MockMultipartFile file = new MockMultipartFile(
                "file", "bigdata.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "excel data".getBytes()
        );

        ConversionResult initial = service.convert(file, "pdf", true);
        assertNotNull(initial);
        assertTrue(initial.getStatus() == ConversionStatus.PENDING || initial.getStatus() == ConversionStatus.PROCESSING);

        // Wait a short time for async executor to finish
        int attempts = 0;
        ConversionResult polled = null;
        while (attempts < 20) {
            Thread.sleep(100);
            polled = service.getJobStatus(initial.getJobId());
            if (polled.getStatus() == ConversionStatus.COMPLETED) {
                break;
            }
            attempts++;
        }

        assertNotNull(polled);
        assertEquals(ConversionStatus.COMPLETED, polled.getStatus());
        assertEquals("bigdata.pdf", polled.getSanitizedFileName());
    }

    @Test
    @DisplayName("Should record FAILED status when OfficeException is thrown")
    void testConversionFailureHandling() throws Exception {
        ConversionJobWithOptionalSourceFormatUnspecified jobUnspec = mock(ConversionJobWithOptionalSourceFormatUnspecified.class);
        ConversionJobWithOptionalTargetFormatUnspecified jobTarget = mock(ConversionJobWithOptionalTargetFormatUnspecified.class);

        when(mockConverter.convert(any(File.class))).thenReturn(jobUnspec);
        when(jobUnspec.to(any(File.class))).thenReturn(jobTarget);
        doThrow(new OfficeException("Corrupted input stream")).when(jobTarget).execute();

        MockMultipartFile file = new MockMultipartFile(
                "file", "bad.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "broken".getBytes()
        );

        ConversionResult result = service.convert(file, "pdf", false);
        assertEquals(ConversionStatus.FAILED, result.getStatus());
        assertTrue(result.getErrorMessage().contains("Corrupted input stream"));
    }

    @Test
    @DisplayName("Should throw JobNotFoundException for invalid jobId")
    void testJobNotFound() {
        assertThrows(JobNotFoundException.class, () -> service.getJobStatus("non-existent-id"));
        assertThrows(JobNotFoundException.class, () -> service.downloadConvertedFile("non-existent-id"));
    }
}

