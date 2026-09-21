package com.code.acklet.airvault.service;

import com.code.acklet.airvault.config.AirVaultRabbitMqConfig;
import com.code.acklet.airvault.entity.ClipboardFile;
import com.code.acklet.airvault.entity.UploadSession;
import com.code.acklet.airvault.repository.ClipboardFileRepository;
import com.code.acklet.airvault.repository.UploadSessionRepository;
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
import java.util.zip.GZIPOutputStream;
import org.springframework.scheduling.annotation.Scheduled;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultUploadAssemblyWorker {

    private final UploadSessionRepository uploadSessionRepository;
    private final ClipboardFileRepository clipboardFileRepository;
    private final AirVaultRedisTracker redisTracker;
    private final AirVaultUploadService uploadService;
    private final AirVaultAuditService auditService;
    private final com.code.acklet.airvault.storage.AirVaultStorageAdapter storageAdapter;

    private final Path storageRoot = Paths.get(System.getProperty("java.io.tmpdir"), "acklet_airvault_uploads");

    // -------------------------------------------------------------------------
    // Chunk-storage housekeeping
    // -------------------------------------------------------------------------

    /**
     * Wipes every {@code chunks_*} directory under {@link #storageRoot} on
     * application startup.  This clears any orphaned chunk directories that
     * accumulated before the previous JVM process terminated (e.g. the
     * "Missing chunk indices [0]" crash loops seen in production logs).
     */
    @PostConstruct
    public void purgeAllChunkDirectoriesOnStartup() {
        log.info("[AirVault Worker] 🧹 Startup chunk-storage purge initiated on: {}", storageRoot);
        int purged = purgeAllChunkDirectories();
        log.info("[AirVault Worker] 🧹 Startup purge complete — removed {} chunk director{}.",
                purged, purged == 1 ? "y" : "ies");
    }

    /**
     * Daily sweep to remove any {@code chunks_*} directories that were not
     * cleaned up during normal assembly (e.g. process kill, disk-full, etc.).
     * Runs once a day at 02:00 AM server time.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void scheduledChunkStoragePurge() {
        log.info("[AirVault Worker] 🕑 Scheduled daily chunk-storage purge started.");
        int purged = purgeAllChunkDirectories();
        log.info("[AirVault Worker] 🕑 Scheduled purge complete — removed {} chunk director{}.",
                purged, purged == 1 ? "y" : "ies");
    }

    /**
     * Deletes every directory inside {@link #storageRoot} whose name starts
     * with {@code chunks_}.  Returns the number of directories deleted.
     */
    private int purgeAllChunkDirectories() {
        if (!Files.exists(storageRoot)) {
            return 0;
        }
        int count = 0;
        try (var entries = Files.newDirectoryStream(storageRoot, "chunks_*")) {
            for (Path chunkDir : entries) {
                if (Files.isDirectory(chunkDir)) {
                    deleteChunkDir(chunkDir);
                    count++;
                }
            }
        } catch (Exception e) {
            log.warn("[AirVault Worker] ⚠️ Error during chunk-storage purge: {}", e.getMessage());
        }
        return count;
    }

    /** Recursively deletes {@code dir} and all its contents, ignoring errors. */
    private void deleteChunkDir(Path dir) {
        try (var stream = Files.walk(dir)) {
            stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                try { Files.deleteIfExists(p); } catch (Exception ignored) {}
            });
        } catch (Exception e) {
            log.warn("[AirVault Worker] ⚠️ Could not fully delete {}: {}", dir, e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // RabbitMQ message handler
    // -------------------------------------------------------------------------

    @RabbitListener(queues = AirVaultRabbitMqConfig.AIRVAULT_UPLOAD_COMPLETED_QUEUE, concurrency = "3-10")
    @Transactional
    public void processUploadAssembly(Map<String, Object> message) {
        String sessionIdStr = (String) message.get("uploadSessionId");
        if (sessionIdStr == null) {
            log.error("[AirVault Worker] ⛔ Received invalid assembly message: {}", message);
            return;
        }

        UUID sessionId = UUID.fromString(sessionIdStr);

        Optional<UploadSession> sessionOpt = uploadSessionRepository.findById(sessionId);
        if (sessionOpt.isEmpty()) {
            log.debug("[AirVault Worker] Upload session {} no longer exists (already purged or deleted); discarding message.", sessionId);
            return;
        }

        UploadSession session = sessionOpt.get();
        session.setStatus("ASSEMBLING");
        uploadSessionRepository.save(session);
        redisTracker.setSessionStatus(sessionId, "ASSEMBLING");

        Path sessionChunkDir = storageRoot.resolve("chunks_" + session.getId().toString());
        Path finalStorageDir = storageRoot.resolve("files");
        Path finalFile = finalStorageDir.resolve(session.getFileId() + ".bin");

        try {
            if (!Files.exists(finalStorageDir)) {
                Files.createDirectories(finalStorageDir);
            }

            // Pre-flight: verify ALL chunk files exist on disk before starting assembly.
            List<Integer> missingChunks = new ArrayList<>();
            for (int i = 0; i < session.getTotalChunks(); i++) {
                if (!Files.exists(sessionChunkDir.resolve("chunk_" + i))) {
                    missingChunks.add(i);
                }
            }
            if (!missingChunks.isEmpty()) {
                log.warn("[AirVault Worker] ⚠️ Missing chunk indices {} in directory: {} for session {}. Marking session as FAILED.",
                        missingChunks, sessionChunkDir, sessionId);
                session.setStatus("FAILED");
                uploadSessionRepository.save(session);
                redisTracker.setSessionStatus(sessionId, "FAILED");
                return;
            }

            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            long totalAssembledBytes = 0;

            // 1. Sequentially assemble all chunks
            try (OutputStream fileOut = Files.newOutputStream(finalFile, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
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

            // 3. Post-Assembly Compression Option (Store compressed archive alongside)
            Path compressedFile = finalStorageDir.resolve(session.getFileId() + ".gz");
            long compressedSize = 0;
            try (InputStream in = Files.newInputStream(finalFile);
                 OutputStream out = Files.newOutputStream(compressedFile, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                 GZIPOutputStream gzipOut = new GZIPOutputStream(out)) {
                byte[] buffer = new byte[8192];
                int len;
                while ((len = in.read(buffer)) > 0) {
                    gzipOut.write(buffer, 0, len);
                }
            }
            if (Files.exists(compressedFile)) {
                compressedSize = Files.size(compressedFile);
            }

            // 4. Store object into configured storage adapter (Local disk or Cloudflare R2)
            String storageObjectKey = "files/" + session.getFileId() + ".bin";
            try (InputStream in = Files.newInputStream(finalFile)) {
                storageAdapter.storeObject(storageObjectKey, in, totalAssembledBytes, "application/octet-stream");
            }

            // 5. Save permanent ClipboardFile entity
            ClipboardFile clipboardFile = ClipboardFile.builder()
                    .clipboardId(session.getClipboardId())
                    .fileId(session.getFileId())
                    .fileName(session.getFileName())
                    .category(session.getCategory())
                    .byteSize(totalAssembledBytes)
                    .checksum(calculatedChecksum)
                    .storagePath(storageObjectKey)
                    .previewUrl(session.getPreviewUrl())
                    .build();

            clipboardFileRepository.save(clipboardFile);

            // 6. Update session status & Redis
            session.setStatus("COMPLETED");
            session.setReceivedBytes(totalAssembledBytes);
            session.setStoragePath(storageObjectKey);
            uploadSessionRepository.save(session);

            redisTracker.setSessionStatus(sessionId, "READY");

            // 7. Clean up intermediate temporary chunks & assembled temp files
            if (Files.exists(sessionChunkDir)) {
                deleteChunkDir(sessionChunkDir);
            }
            try {
                Files.deleteIfExists(compressedFile);
                if (!"LOCAL".equalsIgnoreCase(storageAdapter.getProviderName())) {
                    // For R2, cleanup the temporary local assembly file as it is now in the cloud
                    Files.deleteIfExists(finalFile);
                }
            } catch (IOException ignored) {}

            log.info("[AirVault Worker] ✅ File assembly completed for {}: {} bytes, checksum={}",
                    session.getFileName(), totalAssembledBytes, calculatedChecksum);

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
            // Do NOT re-throw — re-throwing causes Spring Retry to re-deliver the same message
            // in a tight loop (3× within ~1s per the RetryOperationsInterceptor in the stacktrace)
            // before routing to the DLQ, amplifying log noise without any chance of recovery.
            // The session is already marked FAILED in DB + Redis; the x-dead-letter-exchange
            // binding on the queue handles DLQ routing automatically on natural message NACK.
        }
    }
}
