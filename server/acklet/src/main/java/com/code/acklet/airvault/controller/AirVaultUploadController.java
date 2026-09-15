package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.dto.UploadSessionDtos.*;
import com.code.acklet.airvault.service.AirVaultUploadService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/airvault")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AirVault File Upload Sessions", description = "Server-authoritative chunked uploads, 1 GB cap enforcement, 500 MB single file limits, and 7-day auto-expiry")
public class AirVaultUploadController {

    private final AirVaultUploadService uploadService;

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
    @Operation(summary = "Stream Raw Resource Binary", description = "Non-blocking reactive streaming of file binary without in-memory buffering")
    public void downloadRawFile(
            @PathVariable String clipboardId,
            @PathVariable String fileId,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        com.code.acklet.airvault.entity.ClipboardFile file = uploadService.getFileMetadata(fileId);
        response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
        response.setHeader("Content-Disposition", "inline; filename=\"" + (file.getFileName() != null ? file.getFileName() : fileId) + "\"");
        response.setHeader("Content-Length", String.valueOf(file.getByteSize() != null ? file.getByteSize() : 0));
        response.setHeader("Accept-Ranges", "bytes");
        uploadService.streamRawFile(fileId, response.getOutputStream());
    }

    @GetMapping(value = "/clipboards/{clipboardId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to Real-time Clipboard Events", description = "SSE stream broadcasting live upload progress and tile completions across devices")
    public SseEmitter subscribeEvents(@PathVariable String clipboardId) {
        return uploadService.subscribeClipboardEvents(clipboardId);
    }
}
