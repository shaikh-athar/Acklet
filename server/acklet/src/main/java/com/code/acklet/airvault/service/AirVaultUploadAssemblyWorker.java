package com.code.acklet.airvault.service;

import com.code.acklet.airvault.config.AirVaultRabbitMqConfig;
import com.code.acklet.airvault.entity.ClipboardFile;
import com.code.acklet.airvault.entity.UploadSession;
import com.code.acklet.airvault.repository.ClipboardFileRepository;
import com.code.acklet.airvault.repository.UploadSessionRepository;
import com.code.acklet.airvault.storage.AirVaultStorageAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultUploadAssemblyWorker {

    private final UploadSessionRepository uploadSessionRepository;
    private final ClipboardFileRepository clipboardFileRepository;
    private final AirVaultRedisTracker redisTracker;
    private final AirVaultUploadService uploadService;
    private final AirVaultAuditService auditService;
    private final AirVaultStorageAdapter storageAdapter;

    private final Path storageRoot = Paths.get(System.getProperty("java.io.tmpdir"), "acklet_airvault_uploads");

    // -------------------------------------------------------------------------
    // Startup Verification & Migration
    // -------------------------------------------------------------------------

    @PostConstruct
    public void onStartup() {
        migrateLegacyCompressedBinaryMedia();
    }

    public void migrateLegacyCompressedBinaryMedia() {
        log.info("[AirVault Worker] 🔍 Checking for legacy compressed binary media files to migrate...");
        try {
            List<ClipboardFile> legacyFiles = clipboardFileRepository.findAll();
            int migratedCount = 0;

            for (ClipboardFile file : legacyFiles) {
                String path = file.getStoragePath();
                if (path == null) continue;

                boolean isLegacyGz = path.endsWith(".bin.gz") || path.endsWith(".gz");
                boolean isMedia = isBinaryMedia(file.getFileName(), file.getCategory(), null);

                if (isLegacyGz && isMedia) {
                    log.info("[AirVault Worker] 📦 Migrating legacy compressed media file: {} (path={})", file.getFileName(), path);

                    // Determine clean uncompressed extension
                    String ext = getFileExtension(file.getFileName());
                    String newKey = "files/file_" + file.getFileId() + (ext.isEmpty() ? "" : "." + ext);

                    if (storageAdapter.exists(path)) {
                        try (InputStream rawIn = storageAdapter.getObject(path);
                             PushbackInputStream pushIn = new PushbackInputStream(new BufferedInputStream(rawIn), 2)) {

                            byte[] signature = new byte[2];
                            int read = pushIn.read(signature);
                            if (read == 2) pushIn.unread(signature);

                            boolean isGzip = (read == 2 && ((signature[0] & 0xFF) == 0x1F) && ((signature[1] & 0xFF) == 0x8B));
                            InputStream streamToRead = isGzip ? new GZIPInputStream(pushIn) : pushIn;

                            // Write uncompressed to temporary file
                            Path tempUncompressed = Files.createTempFile("legacy_migrate_", ".tmp");
                            try {
                                long uncompressedBytes;
                                try (OutputStream out = Files.newOutputStream(tempUncompressed)) {
                                chip: uncompressedBytes = streamToRead.transferTo(out);
                                }

                                // Store uncompressed object with correct key
                                try (InputStream uncompressedIn = Files.newInputStream(tempUncompressed)) {
                                    storageAdapter.storeObject(newKey, uncompressedIn, uncompressedBytes, resolveMimeType(file.getFileName()));
                                }

                                // Delete old legacy compressed object
                                storageAdapter.deleteObject(path);

                                // Update DB record
                                file.setStoragePath(newKey);
                                file.setByteSize(uncompressedBytes);
                                clipboardFileRepository.save(file);
                                migratedCount++;

                                log.info("[AirVault Worker] ✅ Successfully migrated legacy media file to uncompressed: {}", newKey);

                            } finally {
                                Files.deleteIfExists(tempUncompressed);
                            }
                        } catch (Exception e) {
                            log.warn("[AirVault Worker] ⚠️ Could not migrate legacy file {}: {}", path, e.getMessage());
                        }
                    }
                }
            }

            if (migratedCount > 0) {
                log.info("[AirVault Worker] 🎉 Finished legacy media migration: converted {} files to uncompressed.", migratedCount);
            }

        } catch (Exception e) {
            log.warn("[AirVault Worker] ⚠️ Legacy media migration check skipped due to: {}", e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // RabbitMQ Message Handler & Chunk Assembly
    // -------------------------------------------------------------------------

    @RabbitListener(
            queues = AirVaultRabbitMqConfig.AIRVAULT_UPLOAD_COMPLETED_QUEUE,
            concurrency = "3-10",
            ackMode = "MANUAL"
    )
    @Transactional
    public void processUploadAssembly(
            Map<String, Object> message,
            com.rabbitmq.client.Channel channel,
            @org.springframework.messaging.handler.annotation.Header(org.springframework.amqp.support.AmqpHeaders.DELIVERY_TAG) long deliveryTag
    ) {
        String sessionIdStr = (String) message.get("uploadSessionId");
        if (sessionIdStr == null) {
            log.error("[AirVault Worker] ⛔ Received invalid assembly message: {}", message);
            try { channel.basicAck(deliveryTag, false); } catch (Exception ignored) {}
            return;
        }

        UUID sessionId = UUID.fromString(sessionIdStr);

        Optional<UploadSession> sessionOpt = uploadSessionRepository.findById(sessionId);
        if (sessionOpt.isEmpty()) {
            log.debug("[AirVault Worker] Upload session {} no longer exists (already purged or deleted); discarding message.", sessionId);
            try { channel.basicAck(deliveryTag, false); } catch (Exception ignored) {}
            return;
        }

        UploadSession session = sessionOpt.get();
        session.setStatus("ASSEMBLING");
        uploadSessionRepository.save(session);
        redisTracker.setSessionStatus(sessionId, "ASSEMBLING");

        Path sessionChunkDir = storageRoot.resolve("chunks_" + session.getId().toString());
        Path finalStorageDir = storageRoot.resolve("files");

        String ext = getFileExtension(session.getFileName());
        boolean isMedia = isBinaryMedia(session.getFileName(), session.getCategory(), null);

        // Determine destination filename: preserve extension for binary media (e.g., file_<fileId>.mp4)
        String assembledFilename = isMedia
                ? "file_" + session.getFileId() + (ext.isEmpty() ? "" : "." + ext)
                : session.getFileId() + ".bin";

        Path tempAssemblyFile = null;

        try {
            tempAssemblyFile = Files.createTempFile("airvault_asm_", ".tmp");
            if (!Files.exists(finalStorageDir)) {
                Files.createDirectories(finalStorageDir);
            }

            // Pre-flight: verify ALL chunk files exist on disk before starting assembly
            List<Integer> missingChunks = new ArrayList<>();
            for (int i = 0; i < session.getTotalChunks(); i++) {
                if (!Files.exists(sessionChunkDir.resolve("chunk_" + i))) {
                    missingChunks.add(i);
                }
            }
            if (!missingChunks.isEmpty()) {
                log.debug("[AirVault Worker] Missing chunk indices {} in directory: {} for session {}. Marking session as FAILED.",
                        missingChunks, sessionChunkDir, sessionId);
                session.setStatus("FAILED");
                uploadSessionRepository.save(session);
                redisTracker.setSessionStatus(sessionId, "FAILED");
                if (Files.exists(sessionChunkDir)) {
                    deleteChunkDir(sessionChunkDir);
                }
                try { Files.deleteIfExists(tempAssemblyFile); } catch (IOException ignored) {}
                try { channel.basicAck(deliveryTag, false); } catch (Exception ignored) {}
                return;
            }

            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            long totalAssembledBytes = 0;

            // 1. Sequentially assemble all chunks into isolated temporary staging file
            try (OutputStream fileOut = Files.newOutputStream(tempAssemblyFile, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                 BufferedOutputStream bufferedOut = new BufferedOutputStream(fileOut)) {

                for (int i = 0; i < session.getTotalChunks(); i++) {
                    Path chunkPath = sessionChunkDir.resolve("chunk_" + i);
                    byte[] chunkBytes = Files.readAllBytes(chunkPath);
                    bufferedOut.write(chunkBytes);
                    sha256.update(chunkBytes);
                    totalAssembledBytes += chunkBytes.length;
                }
                bufferedOut.flush();
            }

            // 2. Compute Hex Checksum
            byte[] hashBytes = sha256.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                hexString.append(String.format("%02x", b));
            }
            String calculatedChecksum = hexString.toString();

            String contentType = resolveMimeType(session.getFileName());
            String storageObjectKey;

            // 3. Media vs Text branching:
            // Video / Audio / Image / PDF -> Keep uncompressed, store with proper extension & MIME
            // Text / JSON / Clipboard -> Optional GZIP compression
            if (isMedia) {
                storageObjectKey = "files/" + assembledFilename;
                try (InputStream in = Files.newInputStream(tempAssemblyFile)) {
                    storageAdapter.storeObject(storageObjectKey, in, totalAssembledBytes, contentType);
                }
            } else {
                // For non-binary text payloads, optionally gzip
                Path compressedFile = Files.createTempFile("airvault_cmp_", ".gz");
                try (InputStream in = Files.newInputStream(tempAssemblyFile);
                     OutputStream out = Files.newOutputStream(compressedFile, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                     GZIPOutputStream gzipOut = new GZIPOutputStream(out)) {
                    byte[] buffer = new byte[8192];
                    int len;
                    while ((len = in.read(buffer)) > 0) {
                        gzipOut.write(buffer, 0, len);
                    }
                }
                long compressedSize = Files.size(compressedFile);
                storageObjectKey = "files/" + session.getFileId() + ".gz";
                try (InputStream in = Files.newInputStream(compressedFile)) {
                    storageAdapter.storeObject(storageObjectKey, in, compressedSize, "application/gzip");
                }
                try { Files.deleteIfExists(compressedFile); } catch (IOException ignored) {}
            }

            // Clean up temporary assembly file
            try { Files.deleteIfExists(tempAssemblyFile); } catch (IOException ignored) {}

            // 5. Save/Update permanent ClipboardFile entity with exact storagePath & byteSize
            ClipboardFile clipboardFile = clipboardFileRepository.findByFileId(session.getFileId())
                    .orElse(ClipboardFile.builder()
                            .clipboardId(session.getClipboardId())
                            .fileId(session.getFileId())
                            .build());

            clipboardFile.setFileName(session.getFileName());
            clipboardFile.setCategory(session.getCategory());
            clipboardFile.setByteSize(totalAssembledBytes);
            clipboardFile.setChecksum(calculatedChecksum);
            clipboardFile.setStoragePath(storageObjectKey);
            clipboardFile.setPreviewUrl(session.getPreviewUrl());
            clipboardFile.setBatchId(session.getBatchId());

            clipboardFileRepository.save(clipboardFile);

            // 5. Update session status & Redis
            session.setStatus("COMPLETED");
            session.setReceivedBytes(totalAssembledBytes);
            session.setStoragePath(storageObjectKey);
            uploadSessionRepository.save(session);

            // Post-Assembly Consistency Safeguard: Verify physical presence & size
            if (!storageAdapter.exists(storageObjectKey)) {
                log.error("[AirVault Worker] ❌ Integrity check failed: Stored object key '{}' not found in storage provider ({}) after assembly for session {}!",
                        storageObjectKey, storageAdapter.getProviderName(), sessionId);
            } else {
                long verifiedSize = storageAdapter.getObjectSize(storageObjectKey);
                if (verifiedSize != totalAssembledBytes) {
                    log.warn("[AirVault Worker] ⚠️ Size mismatch post-assembly: expected {} B, storage reported {} B for key '{}'",
                            totalAssembledBytes, verifiedSize, storageObjectKey);
                }
            }

            redisTracker.setSessionStatus(sessionId, "READY");

            // 6. Clean up intermediate temporary chunks
            if (Files.exists(sessionChunkDir)) {
                deleteChunkDir(sessionChunkDir);
            }

            // Acknowledge RabbitMQ message
            try {
                channel.basicAck(deliveryTag, false);
            } catch (Exception ackEx) {
                log.warn("[AirVault Worker] Could not ACK deliveryTag={}: {}", deliveryTag, ackEx.getMessage());
            }

            log.info("[AirVault Worker] ✅ File assembly completed for {}: {} bytes, key={}, checksum={}",
                    session.getFileName(), totalAssembledBytes, storageObjectKey, calculatedChecksum);

            // 7. Broadcast SSE upload_complete event
            uploadService.broadcastEvent(session.getClipboardId(), "upload_complete", Map.of(
                    "fileId", session.getFileId(),
                    "fileName", session.getFileName(),
                    "category", session.getCategory(),
                    "byteSize", totalAssembledBytes,
                    "checksum", calculatedChecksum,
                    "previewUrl", session.getPreviewUrl() != null ? session.getPreviewUrl() : ""
            ));

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
                    Map.of("byteSize", totalAssembledBytes, "checksum", calculatedChecksum, "category", session.getCategory())
            );

        } catch (Exception e) {
            log.error("[AirVault Worker] ⛔ Failed to assemble upload session {}: {}", sessionId, e.getMessage(), e);
            session.setStatus("FAILED");
            uploadSessionRepository.save(session);
            redisTracker.setSessionStatus(sessionId, "FAILED");

            try {
                // Acknowledge poisoned/failed message to prevent infinite crash loops
                channel.basicAck(deliveryTag, false);
            } catch (Exception ackEx) {
                log.warn("[AirVault Worker] Could not ACK failed message deliveryTag={}: {}", deliveryTag, ackEx.getMessage());
            }

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

    private boolean isBinaryMedia(String filename, String category, String contentType) {
        if (category != null) {
            String cat = category.toLowerCase().trim();
            if (cat.equals("video") || cat.equals("audio") || cat.equals("image") || cat.equals("pdf") || cat.equals("binary")) {
                return true;
            }
        }
        if (contentType != null) {
            String ct = contentType.toLowerCase().trim();
            if (ct.startsWith("video/") || ct.startsWith("audio/") || ct.startsWith("image/") || ct.equals("application/pdf")) {
                return true;
            }
        }
        if (filename != null) {
            String lower = filename.toLowerCase().trim();
            return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov") || lower.endsWith(".mkv")
                    || lower.endsWith(".m4v") || lower.endsWith(".avi")
                    || lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg") || lower.endsWith(".m4a")
                    || lower.endsWith(".aac") || lower.endsWith(".flac")
                    || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")
                    || lower.endsWith(".gif") || lower.endsWith(".svg")
                    || lower.endsWith(".pdf") || lower.endsWith(".zip") || lower.endsWith(".tar") || lower.endsWith(".gz");
        }
        return false;
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(dot + 1) : "";
    }

    private String resolveMimeType(String filename) {
        if (filename == null) return "application/octet-stream";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".mkv")) return "video/x-matroska";
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
        return "application/octet-stream";
    }

    private String calculateSha256Hex(Path path) throws Exception {
        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        try (InputStream in = Files.newInputStream(path)) {
            byte[] buf = new byte[8192];
            int read;
            while ((read = in.read(buf)) > 0) {
                sha256.update(buf, 0, read);
            }
        }
        byte[] hashBytes = sha256.digest();
        StringBuilder hexString = new StringBuilder();
        for (byte b : hashBytes) {
            hexString.append(String.format("%02x", b));
        }
        return hexString.toString();
    }

    private void deleteChunkDir(Path dir) {
        try (var stream = Files.walk(dir)) {
            stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                try { Files.deleteIfExists(p); } catch (Exception ignored) {}
            });
        } catch (Exception e) {
            log.warn("[AirVault Worker] ⚠️ Could not delete chunk dir {}: {}", dir, e.getMessage());
        }
    }
}
