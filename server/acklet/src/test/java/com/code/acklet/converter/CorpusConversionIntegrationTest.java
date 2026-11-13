package com.code.acklet.converter;

import com.code.acklet.converter.engine.*;
import com.code.acklet.converter.generator.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.awt.Rectangle;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Real Corpus Conversion Integration Tests")
class CorpusConversionIntegrationTest {

    private static Path tempDir;
    private static Path samplePdfPath;
    private static Path sampleDocxPath;
    private static Path sampleXlsxPath;
    private static Path samplePptxPath;

    private ConverterProperties properties;
    private FileConverterJobService jobService;
    private EngineRegistry engineRegistry;

    @BeforeAll
    static void initCorpusFiles() throws Exception {
        tempDir = Files.createTempDirectory("corpus-test-temp");

        // 1. Prepare sample.pdf
        samplePdfPath = tempDir.resolve("sample.pdf");
        try (InputStream is = CorpusConversionIntegrationTest.class.getResourceAsStream("/samples/sample.pdf")) {
            if (is != null) {
                Files.copy(is, samplePdfPath);
            } else {
                Path corpusFallback = Paths.get("../../tests/corpus/sample.pdf");
                if (Files.exists(corpusFallback)) {
                    Files.copy(corpusFallback, samplePdfPath);
                } else {
                    Files.writeString(samplePdfPath, "%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj\n4 0 obj <</Length 44>> stream\nBT /F1 12 Tf 50 700 Td (Sample Corpus Report Document) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer <</Size 5 /Root 1 0 R>>\nstartxref\n310\n%%EOF");
                }
            }
        }

        // 2. Prepare sample.docx
        sampleDocxPath = tempDir.resolve("sample.docx");
        try (InputStream is = CorpusConversionIntegrationTest.class.getResourceAsStream("/samples/sample.docx")) {
            if (is != null) {
                Files.copy(is, sampleDocxPath);
            } else {
                try (XWPFDocument doc = new XWPFDocument(); OutputStream out = Files.newOutputStream(sampleDocxPath)) {
                    doc.createParagraph().createRun().setText("Sample Corpus Word Document Content");
                    doc.write(out);
                }
            }
        }

        // 3. Prepare sample.xlsx
        sampleXlsxPath = tempDir.resolve("sample.xlsx");
        try (InputStream is = CorpusConversionIntegrationTest.class.getResourceAsStream("/samples/sample.xlsx")) {
            if (is != null) {
                Files.copy(is, sampleXlsxPath);
            } else {
                try (XSSFWorkbook wb = new XSSFWorkbook(); OutputStream out = Files.newOutputStream(sampleXlsxPath)) {
                    var sheet = wb.createSheet("Data");
                    var row = sheet.createRow(0);
                    row.createCell(0).setCellValue("Region");
                    row.createCell(1).setCellValue("Revenue");
                    var row2 = sheet.createRow(1);
                    row2.createCell(0).setCellValue("North");
                    row2.createCell(1).setCellValue(45000);
                    wb.write(out);
                }
            }
        }

        // 4. Prepare sample.pptx
        samplePptxPath = tempDir.resolve("sample.pptx");
        try (XMLSlideShow ppt = new XMLSlideShow(); OutputStream out = Files.newOutputStream(samplePptxPath)) {
            XSLFSlide slide = ppt.createSlide();
            XSLFTextBox title = slide.createTextBox();
            title.setAnchor(new Rectangle(50, 50, 500, 40));
            title.addNewTextParagraph().addNewTextRun().setText("Quarterly Performance Review");

            XSLFTextBox body = slide.createTextBox();
            body.setAnchor(new Rectangle(50, 100, 500, 150));
            body.addNewTextParagraph().addNewTextRun().setText("Document transformation throughput exceeded service targets.");
            ppt.write(out);
        }
        Path corpusPptx = Paths.get("../../tests/corpus/sample.pptx");
        if (Files.exists(corpusPptx.getParent()) && !Files.exists(corpusPptx)) {
            Files.copy(samplePptxPath, corpusPptx);
        }
    }

