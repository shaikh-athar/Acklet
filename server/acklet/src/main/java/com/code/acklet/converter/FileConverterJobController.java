package com.code.acklet.converter;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST controller for multi-file batch document conversion jobs, structure analysis, and ZIP downloads.
 * Strictly implements the Acklet File Converter backend contract without exposing third-party library names.
 */
@Slf4j
@RestController
@RequestMapping("/api/file-converter")
@RequiredArgsConstructor
@Tag(name = "File Converter Batch API", description = "Endpoints for batch multi-document conversion, structure checks, and archive downloads")
public class FileConverterJobController {

    private final FileConverterJobService jobService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "Create batch conversion job", description = "Uploads up to 20 documents and initiates asynchronous conversion.")
    @PostMapping(value = "/jobs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<BatchJob> createJob(
            @Parameter(description = "Array of documents to convert (up to 20 files, 50MB each)")
            @RequestParam("files") MultipartFile[] files,
            @Parameter(description = "Optional conversion options JSON payload")
            @RequestParam(value = "options", required = false) String optionsJson,
            @Parameter(description = "Target format shorthand (e.g. pdf, docx, xlsx)")
            @RequestParam(value = "targetFormat", required = false) String targetFormat,
            @Parameter(description = "Layout fidelity: editable, balanced, or exact")
            @RequestParam(value = "fidelity", required = false) String fidelity,
            @Parameter(description = "OCR toggle for scanned pages")
            @RequestParam(value = "ocr", required = false) Boolean ocr,
            @Parameter(description = "Keep embedded images toggle")
            @RequestParam(value = "keepImages", required = false) Boolean keepImages,
            @Parameter(description = "Page range e.g. 1-3, 5")
            @RequestParam(value = "pageRange", required = false) String pageRange,
            @Parameter(description = "Delivery mode: individual or zip")
            @RequestParam(value = "deliveryMode", required = false) String deliveryMode) {

        ConversionOptions options = new ConversionOptions();
        if (optionsJson != null && !optionsJson.isBlank()) {
            try {
                options = objectMapper.readValue(optionsJson, ConversionOptions.class);
            } catch (Exception e) {
                log.warn("Failed to parse options JSON, falling back to query parameters: {}", e.getMessage());
            }
        }

        // Apply parameter overrides if supplied
        if (targetFormat != null && !targetFormat.isBlank()) options.setTargetFormat(targetFormat);
        if (fidelity != null && !fidelity.isBlank()) options.setFidelity(fidelity);
        if (ocr != null) options.setOcr(ocr);
        if (keepImages != null) options.setKeepImages(keepImages);
        if (pageRange != null) options.setPageRange(pageRange);
        if (deliveryMode != null && !deliveryMode.isBlank()) options.setDeliveryMode(deliveryMode);

        log.info("Received batch job creation request: {} files, target='{}', fidelity='{}', ocr={}, keepImages={}, pageRange='{}'",
                files.length, options.getTargetFormat(), options.getFidelity(), options.isOcr(), options.isKeepImages(), options.getPageRange());

        BatchJob job = jobService.createJob(files, options);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(job);
    }

    @Operation(summary = "Get batch job status", description = "Checks progress, per-file status, and structure reports for a batch job.")
    @GetMapping(value = "/jobs/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<BatchJob> getJobStatus(
            @Parameter(description = "Unique batch job identifier")
            @PathVariable("id") String jobId) {
        BatchJob job = jobService.getJob(jobId);
        return ResponseEntity.ok(job);
    }

    @Operation(summary = "Download individual converted file", description = "Downloads a specific converted document from a batch job.")
    @GetMapping("/jobs/{id}/files/{fileId}")
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "Unique batch job identifier")
            @PathVariable("id") String jobId,
            @Parameter(description = "Unique file identifier within the job")
            @PathVariable("fileId") String fileId) {

        Resource resource = jobService.getConvertedFile(jobId, fileId);
        String filename = resource.getFilename() != null ? resource.getFilename() : "converted-document";
        FileJobItem fileItem = jobService.getFileItem(jobId, fileId);

        var responseBuilder = ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");

        if (fileItem != null) {
            if (fileItem.getFidelityLevel() != null) {
                responseBuilder.header("X-Fidelity-Level", fileItem.getFidelityLevel());
            }
            if (fileItem.getFidelityReasons() != null && !fileItem.getFidelityReasons().isEmpty()) {
                responseBuilder.header("X-Fidelity-Reasons", String.join("; ", fileItem.getFidelityReasons()));
            }
        }

        return responseBuilder.body(resource);
    }

    @Operation(summary = "Get document structure model", description = "Returns the versioned document model for the structure and review panel.")
    @GetMapping(value = "/jobs/{id}/files/{fileId}/structure", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Object> getFileStructure(
            @Parameter(description = "Unique batch job identifier")
            @PathVariable("id") String jobId,
            @Parameter(description = "Unique file identifier within the job")
            @PathVariable("fileId") String fileId) {
        return ResponseEntity.ok(jobService.getFileStructureModel(jobId, fileId));
    }

    @Operation(summary = "Download all files as ZIP", description = "Packages all converted documents in the batch into a single ZIP archive.")
    @GetMapping("/jobs/{id}/zip")
    public ResponseEntity<Resource> downloadZip(
            @Parameter(description = "Unique batch job identifier")
            @PathVariable("id") String jobId) {

        Resource resource = jobService.getJobZip(jobId);
        String filename = "converted-documents-" + jobId.substring(0, 8) + ".zip";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }

    @Operation(summary = "Delete conversion job", description = "Immediately deletes all job files and purged metadata from the server.")
    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<Map<String, Object>> deleteJob(
            @Parameter(description = "Unique batch job identifier")
            @PathVariable("id") String jobId) {
        jobService.deleteJob(jobId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Job deleted successfully"));
    }

    @Operation(summary = "Inspect document structure", description = "Analyzes document structure and detects headings, tables, columns, and images.")
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<StructureReport> analyze(
            @Parameter(description = "Document to inspect")
            @RequestParam("file") MultipartFile file) {
        StructureReport report = jobService.analyzeSingleFile(file);
        return ResponseEntity.ok(report);
    }

    @Operation(summary = "Get conversion capabilities", description = "Returns tested conversion pairs and their flags for the UI.")
    @GetMapping(value = "/capabilities", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<java.util.List<com.code.acklet.converter.engine.ConversionEntry>> getCapabilities() {
        return ResponseEntity.ok(jobService.getCapabilities());
    }

    @Operation(summary = "Stream job progress events", description = "Server-Sent Events endpoint streaming live job and file progress updates.")
    @GetMapping(value = "/jobs/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamJobEvents(
            @Parameter(description = "Unique batch job identifier")
            @PathVariable("id") String jobId) {
        return jobService.subscribeEvents(jobId);
    }
}

