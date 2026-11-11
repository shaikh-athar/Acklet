package com.code.acklet.converter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.InputStream;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ConversionControllerIntegrationTest {

    private MockMvc mockMvc;
    private ConverterService converterService;

    @BeforeEach
    void setUp() {
        converterService = mock(ConverterService.class);
        ConversionController controller = new ConversionController(converterService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("POST /api/v1/converter/convert with real sample.docx to PDF should return 200 OK")
    void testConvertDocxSampleToPdf() throws Exception {
        ClassPathResource docxResource = new ClassPathResource("samples/sample.docx");
        assertTrue(docxResource.exists(), "Sample docx file must exist in test resources");

        byte[] docxBytes;
        try (InputStream is = docxResource.getInputStream()) {
            docxBytes = is.readAllBytes();
        }

        MockMultipartFile docxFile = new MockMultipartFile(
                "file", "sample.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        ConversionResult mockResult = ConversionResult.builder()
                .jobId("test-docx-job-123")
                .originalFileName("sample.docx")
                .sanitizedFileName("sample.pdf")
                .sourceFormat("docx")
                .targetFormat("pdf")
                .status(ConversionStatus.COMPLETED)
                .downloadUrl("/api/v1/converter/download/test-docx-job-123")
                .sourceSizeBytes((long) docxBytes.length)
                .convertedSizeBytes(12040L)
                .durationMs(240L)
                .createdAt(Instant.now())
                .completedAt(Instant.now())
                .build();

        when(converterService.convert(any(), eq("pdf"), any())).thenReturn(mockResult);

        mockMvc.perform(multipart("/api/v1/converter/convert")
                        .file(docxFile)
                        .param("targetFormat", "pdf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId", is("test-docx-job-123")))
                .andExpect(jsonPath("$.sourceFormat", is("docx")))
                .andExpect(jsonPath("$.targetFormat", is("pdf")))
                .andExpect(jsonPath("$.sanitizedFileName", is("sample.pdf")))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.downloadUrl", containsString("test-docx-job-123")));
    }

    @Test
    @DisplayName("POST /api/v1/converter/convert with real sample.xlsx to PDF should return 200 OK")
    void testConvertXlsxSampleToPdf() throws Exception {
        ClassPathResource xlsxResource = new ClassPathResource("samples/sample.xlsx");
        assertTrue(xlsxResource.exists(), "Sample xlsx file must exist in test resources");

        byte[] xlsxBytes;
        try (InputStream is = xlsxResource.getInputStream()) {
            xlsxBytes = is.readAllBytes();
        }

        MockMultipartFile xlsxFile = new MockMultipartFile(
                "file", "sample.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsxBytes
        );

        ConversionResult mockResult = ConversionResult.builder()
                .jobId("test-xlsx-job-456")
                .originalFileName("sample.xlsx")
                .sanitizedFileName("sample.pdf")
                .sourceFormat("xlsx")
                .targetFormat("pdf")
                .status(ConversionStatus.COMPLETED)
                .downloadUrl("/api/v1/converter/download/test-xlsx-job-456")
                .sourceSizeBytes((long) xlsxBytes.length)
                .convertedSizeBytes(15600L)
                .durationMs(310L)
                .createdAt(Instant.now())
                .completedAt(Instant.now())
                .build();

        when(converterService.convert(any(), eq("pdf"), any())).thenReturn(mockResult);

        mockMvc.perform(multipart("/api/v1/converter/convert")
                        .file(xlsxFile)
                        .param("targetFormat", "pdf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId", is("test-xlsx-job-456")))
                .andExpect(jsonPath("$.sourceFormat", is("xlsx")))
                .andExpect(jsonPath("$.targetFormat", is("pdf")))
                .andExpect(jsonPath("$.sanitizedFileName", is("sample.pdf")))
                .andExpect(jsonPath("$.status", is("COMPLETED")));
    }

    @Test
    @DisplayName("POST /api/v1/converter/convert async request should return 202 Accepted")
    void testConvertAsyncAccepted() throws Exception {
        MockMultipartFile docxFile = new MockMultipartFile(
                "file", "large.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "large payload".getBytes()
        );

        ConversionResult asyncResult = ConversionResult.builder()
                .jobId("async-job-789")
                .originalFileName("large.docx")
                .sanitizedFileName("large.pdf")
                .sourceFormat("docx")
                .targetFormat("pdf")
                .status(ConversionStatus.PROCESSING)
                .sourceSizeBytes(5000000L)
                .createdAt(Instant.now())
                .build();

        when(converterService.convert(any(), eq("pdf"), eq(true))).thenReturn(asyncResult);

        mockMvc.perform(multipart("/api/v1/converter/convert")
                        .file(docxFile)
                        .param("targetFormat", "pdf")
                        .param("async", "true"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId", is("async-job-789")))
                .andExpect(jsonPath("$.status", is("PROCESSING")));
    }

    @Test
    @DisplayName("GET /api/v1/converter/status/{jobId} should return job progress metadata")
    void testGetJobStatus() throws Exception {
        ConversionResult statusResult = ConversionResult.builder()
                .jobId("job-status-111")
                .originalFileName("data.docx")
                .sanitizedFileName("data.pdf")
                .sourceFormat("docx")
                .targetFormat("pdf")
                .status(ConversionStatus.COMPLETED)
                .downloadUrl("/api/v1/converter/download/job-status-111")
                .sourceSizeBytes(1024L)
                .convertedSizeBytes(2048L)
                .createdAt(Instant.now())
                .completedAt(Instant.now())
                .build();

        when(converterService.getJobStatus("job-status-111")).thenReturn(statusResult);

        mockMvc.perform(get("/api/v1/converter/status/job-status-111"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId", is("job-status-111")))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.downloadUrl", is("/api/v1/converter/download/job-status-111")));
    }

    @Test
    @DisplayName("GET /api/v1/converter/download/{jobId} should stream file with Content-Disposition")
    void testDownloadFile() throws Exception {
        byte[] pdfBytes = "%PDF-1.4 mock binary content".getBytes();
        Resource resource = new ByteArrayResource(pdfBytes);

        when(converterService.downloadConvertedFile("download-job-222")).thenReturn(resource);
        when(converterService.getConvertedFileName("download-job-222")).thenReturn("sample.pdf");
        when(converterService.getConvertedContentType("download-job-222")).thenReturn("application/pdf");

        mockMvc.perform(get("/api/v1/converter/download/download-job-222"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"sample.pdf\""))
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(pdfBytes));
    }

    @Test
    @DisplayName("GET /api/v1/converter/formats should return supported source formats")
    void testGetFormats() throws Exception {
        when(converterService.getSupportedSourceFormats()).thenReturn(List.of(ConversionFormat.DOCX, ConversionFormat.XLSX));
        when(converterService.isAvailable()).thenReturn(true);

        mockMvc.perform(get("/api/v1/converter/formats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.formats", hasSize(2)))
                .andExpect(jsonPath("$.engineAvailable", is(true)));
    }
}
