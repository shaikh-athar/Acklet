package com.code.acklet.airvault.service;

import com.code.acklet.airvault.config.AirVaultLimitsProperties;
import com.code.acklet.airvault.config.AirVaultRabbitMqConfig;
import com.code.acklet.airvault.dto.UploadSessionDtos.*;
import com.code.acklet.airvault.entity.ClipboardFile;
import com.code.acklet.airvault.entity.UploadSession;
import com.code.acklet.airvault.repository.ClipboardFileRepository;
import com.code.acklet.airvault.repository.UploadSessionRepository;
import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultUploadService {

    private final AirVaultLimitsProperties limitsProperties;
    private final UploadSessionRepository uploadSessionRepository;
    private final ClipboardFileRepository clipboardFileRepository;
    private final RabbitTemplate rabbitTemplate;
    private final AirVaultRedisTracker redisTracker;
    private final AirVaultAuditService auditService;
    private final com.code.acklet.airvault.storage.AirVaultStorageAdapter storageAdapter;
    private final AirVaultDecompressedFileCache fileCache;

    // In-memory SSE connections map keyed by clipboardId
    private final Map<String, List<SseEmitter>> clipboardEmitters = new ConcurrentHashMap<>();

    private final Path storageRoot = Paths.get(System.getProperty("java.io.tmpdir"), "acklet_airvault_uploads");

    private synchronized void initStorage() {
        try {
            if (!Files.exists(storageRoot)) {
                Files.createDirectories(storageRoot);
            }
        } catch (IOException e) {
            log.error("[AirVault Storage] Failed to initialize storage root: {}", e.getMessage());
        }
    }

    /**
     * Authoritative Cap Check & Session Initiation
     */
    @Transactional
    public InitiateUploadResponse initiateUpload(String clipboardId, InitiateUploadRequest req) {
        initStorage();

        // 0. Single file size validation
        long maxSingleFile = limitsProperties.getMaxFileBytes();
        if (req.getDeclaredSize() > maxSingleFile) {
            log.warn("[AirVault Upload] ⛔ REJECTED: File size ({} B) exceeds maximum single file limit ({} B)",
                    req.getDeclaredSize(), maxSingleFile);
            throw new BadRequestException("File size exceeds maximum supported single file limit of " + (maxSingleFile / (1024 * 1024 * 1024)) + " GB.");
        }

        // 1. Authoritative DB query for actual stored bytes
        Long currentTotalBytes = clipboardFileRepository.sumTotalBytesByClipboardId(clipboardId);
        if (currentTotalBytes == null) currentTotalBytes = 0L;

        Long activeUploadsBytes = uploadSessionRepository.sumActiveUploadsSizeByClipboardId(clipboardId);
        if (activeUploadsBytes == null) activeUploadsBytes = 0L;

        long maxClipboardCap = limitsProperties.getMaxClipboardBytes();
        long effectiveUsage = currentTotalBytes + activeUploadsBytes;
        long remaining = Math.max(0, maxClipboardCap - effectiveUsage);

        log.info("[AirVault Upload] Init session for clipboard={}: currentUsage={} B, file={} ({} B), remaining={} B",
                clipboardId, effectiveUsage, req.getFileName(), req.getDeclaredSize(), remaining);

        if (req.getDeclaredSize() > remaining) {
            log.warn("[AirVault Upload] ⛔ REJECTED: File size ({} B) exceeds remaining capacity ({} B)",
                    req.getDeclaredSize(), remaining);
            throw new BadRequestException("Storage cap exceeded. Adding this file would exceed the " + (maxClipboardCap / (1024 * 1024 * 1024)) + " GB clipboard limit.");
        }

        // 2. Check if a session already exists for this fileId (idempotent resume/init)
        Optional<UploadSession> existingOpt = uploadSessionRepository.findByFileId(req.getFileId());
        UploadSession session;
        if (existingOpt.isPresent()) {
            session = existingOpt.get();
            session.setStatus("UPLOADING");
            if (req.getBatchId() != null) {
                session.setBatchId(req.getBatchId());
            }
        } else {
            session = UploadSession.builder()
                    .clipboardId(clipboardId)
                    .fileId(req.getFileId())
                    .fileName(req.getFileName())
                    .category(req.getCategory() != null ? req.getCategory() : "file")
                    .declaredSize(req.getDeclaredSize())
                    .chunkSize(req.getChunkSize())
                    .totalChunks(req.getTotalChunks())
                    .receivedBytes(0L)
                    .chunksReceivedCount(0)
                    .receivedChunkIndices("")
                    .status("UPLOADING")
                    .previewUrl(req.getPreviewUrl())
                    .batchId(req.getBatchId())
                    .storagePath(null)
                    .build();
        }

        session = uploadSessionRepository.save(session);

        // Record audit event: upload_started
        auditService.recordEvent(
                "upload_started",
                null,
                req.getSenderDeviceName(),
                req.getSenderDeviceId(),
                null,
                session.getFileId(),
                "SUCCESS",
                null,
                session.getFileName(),
                Map.of("category", session.getCategory(), "declaredSize", session.getDeclaredSize(), "totalChunks", session.getTotalChunks())
        );

        // Notify subscribers
        broadcastEvent(clipboardId, "upload_initiated", Map.of(
                "fileId", session.getFileId(),
                "fileName", session.getFileName(),
                "declaredSize", session.getDeclaredSize(),
                "status", session.getStatus()
        ));

        return InitiateUploadResponse.builder()
                .uploadSessionId(session.getId())
                .fileId(session.getFileId())
                .fileName(session.getFileName())
                .declaredSize(session.getDeclaredSize())
                .currentClipboardBytes(effectiveUsage)
                .remainingCapBytes(remaining - req.getDeclaredSize())
                .status(session.getStatus())
                .build();
    }

    /**
     * Idempotent Chunk Storage (Non-blocking file writing + Redis state tracking)
     */
    @Transactional
    public ChunkUploadResponse storeChunk(UUID sessionId, int chunkIndex, byte[] chunkData) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Upload session not found: " + sessionId));

        if ("COMPLETED".equalsIgnoreCase(session.getStatus()) || "ASSEMBLING".equalsIgnoreCase(session.getStatus())) {
            return buildChunkResponse(session, chunkIndex);
        }

        Path chunkDir = storageRoot.resolve("chunks_" + session.getId().toString());
        Path chunkFile = chunkDir.resolve("chunk_" + chunkIndex);

        try {
            if (!Files.exists(chunkDir)) {
                Files.createDirectories(chunkDir);
            }

            // Write chunk independently without thread locking
            if (!Files.exists(chunkFile)) {
                Files.write(chunkFile, chunkData, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                session.setReceivedBytes(session.getReceivedBytes() + chunkData.length);
            }

            // Record chunk arrival in Redis Set
            redisTracker.recordChunkReceived(sessionId, chunkIndex, chunkData.length);

            Set<Integer> receivedIndices = parseIndices(session.getReceivedChunkIndices());
            receivedIndices.add(chunkIndex);
            session.setReceivedChunkIndices(serializeIndices(receivedIndices));
            session.setChunksReceivedCount(redisTracker.getReceivedChunksCount(sessionId));
            session.setStatus("UPLOADING");

            session = uploadSessionRepository.save(session);

            log.debug("[AirVault Upload] Chunk {}/{} received for session={} (bytes: {})",
                    chunkIndex + 1, session.getTotalChunks(), sessionId, chunkData.length);
        } catch (IOException e) {
            log.error("[AirVault Upload] Failed to write chunk {}: {}", chunkIndex, e.getMessage());
            throw new BadRequestException("Failed to persist chunk on server storage");
        }

        ChunkUploadResponse resp = buildChunkResponse(session, chunkIndex);

        // Broadcast live progress to all connected devices on this clipboard
        broadcastEvent(session.getClipboardId(), "upload_progress", resp);

        return resp;
    }

    /**
     * Query Missing Chunks for Resumable Upload (Powered by Redis)
     */
    @Transactional(readOnly = true)
    public UploadSessionStatusResponse getSessionStatus(UUID sessionId) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Upload session not found: " + sessionId));

        List<Integer> missing = redisTracker.getMissingChunks(sessionId, session.getTotalChunks());
        int receivedCount = redisTracker.getReceivedChunksCount(sessionId);
        if (receivedCount == 0 && session.getChunksReceivedCount() > 0) {
            receivedCount = session.getChunksReceivedCount();
        }

        double percent = session.getTotalChunks() > 0 ? (double) receivedCount / session.getTotalChunks() * 100.0 : 0.0;

        return UploadSessionStatusResponse.builder()
                .uploadSessionId(session.getId())
                .fileId(session.getFileId())
                .fileName(session.getFileName())
                .status(session.getStatus())
                .totalChunks(session.getTotalChunks())
                .chunksReceived(receivedCount)
                .missingChunkIndices(missing)
                .receivedBytes(session.getReceivedBytes())
                .progressPercent(Math.round(percent * 10.0) / 10.0)
                .build();
    }

    /**
     * Finalize & Queue Asynchronous Background Assembly via RabbitMQ
     */
    @Transactional
    public CompleteUploadResponse completeUpload(UUID sessionId, CompleteUploadRequest req) {
        UploadSession session = uploadSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Upload session not found: " + sessionId));

        // 1. Guard: count-based check (Redis + DB fallback)
        int receivedCount = redisTracker.getReceivedChunksCount(sessionId);
        if (receivedCount < session.getTotalChunks() && session.getChunksReceivedCount() < session.getTotalChunks()) {
            throw new BadRequestException("Cannot complete upload: missing chunks (" +
                    Math.max(receivedCount, session.getChunksReceivedCount()) + "/" + session.getTotalChunks() + " received)");
        }

        // 2. Guard: filesystem existence check — the count may be correct but chunk files
        //    must physically exist on disk before we publish the assembly job.
        //    Files.write() inside storeChunk() is not transactional; the DB count can be
        //    consistent while the OS write hasn't flushed yet.
        Path chunkDir = storageRoot.resolve("chunks_" + sessionId);
        List<Integer> missingOnDisk = new ArrayList<>();
        for (int i = 0; i < session.getTotalChunks(); i++) {
            if (!Files.exists(chunkDir.resolve("chunk_" + i))) {
                missingOnDisk.add(i);
            }
        }
        if (!missingOnDisk.isEmpty()) {
            log.warn("[AirVault Upload] ⚠️ completeUpload: chunks {} not yet on disk for session={} — aborting finalize",
                    missingOnDisk, sessionId);
            throw new BadRequestException("Cannot complete upload: chunk files not yet fully written to disk (indices: " + missingOnDisk + ")");
        }

        session.setStatus("ASSEMBLING");
        if (req.getChecksum() != null) session.setChecksum(req.getChecksum());
        if (req.getPreviewUrl() != null) session.setPreviewUrl(req.getPreviewUrl());
        uploadSessionRepository.save(session);
        redisTracker.setSessionStatus(sessionId, "ASSEMBLING");

        // Publish event to RabbitMQ for asynchronous background worker assembly & compression
        try {
            rabbitTemplate.convertAndSend(
                    AirVaultRabbitMqConfig.AIRVAULT_UPLOAD_EXCHANGE,
                    AirVaultRabbitMqConfig.ROUTING_KEY_UPLOAD_COMPLETED,
                    Map.of(
                            "uploadSessionId", sessionId.toString(),
                            "clipboardId", session.getClipboardId(),
                            "fileName", session.getFileName()
                    )
            );
            log.info("[AirVault Upload] 📤 Dispatched assembly job to RabbitMQ for uploadSessionId: {}", sessionId);
        } catch (Exception rmqErr) {
            log.warn("[AirVault Upload] RabbitMQ dispatch warning: {}. Running synchronous fallback.", rmqErr.getMessage());
            // Synchronous fallback if broker temporarily offline
            assembleSynchronously(session);
        }

        return CompleteUploadResponse.builder()
                .uploadSessionId(session.getId())
                .fileId(session.getFileId())
                .fileName(session.getFileName())
                .category(session.getCategory())
                .finalByteSize(session.getReceivedBytes())
                .checksum(session.getChecksum())
                .status("ASSEMBLING")
                .previewUrl(session.getPreviewUrl())
                .build();
    }

    private void assembleSynchronously(UploadSession session) {
        Path sessionChunkDir = storageRoot.resolve("chunks_" + session.getId().toString());
        Path finalStorageDir = storageRoot.resolve("files");

        String ext = "";
        if (session.getFileName() != null && session.getFileName().contains(".")) {
            ext = session.getFileName().substring(session.getFileName().lastIndexOf('.') + 1);
        }
        boolean isMedia = session.getFileName() != null &&
                (session.getFileName().matches("(?i).*\\.(mp4|webm|mov|mkv|m4v|mp3|wav|ogg|m4a|aac|pdf|png|jpe?g|webp|gif|svg)$"));

        String assembledFilename = isMedia
                ? "file_" + session.getFileId() + (ext.isEmpty() ? "" : "." + ext)
                : session.getFileId() + ".bin";

        Path finalFile = finalStorageDir.resolve(assembledFilename);

        try {
            if (!Files.exists(finalStorageDir)) Files.createDirectories(finalStorageDir);

            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            long totalAssembledBytes = 0;

            try (OutputStream fileOut = Files.newOutputStream(finalFile, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                 BufferedOutputStream bufferedOut = new BufferedOutputStream(fileOut)) {
                for (int i = 0; i < session.getTotalChunks(); i++) {
                    Path chunkPath = sessionChunkDir.resolve("chunk_" + i);
                    if (Files.exists(chunkPath)) {
                        byte[] chunkBytes = Files.readAllBytes(chunkPath);
                        bufferedOut.write(chunkBytes);
                        sha256.update(chunkBytes);
                        totalAssembledBytes += chunkBytes.length;
                    }
                }
                bufferedOut.flush();
            }

            byte[] hashBytes = sha256.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                hexString.append(String.format("%02x", b));
            }
            String calculatedChecksum = hexString.toString();

            String storageObjectKey = "files/" + assembledFilename;
            try (InputStream in = Files.newInputStream(finalFile)) {
                storageAdapter.storeObject(storageObjectKey, in, totalAssembledBytes, null);
            }

            ClipboardFile file = clipboardFileRepository.findByFileId(session.getFileId())
                    .orElse(ClipboardFile.builder()
                            .clipboardId(session.getClipboardId())
                            .fileId(session.getFileId())
                            .build());

            file.setFileName(session.getFileName());
            file.setCategory(session.getCategory());
            file.setByteSize(totalAssembledBytes);
            file.setChecksum(calculatedChecksum);
            file.setStoragePath(storageObjectKey);
            file.setPreviewUrl(session.getPreviewUrl());
            file.setBatchId(session.getBatchId());

            clipboardFileRepository.save(file);

            session.setStatus("COMPLETED");
            session.setReceivedBytes(totalAssembledBytes);
            session.setStoragePath(storageObjectKey);
            uploadSessionRepository.save(session);
            redisTracker.setSessionStatus(session.getId(), "READY");

            broadcastEvent(session.getClipboardId(), "upload_complete", Map.of(
                    "fileId", session.getFileId(),
                    "fileName", session.getFileName(),
                    "category", session.getCategory(),
                    "byteSize", session.getReceivedBytes(),
                    "previewUrl", session.getPreviewUrl() != null ? session.getPreviewUrl() : ""
            ));

            // Clean up temporary chunk files immediately after successful assembly
            try (var stream = Files.walk(sessionChunkDir)) {
                stream.sorted(Comparator.reverseOrder())
                      .map(Path::toFile)
                      .forEach(File::delete);
            } catch (IOException ignored) {}

            auditService.recordEvent(
                    "upload_finalized",
                    null,
                    null,
                    null,
                    null,
                    session.getFileId(),
                    "SUCCESS",
                    null,
                    session.getFileName(),
                    Map.of("byteSize", session.getReceivedBytes(), "category", session.getCategory())
            );
        } catch (Exception e) {
            log.error("[AirVault Upload] Synchronous assembly fallback failed: {}", e.getMessage());
            auditService.recordEvent(
                    "upload_failed",
                    null,
                    null,
                    null,
                    null,
                    session.getFileId(),
                    "FAILURE",
                    null,
                    null,
                    Map.of("error", e.getMessage() != null ? e.getMessage() : "Assembly failure")
            );
        }
    }

    /**
     * Get aggregate batch status & per-file statuses
     */
    @Transactional(readOnly = true)
    public BatchStatusResponse getBatchStatus(String clipboardId, String batchId) {
        List<UploadSession> sessions = uploadSessionRepository.findAllByClipboardIdAndBatchId(clipboardId, batchId);
        List<ClipboardFile> completedFiles = clipboardFileRepository.findAllByClipboardIdAndBatchId(clipboardId, batchId);

        Map<String, ClipboardFile> completedMap = completedFiles.stream()
                .collect(Collectors.toMap(ClipboardFile::getFileId, f -> f, (a, b) -> a));

        List<BatchFileStatusDto> fileDtos = new ArrayList<>();
        int totalCount = sessions.size();
        int completedCount = 0;
        int failedCount = 0;
        long totalBytes = 0L;
        long receivedBytes = 0L;

        for (UploadSession s : sessions) {
            totalBytes += s.getDeclaredSize() != null ? s.getDeclaredSize() : 0L;
            receivedBytes += s.getReceivedBytes() != null ? s.getReceivedBytes() : 0L;

            boolean isDone = "COMPLETED".equalsIgnoreCase(s.getStatus()) || completedMap.containsKey(s.getFileId());
            boolean isFailed = "FAILED".equalsIgnoreCase(s.getStatus());

            if (isDone) completedCount++;
            if (isFailed) failedCount++;

            double progress = s.getTotalChunks() > 0 ? (double) s.getChunksReceivedCount() / s.getTotalChunks() * 100.0 : (isDone ? 100.0 : 0.0);

            fileDtos.add(BatchFileStatusDto.builder()
                    .fileId(s.getFileId())
                    .fileName(s.getFileName())
                    .category(s.getCategory())
                    .byteSize(s.getDeclaredSize() != null ? s.getDeclaredSize() : 0L)
                    .status(isDone ? "COMPLETED" : (isFailed ? "FAILED" : s.getStatus()))
                    .progressPercent(Math.round(progress * 10.0) / 10.0)
                    .previewUrl(s.getPreviewUrl())
                    .build());
        }

        String batchStatus = "PENDING";
        if (totalCount > 0 && completedCount == totalCount) {
            batchStatus = "COMPLETED";
        } else if (failedCount == totalCount && totalCount > 0) {
            batchStatus = "FAILED";
        } else if (failedCount > 0) {
            batchStatus = "PARTIAL_FAILURE";
        } else if (receivedBytes > 0) {
            batchStatus = "UPLOADING";
        }

        double aggProgress = totalBytes > 0 ? ((double) receivedBytes / totalBytes) * 100.0 : 0.0;

        return BatchStatusResponse.builder()
                .batchId(batchId)
                .clipboardId(clipboardId)
                .totalFiles(totalCount)
                .completedFiles(completedCount)
                .failedFiles(failedCount)
                .totalBytes(totalBytes)
                .receivedBytes(receivedBytes)
                .aggregateProgressPercent(Math.round(aggProgress * 10.0) / 10.0)
                .status(batchStatus)
                .files(fileDtos)
                .build();
    }

    /**
     * Stream server-side ZIP archive containing all files in a batch
     */
    @Transactional(readOnly = true)
    public void streamBatchZip(String clipboardId, String batchId, OutputStream out) throws IOException {
        List<ClipboardFile> files = clipboardFileRepository.findAllByClipboardIdAndBatchId(clipboardId, batchId);
        if (files.isEmpty()) {
            throw new ResourceNotFoundException("No completed files found for batch " + batchId);
        }

        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(out)) {
            Set<String> entryNames = new HashSet<>();
            for (ClipboardFile file : files) {
                if (file.getStoragePath() == null || file.getStoragePath().isBlank()) continue;
                if (!storageAdapter.exists(file.getStoragePath())) continue;

                String entryName = file.getFileName();
                int suffix = 1;
                while (entryNames.contains(entryName)) {
                    int dotIdx = file.getFileName().lastIndexOf('.');
                    if (dotIdx > 0) {
                        entryName = file.getFileName().substring(0, dotIdx) + "_" + suffix + file.getFileName().substring(dotIdx);
                    } else {
                        entryName = file.getFileName() + "_" + suffix;
                    }
                    suffix++;
                }
                entryNames.add(entryName);

                java.util.zip.ZipEntry zipEntry = new java.util.zip.ZipEntry(entryName);
                zos.putNextEntry(zipEntry);
                try (InputStream fileIn = storageAdapter.getObject(file.getStoragePath())) {
                    byte[] buffer = new byte[65536];
                    int len;
                    while ((len = fileIn.read(buffer)) != -1) {
                        zos.write(buffer, 0, len);
                    }
                }
                zos.closeEntry();
            }
            zos.finish();
        }
    }

    /**
     * Stream single raw file binary directly to output stream (zero in-memory buffering for 1GB scale)
     */
    @Transactional(readOnly = true)
    public ClipboardFile getFileMetadata(String fileId) {
        return clipboardFileRepository.findByFileId(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File resource not found: " + fileId));
    }

    @Transactional(readOnly = true)
    public Path getDecompressedFilePath(String fileId) throws IOException {
        ClipboardFile file = getFileMetadata(fileId);
        String storagePath = file.getStoragePath();
        if (storagePath == null || storagePath.isBlank()) {
            throw new ResourceNotFoundException("File storage path missing for: " + fileId);
        }

        String checksum = file.getChecksum() != null ? file.getChecksum() : fileId;

        return fileCache.getOrDecompressPath(checksum, destination -> {
            try (InputStream rawIn = storageAdapter.getObject(storagePath);
                 BufferedInputStream bufIn = new BufferedInputStream(rawIn)) {

                bufIn.mark(2);
                byte[] signature = new byte[2];
                int read = bufIn.read(signature);
                bufIn.reset();

                boolean isGzip = (read == 2 && ((signature[0] & 0xFF) == 0x1F) && ((signature[1] & 0xFF) == 0x8B));
                try (InputStream streamToRead = isGzip ? new java.util.zip.GZIPInputStream(bufIn) : bufIn;
                     OutputStream destOut = Files.newOutputStream(destination, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                     BufferedOutputStream bufDestOut = new BufferedOutputStream(destOut)) {

                    byte[] buffer = new byte[65536];
                    int bytesRead;
                    long totalWritten = 0;
                    while ((bytesRead = streamToRead.read(buffer)) != -1) {
                        bufDestOut.write(buffer, 0, bytesRead);
                        totalWritten += bytesRead;
                    }
                    bufDestOut.flush();
                    return totalWritten;
                }
            }
        });
    }

    @Transactional(readOnly = true)
    public void streamRawFile(String fileId, OutputStream out) throws IOException {
        ClipboardFile file = getFileMetadata(fileId);
        String storagePath = file.getStoragePath();
        if (storagePath == null || storagePath.isBlank()) {
            throw new ResourceNotFoundException("File storage path missing for: " + fileId);
        }

        String checksum = file.getChecksum() != null ? file.getChecksum() : fileId;

        // Use cached decompressed stream if available, or stream and decompress on the fly
        try (InputStream decompressedIn = fileCache.getOrDecompress(checksum, destination -> {
            // Supplier to write decompressed stream to cache file
            try (InputStream rawIn = storageAdapter.getObject(storagePath);
                 PushbackInputStream pushbackIn = new PushbackInputStream(new BufferedInputStream(rawIn), 2);
                 OutputStream destOut = Files.newOutputStream(destination, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                 BufferedOutputStream bufDestOut = new BufferedOutputStream(destOut)) {

                // Check for GZIP magic number 0x1f 0x8b
                byte[] signature = new byte[2];
                int read = pushbackIn.read(signature);
                if (read == 2) {
                    pushbackIn.unread(signature);
                }

                boolean isGzip = (read == 2 && ((signature[0] & 0xFF) == 0x1F) && ((signature[1] & 0xFF) == 0x8B));
                InputStream streamToRead = isGzip ? new java.util.zip.GZIPInputStream(pushbackIn) : pushbackIn;

                byte[] buffer = new byte[65536];
                int bytesRead;
                long totalWritten = 0;
                while ((bytesRead = streamToRead.read(buffer)) != -1) {
                    bufDestOut.write(buffer, 0, bytesRead);
                    totalWritten += bytesRead;
                }
                bufDestOut.flush();
                return totalWritten;
            }
        })) {
            byte[] buffer = new byte[65536];
            int bytesRead;
            while ((bytesRead = decompressedIn.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
            out.flush();
        }
    }

    /**
     * Authoritative Usage Endpoint
     */
    @Transactional(readOnly = true)
    public ClipboardUsageResponse getClipboardUsage(String clipboardId) {
        Long totalBytes = clipboardFileRepository.sumTotalBytesByClipboardId(clipboardId);
        if (totalBytes == null) totalBytes = 0L;

        List<ClipboardFile> files = clipboardFileRepository.findAllByClipboardIdOrderByCreatedAtDesc(clipboardId);

        long maxCap = limitsProperties.getMaxClipboardBytes();
        double percent = Math.min(100.0, ((double) totalBytes / maxCap) * 100.0);
        long remaining = Math.max(0, maxCap - totalBytes);

        return ClipboardUsageResponse.builder()
                .clipboardId(clipboardId)
                .totalBytes(totalBytes)
                .maxCapBytes(maxCap)
                .usedPercent(Math.round(percent * 10.0) / 10.0)
                .remainingBytes(remaining)
                .totalFilesCount(files.size())
                .build();
    }

    /**
     * Resets all stored files, chunks, and sessions for a clipboard (idempotent)
     */
    @Transactional
    public void resetClipboard(String clipboardId) {
        log.info("[AirVault Storage] 🧹 Resetting clipboard storage for clipboardId: {}", clipboardId);

        // 1. Delete physical files from active storage adapter & invalidate cache
        List<ClipboardFile> files = clipboardFileRepository.findAllByClipboardId(clipboardId);
        for (ClipboardFile file : files) {
            try {
                if (file.getStoragePath() != null) {
                    storageAdapter.deleteObject(file.getStoragePath());
                }
                if (file.getChecksum() != null) {
                    fileCache.evict(file.getChecksum());
                }
            } catch (IOException e) {
                log.warn("[AirVault Storage] Failed to delete object {}: {}", file.getStoragePath(), e.getMessage());
            }
        }

        // 2. Delete chunks for uncompleted upload sessions
        List<UploadSession> sessions = uploadSessionRepository.findAllByClipboardId(clipboardId);
        for (UploadSession session : sessions) {
            Path sessionChunkDir = storageRoot.resolve("chunks_" + session.getId().toString());
            try {
                if (Files.exists(sessionChunkDir)) {
                    try (var stream = Files.walk(sessionChunkDir)) {
                        stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                            try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                        });
                    }
                }
            } catch (IOException ignored) {}
        }

        // 3. Purge DB records
        clipboardFileRepository.deleteAllByClipboardId(clipboardId);
        uploadSessionRepository.deleteAllByClipboardId(clipboardId);

        // 4. Broadcast usage reset event via SSE
        broadcastEvent(clipboardId, "clipboard_reset", Map.of(
                "clipboardId", clipboardId,
                "totalBytes", 0L,
                "totalFilesCount", 0
        ));

        log.info("[AirVault Storage] ✅ Clipboard storage successfully reset to 0 bytes for: {}", clipboardId);
    }

    /**
     * Real-time SSE subscription
     */
    public SseEmitter subscribeClipboardEvents(String clipboardId) {
        SseEmitter emitter = new SseEmitter(180_000L); // 3 minutes timeout
        List<SseEmitter> list = clipboardEmitters.computeIfAbsent(clipboardId, k -> Collections.synchronizedList(new ArrayList<>()));
        list.add(emitter);

        emitter.onCompletion(() -> list.remove(emitter));
        emitter.onTimeout(() -> list.remove(emitter));
        emitter.onError((e) -> list.remove(emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("Connected to clipboard: " + clipboardId));
        } catch (IOException ignored) {}

        return emitter;
    }

    public void broadcastEvent(String clipboardId, String eventName, Object data) {
        List<SseEmitter> list = clipboardEmitters.get(clipboardId);
        if (list == null || list.isEmpty()) return;

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        list.removeAll(deadEmitters);
    }

    private ChunkUploadResponse buildChunkResponse(UploadSession s, int chunkIndex) {
        double percent = s.getTotalChunks() > 0 ? (double) s.getChunksReceivedCount() / s.getTotalChunks() * 100.0 : 0.0;
        return ChunkUploadResponse.builder()
                .uploadSessionId(s.getId())
                .fileId(s.getFileId())
                .chunkIndex(chunkIndex)
                .totalChunks(s.getTotalChunks())
                .chunksReceived(s.getChunksReceivedCount())
                .receivedBytes(s.getReceivedBytes())
                .progressPercent(Math.round(percent * 10.0) / 10.0)
                .status(s.getStatus())
                .build();
    }

    private Set<Integer> parseIndices(String raw) {
        if (raw == null || raw.isBlank()) return new HashSet<>();
        return Arrays.stream(raw.split(","))
                .filter(s -> !s.isBlank())
                .map(Integer::parseInt)
                .collect(Collectors.toSet());
    }

    private String serializeIndices(Set<Integer> set) {
        return set.stream().map(String::valueOf).collect(Collectors.joining(","));
    }
}