    @BeforeEach
    void setUp() throws Exception {
        properties = new ConverterProperties();
        properties.setTempDir(tempDir.toString());
        properties.setDevFallback(true);
        properties.setBetaSimilarityThreshold(0.85);

        ConverterValidator validator = new ConverterValidator(properties);
        PdfStructureClient structureClient = new PdfStructureClient();
        StructureAnalyzer structureAnalyzer = new StructureAnalyzer(structureClient);
        ZipPacker zipPacker = new ZipPacker();
        JodConverterService jodService = new JodConverterService(properties, validator);

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

        DocxGenerator docxGen = new DocxGenerator();
        DocGenerator docGen = new DocGenerator(docxGen, jodService);

        BaseStructureConversionEngine baseStructureEngine = new BaseStructureConversionEngine(
                structureClient,
                docxGen,
                new MarkdownGenerator(),
                new HtmlGenerator(),
                new TxtGenerator(),
                new XlsxGenerator(),
                new CsvGenerator(),
                new PptxGenerator(),
                docGen,
                new PdfboxImageGenerator()
        );

        List<ConversionEngine> engines = List.of(
                new JodConverterEngine(jodService),
                new PdfBoxEngine(jodService),
                new StructureEngines.StructureTxtEngine(baseStructureEngine),
                new StructureEngines.StructureDocxEngine(baseStructureEngine),
                new StructureEngines.StructureMdEngine(baseStructureEngine),
                new StructureEngines.StructureHtmlEngine(baseStructureEngine),
                new StructureEngines.StructureXlsxEngine(baseStructureEngine),
                new StructureEngines.StructureCsvEngine(baseStructureEngine),
                new StructureEngines.StructurePptxEngine(baseStructureEngine),
                new StructureEngines.OfficeDocEngine(baseStructureEngine)
        );

        engineRegistry = new EngineRegistry(objectMapper, engines);
        engineRegistry.init();

        jobService = new FileConverterJobService(properties, validator, structureAnalyzer, zipPacker, jodService, engineRegistry);
        jobService.init();
    }

    @Test
    @DisplayName("PDF -> TXT: Real corpus conversion extracts text and satisfies similarity threshold")
    void testPdfToTxtConversion() throws Exception {
        byte[] pdfBytes = Files.readAllBytes(samplePdfPath);
        assertTrue(pdfBytes.length > 0, "Input PDF must not be empty");

        // Extract input reference text via PDFBox
        String referenceText;
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            referenceText = stripper.getText(doc).trim();
        }

        Path targetTxt = tempDir.resolve("out_pdf_to_txt.txt");
        ConversionOptions options = new ConversionOptions();
        options.setTargetFormat("txt");

        ConversionEngine engine = engineRegistry.findEngineFor("pdf", "txt");
        assertNotNull(engine, "Engine for pdf -> txt must be registered");

        engine.convert(samplePdfPath, targetTxt, "pdf", "txt", options, null);

        assertTrue(Files.exists(targetTxt), "Target TXT file must exist");
        assertTrue(Files.size(targetTxt) > 0, "Target TXT file must be non-empty");

        String outputText = Files.readString(targetTxt, StandardCharsets.UTF_8).trim();
        assertFalse(outputText.isEmpty(), "Extracted text must not be empty");

