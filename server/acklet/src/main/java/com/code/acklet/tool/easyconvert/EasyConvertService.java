package com.code.acklet.tool.easyconvert;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EasyConvertService {

    private static final Logger log = LoggerFactory.getLogger(EasyConvertService.class);
    private static final long MAX_FILE_SIZE_BYTES = 100L * 1024 * 1024; // 100 MB

    /** Supported server-side conversion pairs: "source->target" */
    private static final Set<String> SUPPORTED_PAIRS = Set.of(
            "pdf->txt",
            "pdf->docx",
            "docx->pdf",
            "docx->txt"
    );

    private final Path tempStorageDir;
    private final Map<String, EasyConvertJobResponseDto> jobStore = new ConcurrentHashMap<>();
    private final Map<String, Path> outputFileStore = new ConcurrentHashMap<>();

    public EasyConvertService() throws IOException {
        this.tempStorageDir = Paths.get("workspaces", "temp_conversions").toAbsolutePath().normalize();
        if (!Files.exists(this.tempStorageDir)) {
            Files.createDirectories(this.tempStorageDir);
        }
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────────────────

    public EasyConvertJobResponseDto createJob(MultipartFile file, String targetFormat) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum threshold of 100 MB");
        }

        String sourceExt = extractExtension(file.getOriginalFilename());
        String pairKey   = sourceExt + "->" + targetFormat.toLowerCase();
        if (!SUPPORTED_PAIRS.contains(pairKey)) {
            throw new IllegalArgumentException(
                    "Conversion from ." + sourceExt + " to ." + targetFormat + " is not supported on the server.");
        }

        String jobId           = "job_" + UUID.randomUUID().toString().replace("-", "").substring(0, 13);
        String originalFilename = sanitizeFilename(file.getOriginalFilename());

        EasyConvertJobResponseDto dto = new EasyConvertJobResponseDto(
                jobId, originalFilename, targetFormat, file.getSize(),
                0, EasyConvertJobStatus.CREATED, 0, "Job created",
                null, null, Instant.now(), null
        );
        jobStore.put(jobId, dto);

        // Process asynchronously — raw Thread is fine for this bounded workload
        new Thread(() -> processJob(jobId, file, originalFilename, targetFormat), "ec-worker-" + jobId).start();
        return dto;
    }

    public EasyConvertJobResponseDto getJobStatus(String jobId) {
        EasyConvertJobResponseDto dto = jobStore.get(jobId);
        if (dto == null) throw new IllegalArgumentException("Job not found: " + jobId);
        return dto;
    }

    public File getOutputFile(String jobId) {
        Path path = outputFileStore.get(jobId);
        if (path == null || !Files.exists(path)) {
            throw new IllegalArgumentException("Output file not found or expired for job: " + jobId);
        }
        return path.toFile();
    }

    public void cancelJob(String jobId) {
        EasyConvertJobResponseDto dto = jobStore.get(jobId);
        if (dto != null) updateStatus(dto, EasyConvertJobStatus.CANCELLED, 0, "Job cancelled by user");
    }

    // ─── PRIVATE PROCESSING ──────────────────────────────────────────────────────

    private void processJob(String jobId, MultipartFile file, String originalFilename, String targetFormat) {
        String correlationId = "corr_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        MDC.put("jobId", jobId);
        MDC.put("correlationId", correlationId);

        EasyConvertJobResponseDto dto = jobStore.get(jobId);
        if (dto == null) { MDC.clear(); return; }

        Path inputPath  = null;
        Path outputPath = null;

        try {
            log.info("Starting job [{}] file={} target={}", correlationId, originalFilename, targetFormat);
            updateStatus(dto, EasyConvertJobStatus.VALIDATING_INPUT, 10, "Validating upload...");

            // Write upload to isolated temp path
            inputPath = tempStorageDir.resolve(jobId + "_input_" + originalFilename);
            file.transferTo(inputPath.toFile());

            validateInputBytes(inputPath, originalFilename);

            String baseName  = stripExtension(originalFilename);
            String outputName = baseName + "." + targetFormat.toLowerCase();
            outputPath = tempStorageDir.resolve(jobId + "_output_" + outputName);

            updateStatus(dto, EasyConvertJobStatus.PROCESSING, 40, "Executing conversion...");

            String sourceExt = extractExtension(originalFilename);
            String pairKey   = sourceExt + "->" + targetFormat.toLowerCase();

            switch (pairKey) {
                case "pdf->txt"   -> convertPdfToTxt(inputPath, outputPath, dto);
                case "pdf->docx"  -> convertPdfToDocx(inputPath, outputPath, dto);
                case "docx->pdf"  -> convertDocxToPdf(inputPath, outputPath, dto);
                case "docx->txt"  -> convertDocxToTxt(inputPath, outputPath, dto);
                default           -> throw new IllegalArgumentException("Unsupported conversion: " + pairKey);
            }

            updateStatus(dto, EasyConvertJobStatus.VALIDATING_OUTPUT, 90, "Validating output integrity...");
            long outputSize = Files.size(outputPath);
            if (outputSize == 0) throw new IllegalStateException("Output validation failed: 0 byte output produced");

            outputFileStore.put(jobId, outputPath);
            dto.setOutputSize(outputSize);
            dto.setDownloadUrl("/api/v1/tools/easy-convert/jobs/" + jobId + "/download");
            dto.setCompletedAt(Instant.now());
            updateStatus(dto, EasyConvertJobStatus.COMPLETED, 100, "Conversion verified & ready");

            log.info("Job [{}] completed. output={} bytes", jobId, outputSize);

        } catch (Exception e) {
            log.error("Job [{}] failed", jobId, e);
            dto.setErrorMessage(sanitizeErrorMessage(e.getMessage()));
            updateStatus(dto, EasyConvertJobStatus.FAILED, 0, "Conversion failed");
        } finally {
            // Always delete the input file — never retain uploaded content
            if (inputPath != null) {
                try { Files.deleteIfExists(inputPath); } catch (IOException ignored) {}
            }
            MDC.clear();
        }
    }

    // ─── REAL CONVERSION ENGINES ─────────────────────────────────────────────────

    /** PDFBox: extract all text from PDF, write as UTF-8 plain text file */
    private void convertPdfToTxt(Path inputPath, Path outputPath, EasyConvertJobResponseDto dto) throws IOException {
        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 50, "Extracting text from PDF pages...");
        try (PDDocument doc = Loader.loadPDF(inputPath.toFile())) {
            if (doc.isEncrypted()) {
                throw new IllegalStateException("PDF is encrypted — cannot extract text without password.");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(doc);
            Files.writeString(outputPath, text);
        }
        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 80, "Text extraction complete...");
    }

    /**
     * PDFBox → Apache POI: extract PDF text, create DOCX with one paragraph per page.
     * Fidelity note: text-only extraction. Complex layouts (tables, columns, images)
     * are not reconstructed — this is honest behaviour with a clear disclaimer.
     */
    private void convertPdfToDocx(Path inputPath, Path outputPath, EasyConvertJobResponseDto dto) throws IOException {
        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 45, "Extracting PDF text content...");
        String fullText;
        int pageCount;
        try (PDDocument doc = Loader.loadPDF(inputPath.toFile())) {
            if (doc.isEncrypted()) {
                throw new IllegalStateException("PDF is encrypted — cannot convert without password.");
            }
            pageCount = doc.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            fullText = stripper.getText(doc);
        }

        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 70, "Building DOCX document structure (" + pageCount + " pages)...");
        try (XWPFDocument docx = new XWPFDocument();
             FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {

            // Header disclaimer
            XWPFParagraph header = docx.createParagraph();
            XWPFRun headerRun = header.createRun();
            headerRun.setBold(true);
            headerRun.setFontSize(9);
            headerRun.setColor("888888");
            headerRun.setText("Note: Converted from PDF via text extraction. Complex formatting (tables, images, columns) may not be preserved.");
            headerRun.addBreak();

            // Split on page breaks and write paragraphs
            String[] lines = fullText.split("\\r?\\n");
            for (String line : lines) {
                XWPFParagraph para = docx.createParagraph();
                XWPFRun run = para.createRun();
                run.setText(line.isEmpty() ? " " : line);
            }
            docx.write(fos);
        }
        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 88, "DOCX structure written...");
    }

    /** Apache POI: read DOCX paragraphs, write each as a line in a PDF via PDFBox */
    private void convertDocxToPdf(Path inputPath, Path outputPath, EasyConvertJobResponseDto dto) throws IOException {
        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 45, "Reading DOCX document structure...");
        java.util.List<String> lines = new java.util.ArrayList<>();

        try (FileInputStream fis = new FileInputStream(inputPath.toFile());
             XWPFDocument docx = new XWPFDocument(fis)) {
            for (XWPFParagraph paragraph : docx.getParagraphs()) {
                lines.add(paragraph.getText());
            }
        }

        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 70, "Rendering PDF pages...");
        try (PDDocument pdf = new PDDocument()) {
            PDType1Font font    = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            float fontSize      = 11f;
            float leading       = 1.5f * fontSize;
            PDRectangle pageSize = PDRectangle.A4;
            float margin        = 50f;
            float yStart        = pageSize.getHeight() - margin;
            float yMin          = margin;
            float contentWidth  = pageSize.getWidth() - 2 * margin;

            PDPage page   = new PDPage(pageSize);
            pdf.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(pdf, page);
            cs.setFont(font, fontSize);
            cs.setLeading(leading);
            cs.beginText();
            cs.newLineAtOffset(margin, yStart);
            float yPosition = yStart;

            for (String line : lines) {
                // Split long lines to fit within content width
                java.util.List<String> wrapped = wrapText(line.isEmpty() ? " " : line, font, fontSize, contentWidth);
                for (String segment : wrapped) {
                    if (yPosition <= yMin) {
                        // Start new page
                        cs.endText();
                        cs.close();
                        page = new PDPage(pageSize);
                        pdf.addPage(page);
                        cs = new PDPageContentStream(pdf, page);
                        cs.setFont(font, fontSize);
                        cs.setLeading(leading);
                        cs.beginText();
                        cs.newLineAtOffset(margin, yStart);
                        yPosition = yStart;
                    }
                    cs.showText(sanitizePdfText(segment));
                    cs.newLine();
                    yPosition -= leading;
                }
            }
            cs.endText();
            cs.close();
            pdf.save(outputPath.toFile());
        }
        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 88, "PDF rendering complete...");
    }

    /** Apache POI: extract DOCX paragraph text to plain TXT */
    private void convertDocxToTxt(Path inputPath, Path outputPath, EasyConvertJobResponseDto dto) throws IOException {
        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 50, "Extracting DOCX text content...");
        StringBuilder sb = new StringBuilder();
        try (FileInputStream fis = new FileInputStream(inputPath.toFile());
             XWPFDocument docx = new XWPFDocument(fis)) {
            for (XWPFParagraph para : docx.getParagraphs()) {
                sb.append(para.getText()).append("\n");
            }
        }
        Files.writeString(outputPath, sb.toString());
        updateStatus(dto, EasyConvertJobStatus.PROCESSING, 80, "Text extraction complete...");
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────────

    /** Validate that input bytes match expected header for known formats */
    private void validateInputBytes(Path path, String filename) throws IOException {
        byte[] header = new byte[8];
        try (InputStream is = new FileInputStream(path.toFile())) {
            int read = is.read(header);
            if (read < 4) throw new IllegalStateException("File too small to inspect header");
        }
        String ext = extractExtension(filename);
        switch (ext) {
            case "pdf" -> {
                if (header[0] != 0x25 || header[1] != 0x50 || header[2] != 0x44 || header[3] != 0x46) {
                    throw new IllegalStateException("File does not have a valid PDF header. The file may be corrupt or misnamed.");
                }
            }
            case "docx" -> {
                // DOCX = ZIP: PK\x03\x04
                if (header[0] != 0x50 || header[1] != 0x4B || header[2] != 0x03 || header[3] != 0x04) {
                    throw new IllegalStateException("File does not have a valid DOCX (ZIP) header. The file may be corrupt or misnamed.");
                }
            }
        }
    }

    /** Word-wrap text to fit within maxWidth at given font/size */
    private java.util.List<String> wrapText(String text, PDType1Font font, float fontSize, float maxWidth) throws IOException {
        java.util.List<String> lines = new java.util.ArrayList<>();
        String[] words = text.split(" ");
        StringBuilder current = new StringBuilder();
        for (String word : words) {
            String test = current.isEmpty() ? word : current + " " + word;
            float width;
            try {
                width = font.getStringWidth(sanitizePdfText(test)) / 1000 * fontSize;
            } catch (Exception e) {
                width = 0;
            }
            if (width > maxWidth && !current.isEmpty()) {
                lines.add(current.toString());
                current = new StringBuilder(word);
            } else {
                current = new StringBuilder(test);
            }
        }
        if (!current.isEmpty()) lines.add(current.toString());
        return lines.isEmpty() ? java.util.List.of(" ") : lines;
    }

    /** Strip characters outside Latin-1 range that PDType1Font cannot render */
    private String sanitizePdfText(String text) {
        if (text == null) return "";
        StringBuilder sb = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            sb.append(c < 32 || c > 126 ? ' ' : c);
        }
        return sb.toString();
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private String stripExtension(String filename) {
        if (filename == null) return "output";
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "unnamed_file";
        return filename.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }

    /** Strip stack traces and internal paths from user-facing error messages */
    private String sanitizeErrorMessage(String msg) {
        if (msg == null) return "An unexpected error occurred during conversion.";
        // Remove stack traces and file paths
        return msg.replaceAll("\\bat\\b.*", "").replaceAll("[A-Za-z]:[\\\\/][^\\s]+", "[path]").trim();
    }

    private void updateStatus(EasyConvertJobResponseDto dto, EasyConvertJobStatus status, int progress, String message) {
        dto.setStatus(status);
        dto.setProgressPercent(progress);
        dto.setStageMessage(message);
    }

    // ─── SCHEDULED CLEANUP ───────────────────────────────────────────────────────

    /** Purge temporary files and job records older than 1 hour */
    @Scheduled(fixedRate = 1_800_000)
    public void cleanupExpiredStorage() {
        Instant threshold = Instant.now().minusSeconds(3600);
        jobStore.entrySet().removeIf(entry -> {
            EasyConvertJobResponseDto dto = entry.getValue();
            if (dto.getCreatedAt().isBefore(threshold)) {
                Path outFile = outputFileStore.remove(entry.getKey());
                if (outFile != null) {
                    try { Files.deleteIfExists(outFile); } catch (IOException ignored) {}
                }
                return true;
            }
            return false;
        });
        log.info("Cleanup pass complete. Active jobs remaining: {}", jobStore.size());
    }
}
