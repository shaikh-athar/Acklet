package com.code.acklet.tool.tools.clipboard.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.tools.clipboard.dto.*;
import com.code.acklet.tool.tools.clipboard.entity.ClipboardItemEntity;
import com.code.acklet.tool.tools.clipboard.service.ClipboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/clipboard")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class ClipboardController {

    private final ClipboardService clipboardService;

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<ClipboardConfigDto>> getConfig() {
        ClipboardConfigDto config = clipboardService.getConfig();
        return ResponseEntity.ok(ApiResponse.success(config, "Clipboard config retrieved"));
    }

    @PostMapping("/shares")
    public ResponseEntity<ApiResponse<ClipboardShareDto>> createShare(@RequestBody(required = false) CreateShareRequest request) {
        ClipboardShareDto share = clipboardService.createShare(request);
        return ResponseEntity.ok(ApiResponse.success(share, "Clipboard share created"));
    }

    @PostMapping("/shares/{code}/rename")
    public ResponseEntity<ApiResponse<ClipboardShareDto>> renameShare(
            @PathVariable String code,
            @RequestParam String newCode,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerToken) {
        ClipboardShareDto renamed = clipboardService.renameShare(code, newCode, ownerToken);
        return ResponseEntity.ok(ApiResponse.success(renamed, "Clipboard renamed successfully"));
    }

    @GetMapping("/shares/{code}/available")
    public ResponseEntity<ApiResponse<Boolean>> checkAvailability(@PathVariable String code) {
        boolean available = clipboardService.isCodeAvailable(code);
        return ResponseEntity.ok(ApiResponse.success(available, available ? "Code is available" : "Code is taken"));
    }

    @GetMapping("/shares/{code}")
    public ResponseEntity<ApiResponse<ClipboardShareDto>> getShare(
            @PathVariable String code,
            @RequestParam(required = false) String pin) {
        return clipboardService.getShare(code, pin)
                .map(share -> ResponseEntity.ok(ApiResponse.success(share, "Clipboard share retrieved")))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.<ClipboardShareDto>builder()
                        .success(false)
                        .message("Clipboard not found or expired")
                        .build()));
    }

    @PostMapping("/shares/{code}/text")
    public ResponseEntity<ApiResponse<ClipboardItemDto>> addTextItem(
            @PathVariable String code,
            @RequestBody AddTextRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerToken,
            @RequestParam(value = "isEncrypted", defaultValue = "false") boolean isEncrypted) {
        String text = (request != null) ? request.getText() : "";
        Long expectedVersion = (request != null) ? request.getExpectedVersion() : null;
        ClipboardItemDto item = clipboardService.addTextItem(code, text, expectedVersion, ownerToken, isEncrypted);
        return ResponseEntity.ok(ApiResponse.success(item, "Text saved successfully"));
    }

    @GetMapping(value = "/shares/{code}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeEvents(@PathVariable String code) {
        return clipboardService.subscribeEvents(code);
    }

    @GetMapping("/shares/{code}/revisions")
    public ResponseEntity<ApiResponse<java.util.List<ClipboardTextRevisionDto>>> getRevisions(@PathVariable String code) {
        java.util.List<ClipboardTextRevisionDto> revisions = clipboardService.getTextRevisions(code);
        return ResponseEntity.ok(ApiResponse.success(revisions, "Revisions retrieved"));
    }

    @PostMapping("/shares/{code}/revisions/{revisionId}/restore")
    public ResponseEntity<ApiResponse<ClipboardItemDto>> restoreRevision(
            @PathVariable String code,
            @PathVariable String revisionId,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerToken) {
        ClipboardItemDto restored = clipboardService.restoreTextRevision(code, revisionId, ownerToken);
        return ResponseEntity.ok(ApiResponse.success(restored, "Revision restored successfully"));
    }

    @DeleteMapping("/shares/{code}/items/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @PathVariable String code,
            @PathVariable String itemId,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerToken) {
        boolean deleted = clipboardService.deleteItem(code, itemId, ownerToken);
        if (deleted) {
            return ResponseEntity.ok(ApiResponse.success(null, "Item deleted"));
        } else {
            return ResponseEntity.status(404).body(ApiResponse.<Void>builder()
                    .success(false)
                    .message("Item not found")
                    .build());
        }
    }

    @PostMapping("/shares/{code}/files")
    public ResponseEntity<ApiResponse<ClipboardItemDto>> uploadFile(
            @PathVariable String code,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "isImage", defaultValue = "false") boolean isImage,
            @RequestParam(value = "isEncrypted", defaultValue = "false") boolean isEncrypted,
            @RequestParam(value = "contentHash", required = false) String contentHash,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerToken) {
        try {
            byte[] bytes = file.getBytes();
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String contentType = file.getContentType();
            ClipboardItemDto item = clipboardService.addFileItem(code, originalName, bytes, contentType, isImage, isEncrypted, contentHash);
            return ResponseEntity.ok(ApiResponse.success(item, "File uploaded successfully"));
        } catch (Exception e) {
            log.warn("[ClipboardController] Direct file upload failed for room {}: {}", code, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.<ClipboardItemDto>builder()
                    .success(false)
                    .message("Failed to process file upload: " + e.getMessage())
                    .build());
        }
    }

    // --- Chunked & Resumable Upload Endpoints ---

    @PostMapping("/shares/{code}/uploads/init")
    public ResponseEntity<ApiResponse<UploadSessionResponse>> initChunkedUpload(
            @PathVariable String code,
            @RequestBody UploadSessionInitRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerToken) {
        try {
            UploadSessionResponse session = clipboardService.initChunkedUpload(code, request, ownerToken);
            return ResponseEntity.ok(ApiResponse.success(session, "Upload session initialized"));
        } catch (Exception e) {
            log.warn("[ClipboardController] Init chunk upload failed for room {}: {}", code, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.<UploadSessionResponse>builder()
                    .success(false)
                    .message("Failed to initialize upload session: " + e.getMessage())
                    .build());
        }
    }

    @PutMapping("/shares/{code}/uploads/{uploadId}/chunks/{chunkNumber}")
    public ResponseEntity<ApiResponse<UploadChunkResponse>> uploadChunk(
            @PathVariable String code,
            @PathVariable String uploadId,
            @PathVariable int chunkNumber,
            @RequestParam("chunk") MultipartFile chunk) {
        try {
            byte[] bytes = chunk.getBytes();
            UploadChunkResponse response = clipboardService.uploadChunk(code, uploadId, chunkNumber, bytes);
            return ResponseEntity.ok(ApiResponse.success(response, "Chunk uploaded"));
        } catch (Exception e) {
            log.warn("[ClipboardController] Chunk upload failed for upload {}: {}", uploadId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.<UploadChunkResponse>builder()
                    .success(false)
                    .message("Failed to process chunk: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/shares/{code}/uploads/{uploadId}/complete")
    public ResponseEntity<ApiResponse<ClipboardItemDto>> completeChunkedUpload(
            @PathVariable String code,
            @PathVariable String uploadId) {
        try {
            ClipboardItemDto item = clipboardService.completeChunkedUpload(code, uploadId);
            return ResponseEntity.ok(ApiResponse.success(item, "Upload completed successfully"));
        } catch (Exception e) {
            log.warn("[ClipboardController] Complete upload failed for {}: {}", uploadId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.<ClipboardItemDto>builder()
                    .success(false)
                    .message("Failed to finalize upload: " + e.getMessage())
                    .build());
        }
    }

    // --- Reliable Downloads with Range (Resume) Support ---

    @GetMapping("/shares/{code}/items/{itemId}/download")
    public ResponseEntity<?> downloadFile(
            @PathVariable String code,
            @PathVariable String itemId,
            @RequestHeader(value = "Range", required = false) String rangeHeader) {
        return serveFile(code, itemId, rangeHeader, false);
    }

    @GetMapping("/shares/{code}/items/{itemId}/preview")
    public ResponseEntity<?> previewFile(
            @PathVariable String code,
            @PathVariable String itemId,
            @RequestHeader(value = "Range", required = false) String rangeHeader) {
        return serveFile(code, itemId, rangeHeader, true);
    }

    private ResponseEntity<?> serveFile(String code, String itemId, String rangeHeader, boolean inline) {
        Optional<ClipboardItemEntity> itemOpt = clipboardService.getItem(code, itemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ClipboardItemEntity item = itemOpt.get();
        if (item.getStoragePath() == null || item.getStoragePath().isBlank()) {
            return ResponseEntity.notFound().build();
        }

        String mime = (item.getDetectedMime() != null && !item.getDetectedMime().isBlank())
                ? item.getDetectedMime()
                : "application/octet-stream";
        String filename = (item.getOriginalName() != null && !item.getOriginalName().isBlank())
                ? item.getOriginalName()
                : itemId;
        long totalSize = item.getSizeBytes();

        // Sanitize ASCII fallback for filename="..." to prevent characters outside 0x20..0x7E (e.g. macOS NNBSP \u202F)
        String asciiFallback = filename.replaceAll("[^\\x20-\\x7E]", "_").replace("\"", "").replace("\\", "").trim();
        if (asciiFallback.isBlank()) {
            asciiFallback = "file";
        }
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        String dispositionType = inline ? "inline" : "attachment";
        String contentDisposition = dispositionType + "; filename=\"" + asciiFallback + "\"; filename*=UTF-8''" + encodedFilename;

        try {
            // Handle HTTP Range Request (Resumable Download)
            if (rangeHeader != null && rangeHeader.startsWith("bytes=") && totalSize > 0) {
                String rangeValue = rangeHeader.substring(6).trim();
                long start = 0;
                long end = totalSize - 1;

                int dash = rangeValue.indexOf('-');
                if (dash >= 0) {
                    String startStr = rangeValue.substring(0, dash).trim();
                    String endStr = rangeValue.substring(dash + 1).trim();
                    if (!startStr.isEmpty()) {
                        start = Long.parseLong(startStr);
                    }
                    if (!endStr.isEmpty()) {
                        end = Long.parseLong(endStr);
                    }
                }

                if (start < 0 || end < start || end >= totalSize) {
                    return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                            .header(HttpHeaders.CONTENT_RANGE, "bytes */" + totalSize)
                            .build();
                }

                long contentLength = end - start + 1;
                byte[] rangeBytes = clipboardService.readByteRange(item, start, end);

                if (!inline) {
                    clipboardService.incrementDownloadCount(item.getId());
                }

                return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                        .header(HttpHeaders.CONTENT_TYPE, mime)
                        .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                        .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                        .header(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + totalSize)
                        .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength))
                        .body(rangeBytes);
            }

            // Full content download/stream
            InputStream stream = clipboardService.getFileStream(item);
            if (!inline) {
                clipboardService.incrementDownloadCount(item.getId());
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, mime)
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(totalSize))
                    .body(new InputStreamResource(stream));

        } catch (Exception e) {
            log.error("[ClipboardController] Error streaming file {} for room {}: {}", itemId, code, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
