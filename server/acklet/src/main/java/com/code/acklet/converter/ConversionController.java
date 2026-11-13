package com.code.acklet.converter;

import com.code.acklet.converter.exception.*;
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
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;

/**
 * REST controller for multi-format document conversion, status polling, and downloads.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/converter")
@RequiredArgsConstructor
@Tag(name = "Document Converter", description = "Endpoints for document conversion, status tracking, and file downloads")
public class ConversionController {

    private final ConverterService converterService;

    @Operation(summary = "Convert a document", description = "Uploads a document and initiates conversion to the desired target format.")
    @PostMapping(value = "/convert", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ConversionResult> convert(
            @Parameter(description = "Document file to convert")
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Target output format (e.g., pdf, docx, xlsx, txt)")
            @RequestParam("targetFormat") String targetFormat,
            @Parameter(description = "Force asynchronous background conversion with status polling")
            @RequestParam(value = "async", required = false) Boolean async) {

        log.info("Received conversion request: file='{}', targetFormat='{}', forceAsync={}",
                file.getOriginalFilename(), targetFormat, async);

        ConversionResult result = converterService.convert(file, targetFormat, async);

        if (result.getStatus() == ConversionStatus.PROCESSING || result.getStatus() == ConversionStatus.PENDING) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(result);
        }

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Get conversion job status", description = "Checks the progress and completion status of an asynchronous conversion job.")
    @GetMapping(value = "/status/{jobId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ConversionResult> getStatus(
            @Parameter(description = "Unique conversion job ID")
            @PathVariable("jobId") String jobId) {

        ConversionResult result = converterService.getJobStatus(jobId);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Download converted file", description = "Streams the converted output file for download once the job is completed.")
    @GetMapping(value = "/download/{jobId}")
    public ResponseEntity<Resource> download(
            @Parameter(description = "Unique conversion job ID")
            @PathVariable("jobId") String jobId) {

        Resource resource = converterService.downloadConvertedFile(jobId);
        String fileName = converterService.getConvertedFileName(jobId);
        String contentType = converterService.getConvertedContentType(jobId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .body(resource);
    }

    @Operation(summary = "List supported formats", description = "Returns available input formats and their allowed target outputs.")
    @GetMapping(value = "/formats", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getSupportedFormats() {
        List<Map<String, Object>> formats = new ArrayList<>();
        for (ConversionFormat format : converterService.getSupportedSourceFormats()) {
            Map<String, Object> item = new HashMap<>();
            item.put("extension", format.getExtension());
            item.put("name", format.getDisplayName());
            item.put("mimeType", format.getMimeType());
            item.put("family", format.getFamily().name());
            item.put("supportedTargets", format.getTargetExtensions());
            formats.add(item);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("formats", formats);
        response.put("engineAvailable", converterService.isAvailable());
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Check converter health", description = "Checks whether the LibreOffice conversion daemon is running and responsive.")
    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", converterService.isAvailable() ? "UP" : "DEGRADED");
        health.put("engine", "JODConverter / LibreOffice");
        health.put("available", converterService.isAvailable());
        health.put("timestamp", Instant.now().toString());

        HttpStatus status = converterService.isAvailable() ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(health);
    }

    // ── Exception Handling & Status Code Mapping ──────────────────────────────

    @ExceptionHandler(UnsupportedFormatException.class)
    public ResponseEntity<Map<String, Object>> handleUnsupportedFormat(UnsupportedFormatException ex) {
        log.warn("Unsupported format requested: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "UNSUPPORTED_FORMAT", ex.getMessage());
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidFile(InvalidFileException ex) {
        log.warn("Invalid file upload: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "INVALID_FILE", ex.getMessage());
    }

    @ExceptionHandler(JobNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleJobNotFound(JobNotFoundException ex) {
        log.warn("Job not found: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(ConversionTimeoutException.class)
    public ResponseEntity<Map<String, Object>> handleTimeout(ConversionTimeoutException ex) {
        log.error("Conversion timeout: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.GATEWAY_TIMEOUT, "CONVERSION_TIMEOUT", ex.getMessage());
    }

    @ExceptionHandler(EngineUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleEngineUnavailable(EngineUnavailableException ex) {
        log.error("Engine unavailable: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, "ENGINE_UNAVAILABLE", ex.getMessage());
    }

    @ExceptionHandler(ConversionFailedException.class)
    public ResponseEntity<Map<String, Object>> handleConversionFailed(ConversionFailedException ex) {
        log.error("Conversion failed: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, "CONVERSION_FAILED", ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxSizeExceeded(MaxUploadSizeExceededException ex) {
        log.warn("Max upload size exceeded: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                "Uploaded file exceeds the maximum allowed payload size.");
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(HttpStatus status, String code, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", code);
        error.put("message", message);
        error.put("status", status.value());
        error.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(status).body(error);
    }
}

