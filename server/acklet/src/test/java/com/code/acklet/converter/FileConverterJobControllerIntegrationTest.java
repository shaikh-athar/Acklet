package com.code.acklet.converter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("FileConverterJobController Integration Tests")
class FileConverterJobControllerIntegrationTest {

    private MockMvc mockMvc;
    private FileConverterJobService jobService;
    private ConverterProperties properties;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        properties = new ConverterProperties();
        Path tempDir = Files.createTempDirectory("batch-test-temp");
        properties.setTempDir(tempDir.toString());
        properties.setDevFallback(true);

        ConverterValidator validator = new ConverterValidator(properties);
        StructureAnalyzer structureAnalyzer = new StructureAnalyzer();
        ZipPacker zipPacker = new ZipPacker();
        JodConverterService jodService = new JodConverterService(properties, validator);
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        com.code.acklet.converter.engine.EngineRegistry engineRegistry = new com.code.acklet.converter.engine.EngineRegistry(objectMapper, java.util.List.of(
            new com.code.acklet.converter.engine.JodConverterEngine(jodService),
            new com.code.acklet.converter.engine.PdfBoxEngine(jodService)
        ));
        engineRegistry.init();

        jobService = new FileConverterJobService(properties, validator, structureAnalyzer, zipPacker, jodService, engineRegistry);
        jobService.init();

        FileConverterJobController controller = new FileConverterJobController(jobService, objectMapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(objectMapper))
                .setControllerAdvice(new com.code.acklet.shared.exception.GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/file-converter/jobs - should accept multiple files and create batch job")
    void testCreateBatchJob() throws Exception {
        byte[] docxBytes;
        try (InputStream is = getClass().getResourceAsStream("/samples/sample.docx")) {
            assertNotNull(is);
            docxBytes = is.readAllBytes();
        }

        MockMultipartFile file1 = new MockMultipartFile(
                "files", "test1.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        MockMultipartFile file2 = new MockMultipartFile(
                "files", "test2.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        mockMvc.perform(multipart("/api/file-converter/jobs")
                        .file(file1)
                        .file(file2)
                        .param("targetFormat", "pdf")
                        .param("fidelity", "balanced")
                        .param("pageRange", "1-3, 5")
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId", notNullValue()))
                .andExpect(jsonPath("$.files", hasSize(2)))
                .andExpect(jsonPath("$.files[0].structureReport", notNullValue()))
                .andExpect(jsonPath("$.files[0].structureReport.chips", not(empty())));
    }

    @Test
    @DisplayName("POST /api/file-converter/analyze - should analyze document and return structure chips")
    void testAnalyzeEndpoint() throws Exception {
        byte[] docxBytes;
        try (InputStream is = getClass().getResourceAsStream("/samples/sample.docx")) {
            assertNotNull(is);
            docxBytes = is.readAllBytes();
        }

        MockMultipartFile file = new MockMultipartFile(
                "file", "sample.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        mockMvc.perform(multipart("/api/file-converter/analyze")
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chips", not(empty())))
                .andExpect(jsonPath("$.summary", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/file-converter/jobs - should reject invalid page range with 400")
    void testInvalidPageRange() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "files", "sample.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "dummy content".getBytes()
        );

        mockMvc.perform(multipart("/api/file-converter/jobs")
                        .file(file)
                        .param("targetFormat", "pdf")
                        .param("pageRange", "invalid-range"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/file-converter/jobs - should reject unsupported pair with 422 UNSUPPORTED_PAIR")
    void testConvertPdfToUnsupported_RejectedWith422UnsupportedPair() throws Exception {
        byte[] pdfBytes = ("%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
                + "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
                + "3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>> endobj\n"
                + "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
                + "trailer <</Size 4 /Root 1 0 R>>\nstartxref\n185\n%%EOF\n").getBytes();

        MockMultipartFile file = new MockMultipartFile(
                "files", "test.pdf",
                "application/pdf",
                pdfBytes
        );

        mockMvc.perform(multipart("/api/file-converter/jobs")
                        .file(file)
                        .param("targetFormat", "epub")
                        .param("fidelity", "balanced")
                        .accept(MediaType.APPLICATION_JSON)
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("UNSUPPORTED_PAIR")))
                .andExpect(jsonPath("$.message", containsString("This format is not available for PDF files yet")))
                .andExpect(jsonPath("$.data.supportedTargets", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/file-converter/jobs - should accept valid tested pair (pdf->txt)")
    void testConvertPdfToTxt_Success() throws Exception {
        byte[] pdfBytes = ("%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
                + "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
                + "3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>> endobj\n"
                + "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
                + "trailer <</Size 4 /Root 1 0 R>>\nstartxref\n185\n%%EOF\n").getBytes();

        MockMultipartFile file = new MockMultipartFile(
                "files", "test.pdf",
                "application/pdf",
                pdfBytes
        );

        mockMvc.perform(multipart("/api/file-converter/jobs")
                        .file(file)
                        .param("targetFormat", "txt")
                        .param("fidelity", "balanced")
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId", notNullValue()))
                .andExpect(jsonPath("$.files[0].sourceFormat", is("pdf")))
                .andExpect(jsonPath("$.files[0].targetFormat", is("txt")));
    }

    @Test
    @DisplayName("GET /api/file-converter/capabilities - should return only tested pairs and no planned entries")
    void testCapabilitiesContract_OnlyTestedPairs() throws Exception {
        mockMvc.perform(get("/api/file-converter/capabilities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", notNullValue()))
                // Planned status must not appear
                .andExpect(jsonPath("$[?(@.status == 'planned')]").isEmpty())
                // PDF->DOCX is tested, so it must be present in capabilities
                .andExpect(jsonPath("$[?(@.inputType == 'pdf' && @.outputType == 'docx')]").isNotEmpty())
                // PDF->TXT is tested, so it must be present
                .andExpect(jsonPath("$[?(@.inputType == 'pdf' && @.outputType == 'txt')]").isNotEmpty());
    }
}

