package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.dto.UploadSessionDtos.*;
import com.code.acklet.airvault.service.AirVaultUploadAssemblyWorker;
import com.code.acklet.airvault.service.AirVaultUploadService;
import com.code.acklet.airvault.storage.AirVaultStorageAdapter;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.InputStream;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/airvault")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AirVault File Upload Sessions", description = "Server-authoritative chunked uploads, 1 GB cap enforcement, 500 MB single file limits, and 7-day auto-expiry")
public class AirVaultUploadController {

    private final AirVaultUploadService uploadService;
    private final AirVaultStorageAdapter storageAdapter;

    @PostMapping("/clipboards/{clipboardId}/uploads")
    @Operation(summary = "Initiate Upload Session", description = "Authoritative server-side check against 500 MB single file and 1 GB clipboard limit before initiating session")
    public ResponseEntity<ApiResponse<InitiateUploadResponse>> initiateUpload(
            @PathVariable String clipboardId,
            @Valid @RequestBody InitiateUploadRequest request) {
        InitiateUploadResponse res = uploadService.initiateUpload(clipboardId, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Upload session initiated"));
    }

    @PutMapping(value = "/uploads/{uploadSessionId}/chunks/{chunkIndex}", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @Operation(summary = "Upload Encrypted Chunk", description = "Idempotently stores ciphertext chunk and returns verified progress")
    public ResponseEntity<ApiResponse<ChunkUploadResponse>> uploadChunk(
            @PathVariable UUID uploadSessionId,
            @PathVariable int chunkIndex,
            @RequestBody byte[] chunkData) {
        ChunkUploadResponse res = uploadService.storeChunk(uploadSessionId, chunkIndex, chunkData);
        return ResponseEntity.ok(ApiResponse.success(res, "Chunk processed"));
    }

    @GetMapping("/uploads/{uploadSessionId}/status")
    @Operation(summary = "Get Upload Session Status", description = "Returns received vs missing chunk indices for resilient resume")
    public ResponseEntity<ApiResponse<UploadSessionStatusResponse>> getStatus(@PathVariable UUID uploadSessionId) {
        UploadSessionStatusResponse res = uploadService.getSessionStatus(uploadSessionId);
        return ResponseEntity.ok(ApiResponse.success(res, "Upload status retrieved"));
    }

    @PostMapping("/uploads/{uploadSessionId}/complete")
    @Operation(summary = "Complete Upload Session", description = "Verifies all chunks, records checksum, and finalizes clipboard tile")
    public ResponseEntity<ApiResponse<CompleteUploadResponse>> completeUpload(
            @PathVariable UUID uploadSessionId,
            @Valid @RequestBody CompleteUploadRequest request) {
        CompleteUploadResponse res = uploadService.completeUpload(uploadSessionId, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Upload completed successfully"));
    }

    @GetMapping("/clipboards/{clipboardId}/usage")
    @Operation(summary = "Get Clipboard Usage", description = "Authoritative database calculation of total stored bytes vs 1 GB cap")
    public ResponseEntity<ApiResponse<ClipboardUsageResponse>> getUsage(@PathVariable String clipboardId) {
        ClipboardUsageResponse res = uploadService.getClipboardUsage(clipboardId);
        return ResponseEntity.ok(ApiResponse.success(res, "Clipboard usage computed"));
    }

    @DeleteMapping("/clipboards/{clipboardId}")
    @Operation(summary = "Reset Clipboard Storage", description = "Deletes all stored files and sessions for a clipboard, resetting usage to 0")
    public ResponseEntity<ApiResponse<Void>> resetClipboard(@PathVariable String clipboardId) {
        uploadService.resetClipboard(clipboardId);
        return ResponseEntity.ok(ApiResponse.success(null, "Clipboard storage reset successfully"));
    }

    @GetMapping("/clipboards/{clipboardId}/batches/{batchId}/status")
    @Operation(summary = "Get Batch Status", description = "Returns aggregate progress and per-file status for a multi-file batch")
    public ResponseEntity<ApiResponse<BatchStatusResponse>> getBatchStatus(
            @PathVariable String clipboardId,
            @PathVariable String batchId) {
        BatchStatusResponse res = uploadService.getBatchStatus(clipboardId, batchId);
        return ResponseEntity.ok(ApiResponse.success(res, "Batch status retrieved"));
    }

    @GetMapping(value = "/clipboards/{clipboardId}/batches/{batchId}/download-all", produces = "application/zip")
    @Operation(summary = "Download All Files in Batch", description = "Streams a single ZIP archive containing all files in the batch")
    public void downloadBatchZip(
            @PathVariable String clipboardId,
            @PathVariable String batchId,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        response.setContentType("application/zip");
        response.setHeader("Content-Disposition", "attachment; filename=\"batch_" + batchId + ".zip\"");
        uploadService.streamBatchZip(clipboardId, batchId, response.getOutputStream());
    }

    @GetMapping(value = "/clipboards/{clipboardId}/files/{fileId}/raw")
    @Operation(summary = "Stream Raw Resource Binary", description = "Progressive HTTP Range-based streaming supporting audio/video seeking and full downloads via universal StorageAdapter")
    public ResponseEntity<InputStreamResource> downloadRawFile(
            @PathVariable String clipboardId,
            @PathVariable String fileId,
            @RequestHeader(value = "Range", required = false) String rangeHeader) throws java.io.IOException {

        log.info("[AirVault Streaming] 📥 Incoming raw stream request for clipboardId='{}', fileId='{}', Range='{}'",
                clipboardId, fileId, rangeHeader);

        com.code.acklet.airvault.entity.ClipboardFile file;
        try {
            file = uploadService.getFileMetadata(fileId);
        } catch (Exception e) {
            log.warn("[AirVault Streaming] ❌ File metadata NOT found in DB for fileId='{}': {}", fileId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        String storagePath = file.getStoragePath();
        if (storagePath == null || storagePath.isBlank()) {
            log.error("[AirVault Streaming] ❌ Inconsistent metadata: ClipboardFile for fileId='{}' (name='{}', size={} B) has no storagePath persisted! Assembly may not have completed.",
                    fileId, file.getFileName(), file.getByteSize());
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        boolean existsInStorage = storageAdapter.exists(storagePath);
        log.info("[AirVault Streaming] 🔎 Metadata located: fileName='{}', storagePath='{}', existsInStorage={}, byteSize={} B",
                file.getFileName(), storagePath, existsInStorage, file.getByteSize());

        if (!existsInStorage) {
            log.error("[AirVault Streaming] ❌ Physical media object NOT FOUND in storage provider ({}) at key='{}' for fileId='{}'",
                    storageAdapter.getProviderName(), storagePath, fileId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        long totalLength = file.getByteSize() != null && file.getByteSize() > 0
                ? file.getByteSize()
                : storageAdapter.getObjectSize(storagePath);

        String filename = file.getFileName() != null ? file.getFileName() : fileId;
        String contentType = resolveContentType(storagePath != null ? storagePath : filename);
        MediaType mediaType = MediaType.parseMediaType(contentType);

        // HTTP Byte-Range Seeking (RFC 7233)
        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            long start = 0;
            long end = totalLength - 1;

            try {
                String rangeSpec = rangeHeader.substring(6).trim();
                String[] parts = rangeSpec.split("-", 2);
                start = Long.parseLong(parts[0]);
                if (parts.length > 1 && !parts[1].isBlank()) {
                    end = Long.parseLong(parts[1]);
                }
            } catch (Exception e) {
                log.warn("[AirVault Streaming] ⚠️ Failed parsing Range header '{}': {}", rangeHeader, e.getMessage());
            }

            if (start >= totalLength) {
                log.warn("[AirVault Streaming] ⚠️ Requested range start {} exceeds total length {}", start, totalLength);
                return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                        .header(HttpHeaders.CONTENT_RANGE, "bytes */" + totalLength)
                        .build();
            }

            end = Math.min(end, totalLength - 1);
            long rangeLength = end - start + 1;

            log.info("[AirVault Streaming] ⚡ Serving 206 Partial Content: bytes {}-{}/{} (length={} B, type={})",
                    start, end, totalLength, rangeLength, contentType);

            InputStream rangeStream = storageAdapter.getRange(storagePath, start, end);

            org.springframework.http.ContentDisposition contentDisposition = org.springframework.http.ContentDisposition.inline()
                    .filename(filename, java.nio.charset.StandardCharsets.UTF_8)
                    .build();

            return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                    .contentType(mediaType)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CONTENT_RANGE, String.format("bytes %d-%d/%d", start, end, totalLength))
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(rangeLength))
                    .headers(headers -> headers.setContentDisposition(contentDisposition))
                    .body(new InputStreamResource(rangeStream));
        }

        log.info("[AirVault Streaming] ⚡ Serving 200 OK Full Stream: totalLength={} B, type={}", totalLength, contentType);

        // Full File Response (200 OK)
        InputStream fullStream = storageAdapter.getObject(storagePath);

        org.springframework.http.ContentDisposition contentDisposition = org.springframework.http.ContentDisposition.inline()
                .filename(filename, java.nio.charset.StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .headers(headers -> headers.setContentDisposition(contentDisposition))
                .contentLength(totalLength)
                .body(new InputStreamResource(fullStream));
    }

    @GetMapping(value = "/clipboards/{clipboardId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to Real-time Clipboard Events", description = "SSE stream broadcasting live upload progress and tile completions across devices")
    public SseEmitter subscribeEvents(@PathVariable String clipboardId) {
        return uploadService.subscribeClipboardEvents(clipboardId);
    }

    private String resolveContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".mkv")) return "video/x-matroska";
        if (lower.endsWith(".m4v")) return "video/x-m4v";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".m4a") || lower.endsWith(".aac")) return "audio/mp4";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".zip")) return "application/zip";
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }
}