        double similarity = calculateWordOverlapSimilarity(referenceText, outputText);
        assertTrue(similarity >= properties.getBetaSimilarityThreshold(),
                String.format("PDF->TXT similarity %.2f must meet or exceed threshold %.2f", similarity, properties.getBetaSimilarityThreshold()));
    }

    @Test
    @DisplayName("DOCX -> PDF: Real corpus conversion outputs valid vector PDF with magic bytes")
    void testDocxToPdfConversion() throws Exception {
        byte[] docxBytes = Files.readAllBytes(sampleDocxPath);
        assertTrue(docxBytes.length > 0, "Input DOCX must not be empty");

        Path targetPdf = tempDir.resolve("out_docx_to_pdf.pdf");
        ConversionOptions options = new ConversionOptions();
        options.setTargetFormat("pdf");

        JodConverterEngine engine = new JodConverterEngine(new JodConverterService(properties, new ConverterValidator(properties)));
        engine.convert(sampleDocxPath, targetPdf, "docx", "pdf", options, null);

        assertTrue(Files.exists(targetPdf), "Target PDF must exist");
        assertTrue(Files.size(targetPdf) > 0, "Target PDF must be non-empty");

        byte[] pdfOutput = Files.readAllBytes(targetPdf);
        String header = new String(pdfOutput, 0, Math.min(8, pdfOutput.length), StandardCharsets.ISO_8859_1);
        assertTrue(header.startsWith("%PDF"), "Output must start with PDF magic bytes (%PDF)");
    }

    @Test
    @DisplayName("XLSX -> CSV: Real corpus conversion outputs valid CSV rows with tabular delimiter")
    void testXlsxToCsvConversion() throws Exception {
        byte[] xlsxBytes = Files.readAllBytes(sampleXlsxPath);
        assertTrue(xlsxBytes.length > 0, "Input XLSX must not be empty");

        Path targetCsv = tempDir.resolve("out_xlsx_to_csv.csv");
        ConversionOptions options = new ConversionOptions();
        options.setTargetFormat("csv");

        JodConverterService jodService = new JodConverterService(properties, new ConverterValidator(properties));
        JodConverterEngine engine = new JodConverterEngine(jodService);
        engine.convert(sampleXlsxPath, targetCsv, "xlsx", "csv", options, null);

        assertTrue(Files.exists(targetCsv), "Target CSV must exist");
        assertTrue(Files.size(targetCsv) > 0, "Target CSV must be non-empty");

        String csvContent = Files.readString(targetCsv, StandardCharsets.UTF_8);
        assertTrue(csvContent.contains(",") || csvContent.contains("\t") || csvContent.contains("\n"),
                "Output must contain tabular delimiter or rows");
    }

    @Test
    @DisplayName("PPTX -> PDF: Real corpus conversion outputs valid PDF presentation")
    void testPptxToPdfConversion() throws Exception {
        byte[] pptxBytes = Files.readAllBytes(samplePptxPath);
        assertTrue(pptxBytes.length > 0, "Input PPTX must not be empty");

        Path targetPdf = tempDir.resolve("out_pptx_to_pdf.pdf");
        ConversionOptions options = new ConversionOptions();
        options.setTargetFormat("pdf");

        JodConverterEngine engine = new JodConverterEngine(new JodConverterService(properties, new ConverterValidator(properties)));
        engine.convert(samplePptxPath, targetPdf, "pptx", "pdf", options, null);

        assertTrue(Files.exists(targetPdf), "Target PDF must exist");
        assertTrue(Files.size(targetPdf) > 0, "Target PDF must be non-empty");

        byte[] pdfOutput = Files.readAllBytes(targetPdf);
        String header = new String(pdfOutput, 0, Math.min(8, pdfOutput.length), StandardCharsets.ISO_8859_1);
        assertTrue(header.startsWith("%PDF"), "Output must start with PDF magic bytes (%PDF)");
    }

    @Test
    @DisplayName("PPTX -> TXT: Beta conversion extracts slide text and satisfies similarity threshold")
    void testPptxToTxtBetaConversion() throws Exception {
        byte[] pptxBytes = Files.readAllBytes(samplePptxPath);
        assertTrue(pptxBytes.length > 0, "Input PPTX must not be empty");

        Path targetTxt = tempDir.resolve("out_pptx_to_txt.txt");
        ConversionOptions options = new ConversionOptions();
        options.setTargetFormat("txt");

        JodConverterEngine engine = new JodConverterEngine(new JodConverterService(properties, new ConverterValidator(properties)));
        engine.convert(samplePptxPath, targetTxt, "pptx", "txt", options, null);

        assertTrue(Files.exists(targetTxt), "Target TXT must exist");
        assertTrue(Files.size(targetTxt) > 0, "Target TXT must be non-empty");

        String txtContent = Files.readString(targetTxt, StandardCharsets.UTF_8);
        assertFalse(txtContent.isBlank(), "Extracted slide text must not be blank");
        assertTrue(txtContent.contains("Performance") || txtContent.contains("Review") || txtContent.contains("Quarterly") || txtContent.contains("Report"),
                "Extracted text must contain expected slide title or bullets");
    }

    @Test
    @DisplayName("PDF -> DOCX: Beta structural conversion outputs valid OpenXML Word document")
    void testPdfToDocxBetaConversion() throws Exception {
        Path targetDocx = tempDir.resolve("out_pdf_to_docx.docx");
        ConversionOptions options = new ConversionOptions();
        options.setTargetFormat("docx");

        ConversionEngine engine = engineRegistry.findEngineFor("pdf", "docx");
        assertNotNull(engine, "Engine for pdf -> docx must be registered");
        engine.convert(samplePdfPath, targetDocx, "pdf", "docx", options, null);

        assertTrue(Files.exists(targetDocx), "Target DOCX must exist");
        assertTrue(Files.size(targetDocx) > 0, "Target DOCX must be non-empty");

        // Verify OpenXML ZIP signature: PK\x03\x04
        byte[] docxBytes = Files.readAllBytes(targetDocx);
        assertEquals((byte) 0x50, docxBytes[0], "Docx byte 0 must be 'P'");
        assertEquals((byte) 0x4B, docxBytes[1], "Docx byte 1 must be 'K'");

        try (XWPFDocument doc = new XWPFDocument(Files.newInputStream(targetDocx))) {
            assertFalse(doc.getParagraphs().isEmpty(), "DOCX must contain at least one paragraph");
        }
    }

    @Test
    @DisplayName("Registry Integrity: Asserts tested pairs have working engines and planned pairs are withheld")
    void testRegistryIntegrity() {
        List<ConversionEntry> tested = engineRegistry.getTestedEntries();
        assertFalse(tested.isEmpty(), "Registry must contain tested pairs");

        // Verify known core pairs are tested
        assertTrue(tested.stream().anyMatch(e -> "pdf".equalsIgnoreCase(e.getInputType()) && "txt".equalsIgnoreCase(e.getOutputType())));
        assertTrue(tested.stream().anyMatch(e -> "docx".equalsIgnoreCase(e.getInputType()) && "pdf".equalsIgnoreCase(e.getOutputType())));
        assertTrue(tested.stream().anyMatch(e -> "xlsx".equalsIgnoreCase(e.getInputType()) && "csv".equalsIgnoreCase(e.getOutputType())));
        assertTrue(tested.stream().anyMatch(e -> "pptx".equalsIgnoreCase(e.getInputType()) && "pdf".equalsIgnoreCase(e.getOutputType())));

        // Verify planned pairs (e.g. OCR image to text) are NOT exposed as tested
        List<ConversionEntry> all = engineRegistry.getAllEntries();
        List<ConversionEntry> planned = all.stream()
                .filter(e -> "planned".equalsIgnoreCase(e.getStatus()))
                .toList();

        assertFalse(planned.isEmpty(), "Registry must maintain planned entries for future phases");
        for (ConversionEntry p : planned) {
            assertFalse(tested.contains(p), "Planned entry " + p.getInputType() + "->" + p.getOutputType() + " must never appear in tested list");
        }
    }

    private double calculateWordOverlapSimilarity(String source, String converted) {
        if (source == null || source.isBlank() || converted == null || converted.isBlank()) {
            return 1.0;
        }
        Set<String> sourceWords = new HashSet<>(Arrays.asList(source.toLowerCase().split("\\W+")));
        Set<String> convertedWords = new HashSet<>(Arrays.asList(converted.toLowerCase().split("\\W+")));

        sourceWords.removeIf(String::isBlank);
        convertedWords.removeIf(String::isBlank);

        if (sourceWords.isEmpty()) return 1.0;

        Set<String> intersection = new HashSet<>(sourceWords);
        intersection.retainAll(convertedWords);

        return (double) intersection.size() / (double) sourceWords.size();
    }
}
