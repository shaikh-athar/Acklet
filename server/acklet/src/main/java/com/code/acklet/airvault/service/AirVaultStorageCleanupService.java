package com.code.acklet.airvault.service;

import com.code.acklet.airvault.config.AirVaultLimitsProperties;
import com.code.acklet.airvault.entity.AirVaultStorageCleanupLog;
import com.code.acklet.airvault.entity.ClipboardFile;
import com.code.acklet.airvault.entity.UploadSession;
import com.code.acklet.airvault.repository.AirVaultStorageCleanupLogRepository;
import com.code.acklet.airvault.repository.ClipboardFileRepository;
import com.code.acklet.airvault.repository.UploadSessionRepository;
import com.code.acklet.airvault.storage.AirVaultStorageAdapter;
import com.code.acklet.airvault.storage.AirVaultStorageAdapter.StorageObjectMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Scheduled Storage Retention & Cleanup Engine for AirVault.
 * <p>
 * Implements two completely separate cleanup paths:
 * <ul>
 *   <li><b>Path A (User-Facing File Retention)</b>: 7-day recoverable grace period. Two-phase mark & sweep.</li>
 *   <li><b>Path B (Dead Upload Chunks)</b>: Short grace period (default 2h), hourly immediate purge of unfinished debris.</li>
 * </ul>
 * <p>
 * Both paths use {@link AirVaultStorageAdapter} (purely backend-agnostic for Local disk and Cloudflare R2/S3).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultStorageCleanupService {

    private final AirVaultLimitsProperties limitsProperties;
    private final AirVaultStorageAdapter storageAdapter;
    private final ClipboardFileRepository clipboardFileRepository;
    private final UploadSessionRepository uploadSessionRepository;
    private final AirVaultStorageCleanupLogRepository cleanupLogRepository;
    private final AirVaultRedisTracker redisTracker;
    private final AirVaultDecompressedFileCache fileCache;

    @Value("${airvault.cleanup.files.dry-run:false}")
    private boolean filesDryRun;

    @Value("${airvault.cleanup.chunks.dry-run:false}")
    private boolean chunksDryRun;

    @Value("${airvault.cleanup.chunks.grace-hours:2}")
    private int chunksGraceHours;

    @Value("${airvault.cleanup.active-grace-minutes:30}")
    private int activeGraceMinutes;

    // =========================================================================
    // PATH A: USER-FACING FILE RETENTION (Two-Phase Mark & Sweep)
    // =========================================================================

    /**
     * Path A - Phase 1 (Mark):
     * Daily scheduled job that scans storage for assembled files and evaluates them against the database.
     * Flags candidates (EXPIRED, SOFT_DELETED, ORPHANED_FILE) as MARKED with a timestamp.
     */
    @Scheduled(cron = "0 0 3 * * *") // Daily at 03:00 AM
    @Transactional
    public void runFileRetentionPhase1Mark() {
        log.info("[AirVault Cleanup Path A] 🔍 Starting Phase 1 File Retention Mark scan (dryRun={})", filesDryRun);
        Instant now = Instant.now();
        Instant activeGraceCutoff = now.minus(Duration.ofMinutes(activeGraceMinutes));
        int retentionDays = limitsProperties.getTrashRetentionDays();
        Instant retentionCutoff = now.minus(Duration.ofDays(retentionDays));

        try {
            List<StorageObjectMetadata> allObjects = storageAdapter.listAll();
            // Filter to files under files/ directory or root files
            List<StorageObjectMetadata> fileObjects = allObjects.stream()
                    .filter(o -> !o.isDirectory() && (o.objectKey().startsWith("files/") || !o.objectKey().contains("/")))
                    .toList();

            List<ClipboardFile> dbFiles = clipboardFileRepository.findAll();
            Map<String, ClipboardFile> activePathMap = new HashMap<>();
            Map<String, ClipboardFile> activeFileIdMap = new HashMap<>();

            for (ClipboardFile f : dbFiles) {
                if (f.getStoragePath() != null) {
                    activePathMap.put(cleanKey(f.getStoragePath()), f);
                }
                if (f.getFileId() != null) {
                    activeFileIdMap.put(f.getFileId(), f);
                }
            }

            int markedCount = 0;
            for (StorageObjectMetadata obj : fileObjects) {
                String key = cleanKey(obj.objectKey());

                // Rule: Protected by recently written active grace window
                if (obj.lastModified() != null && obj.lastModified().isAfter(activeGraceCutoff)) {
                    continue;
                }

                ClipboardFile matchedDbFile = activePathMap.get(key);
                if (matchedDbFile == null) {
                    // Try to match via fileId in filename pattern files/file_<fileId>.ext or files/<fileId>.bin
                    String extractedFileId = extractFileIdFromKey(key);
                    if (extractedFileId != null) {
                        matchedDbFile = activeFileIdMap.get(extractedFileId);
                    }
                }

                String candidateReason = null;
                String matchedFileId = null;

                if (matchedDbFile == null) {
                    candidateReason = "ORPHANED_FILE";
                } else {
                    matchedFileId = matchedDbFile.getFileId();
                    if (matchedDbFile.getDeletedAt() != null) {
                        candidateReason = "SOFT_DELETED";
                    } else if (matchedDbFile.getCreatedAt() != null && matchedDbFile.getCreatedAt().isBefore(retentionCutoff)) {
                        candidateReason = "EXPIRED";
                    }
                }

                if (candidateReason != null) {
                    // Check if already logged as MARKED
                    Optional<AirVaultStorageCleanupLog> existingLog = cleanupLogRepository.findByObjectKeyAndStatus(key, "MARKED");
                    if (existingLog.isEmpty()) {
                        AirVaultStorageCleanupLog logEntry = AirVaultStorageCleanupLog.builder()
                                .cleanupPath("FILE")
                                .objectKey(key)
                                .fileId(matchedFileId)
                                .reason(candidateReason)
                                .byteSize(obj.sizeBytes())
                                .phase1MarkedAt(now)
                                .status("MARKED")
                                .build();
                        cleanupLogRepository.save(logEntry);
                        markedCount++;
                        log.info("[AirVault Cleanup Path A] 🏷️ MARKED file for deletion: key={}, reason={}, size={} B", key, candidateReason, obj.sizeBytes());
                    }
                }
            }

            // Data-Integrity Safeguard Check: Verify active DB records against physical storage
            for (ClipboardFile dbFile : dbFiles) {
                String path = dbFile.getStoragePath();
                if (path == null || path.isBlank()) {
                    log.warn("[AirVault Integrity Check] ⚠️ Data-integrity drift: ClipboardFile fileId='{}' (name='{}', size={} B) has NULL storagePath!",
                            dbFile.getFileId(), dbFile.getFileName(), dbFile.getByteSize());
                } else if (!storageAdapter.exists(path)) {
                    log.warn("[AirVault Integrity Check] ⚠️ Storage file missing: ClipboardFile fileId='{}' points to storagePath='{}' which DOES NOT exist in storage!",
                            dbFile.getFileId(), path);
                } else {
                    long physicalSize = storageAdapter.getObjectSize(path);
                    if (dbFile.getByteSize() != null && dbFile.getByteSize() > 0 && physicalSize >= 0 && dbFile.getByteSize() != physicalSize) {
                        log.warn("[AirVault Integrity Check] ⚠️ Byte size mismatch: ClipboardFile fileId='{}' has DB byteSize={} B but physical size={} B on storagePath='{}'",
                                dbFile.getFileId(), dbFile.getByteSize(), physicalSize, path);
                    }
                }
            }

            log.info("[AirVault Cleanup Path A] Phase 1 Mark complete. Flagged {} new candidates.", markedCount);

        } catch (Exception e) {
            log.error("[AirVault Cleanup Path A] ⛔ Error during Phase 1 File Retention Mark scan: {}", e.getMessage(), e);
        }
    }

    /**
     * Path A - Phase 2 (Sweep):
     * Daily scheduled job running 7 days after marking.
     * Re-verifies if candidate is still candidate; if true, permanently deletes from storage and DB.
     */
    @Scheduled(cron = "0 30 3 * * *") // Daily at 03:30 AM
    @Transactional
    public void runFileRetentionPhase2Sweep() {
        log.info("[AirVault Cleanup Path A] 🧹 Starting Phase 2 File Retention Sweep (dryRun={})", filesDryRun);
        Instant now = Instant.now();
        int graceDays = limitsProperties.getTrashRetentionDays();
        Instant sweepCutoff = now.minus(Duration.ofDays(graceDays));
        Instant retentionCutoff = now.minus(Duration.ofDays(graceDays));

        List<AirVaultStorageCleanupLog> pendingLogs = cleanupLogRepository
                .findAllByCleanupPathAndStatusAndPhase1MarkedAtBefore("FILE", "MARKED", sweepCutoff);

        int deletedCount = 0;
        long totalReclaimed = 0;

        for (AirVaultStorageCleanupLog logEntry : pendingLogs) {
            String key = cleanKey(logEntry.getObjectKey());
            try {
                // Re-verify against live database state
                boolean stillCandidate = true;
                ClipboardFile liveFile = null;

                if (logEntry.getFileId() != null) {
                    liveFile = clipboardFileRepository.findByFileId(logEntry.getFileId()).orElse(null);
                }

                if (liveFile != null) {
                    // If file was un-deleted and created recently, it is no longer candidate
                    boolean isSoftDeleted = liveFile.getDeletedAt() != null;
                    boolean isExpired = liveFile.getCreatedAt() != null && liveFile.getCreatedAt().isBefore(retentionCutoff);

                    if (!isSoftDeleted && !isExpired) {
                        stillCandidate = false;
                    }
                }

                if (!stillCandidate) {
                    logEntry.setStatus("UNMARKED_ACTIVE");
                    logEntry.setPhase2DeletedAt(now);
                    cleanupLogRepository.save(logEntry);
                    log.info("[AirVault Cleanup Path A] ↩️ UNMARKED file (became active again): {}", key);
                    continue;
                }

                if (filesDryRun) {
                    logEntry.setStatus("DRY_RUN");
                    logEntry.setPhase2DeletedAt(now);
                    cleanupLogRepository.save(logEntry);
                    log.info("[AirVault Cleanup Path A] [DRY-RUN] Would delete file: key={}, size={} B", key, logEntry.getByteSize());
                } else {
                    // Physical deletion
                    storageAdapter.deleteObject(key);
                    if (liveFile != null) {
                        if (liveFile.getChecksum() != null) {
                            fileCache.evict(liveFile.getChecksum());
                        }
                        clipboardFileRepository.delete(liveFile);
                    }

                    logEntry.setStatus("DELETED");
                    logEntry.setPhase2DeletedAt(now);
                    cleanupLogRepository.save(logEntry);
                    deletedCount++;
                    totalReclaimed += logEntry.getByteSize();
                    log.info("[AirVault Cleanup Path A] 🗑️ DELETED file: key={}, size={} B", key, logEntry.getByteSize());
                }

            } catch (Exception e) {
                log.error("[AirVault Cleanup Path A] ⛔ Failed to delete file {}: {}", key, e.getMessage());
                logEntry.setStatus("FAILED");
                logEntry.setErrorMessage(e.getMessage());
                cleanupLogRepository.save(logEntry);
            }
        }

        log.info("[AirVault Cleanup Path A] Phase 2 Sweep complete. Processed {} entries, reclaimed {} bytes.", deletedCount, totalReclaimed);
    }

    // =========================================================================
    // PATH B: DEAD / INCOMPLETE UPLOAD CHUNK CLEANUP (Hourly Purge)
    // =========================================================================

    /**
     * Path B (Dead Upload Chunks):
     * Hourly scheduled job with short grace period (default 2h).
     * Purges orphaned or abandoned chunks_<uploadSessionId>/ debris immediately from storage, DB, and Redis.
     */
    @Scheduled(fixedRateString = "${airvault.cleanup.chunks.interval-ms:3600000}") // Default 1 hour
    @Transactional
    public void runDeadChunkCleanup() {
        log.info("[AirVault Cleanup Path B] ⚡ Starting Dead Chunk Cleanup scan (graceHours={}, dryRun={})", chunksGraceHours, chunksDryRun);
        Instant now = Instant.now();
        Instant chunkGraceCutoff = now.minus(Duration.ofHours(chunksGraceHours));

        try {
            List<StorageObjectMetadata> allObjects = storageAdapter.listAll();
            // Group storage objects under chunks_*
            Set<String> chunkDirKeys = new HashSet<>();
            Map<String, Long> chunkDirSizes = new HashMap<>();

            for (StorageObjectMetadata obj : allObjects) {
                String key = cleanKey(obj.objectKey());
                if (key.startsWith("chunks_")) {
                    int slashIdx = key.indexOf('/');
                    String dirPrefix = slashIdx > 0 ? key.substring(0, slashIdx) : key;
                    chunkDirKeys.add(dirPrefix);
                    chunkDirSizes.put(dirPrefix, chunkDirSizes.getOrDefault(dirPrefix, 0L) + obj.sizeBytes());
                }
            }

            List<UploadSession> allSessions = uploadSessionRepository.findAll();
            Map<String, UploadSession> sessionMap = allSessions.stream()
                    .collect(Collectors.toMap(s -> s.getId().toString(), s -> s, (a, b) -> a));

            int deletedDirs = 0;
            long totalReclaimed = 0;

            for (String dirKey : chunkDirKeys) {
                String sessionIdStr = dirKey.replace("chunks_", "");
                UploadSession session = sessionMap.get(sessionIdStr);

                String deadReason = null;
                UUID sessionId = null;
                try {
                    sessionId = UUID.fromString(sessionIdStr);
                } catch (Exception ignored) {}

                if (session == null) {
                    deadReason = "ORPHANED_CHUNK_DIR";
                } else if ("FAILED".equalsIgnoreCase(session.getStatus()) || "CANCELLED".equalsIgnoreCase(session.getStatus())) {
                    deadReason = "DEAD_CHUNK_SESSION";
                } else if (!"COMPLETED".equalsIgnoreCase(session.getStatus())) {
                    // Check if updated / created before chunk grace window
                    Instant sessionTime = session.getUpdatedAt() != null ? session.getUpdatedAt() : session.getCreatedAt();
                    if (sessionTime != null && sessionTime.isBefore(chunkGraceCutoff)) {
                        deadReason = "STALE_INCOMPLETE_CHUNK";
                    }
                }

                if (deadReason != null) {
                    long sizeBytes = chunkDirSizes.getOrDefault(dirKey, 0L);
                    if (chunksDryRun) {
                        AirVaultStorageCleanupLog logEntry = AirVaultStorageCleanupLog.builder()
                                .cleanupPath("CHUNK")
                                .objectKey(dirKey)
                                .sessionId(sessionId)
                                .fileId(session != null ? session.getFileId() : null)
                                .reason(deadReason)
                                .byteSize(sizeBytes)
                                .phase1MarkedAt(now)
                                .phase2DeletedAt(now)
                                .status("DRY_RUN")
                                .build();
                        cleanupLogRepository.save(logEntry);
                        log.info("[AirVault Cleanup Path B] [DRY-RUN] Would delete dead chunk directory: dir={}, reason={}, size={} B", dirKey, deadReason, sizeBytes);
                    } else {
                        // Immediate delete from storage
                        storageAdapter.deleteObject(dirKey);

                        // Clear Redis tracking
                        if (sessionId != null) {
                            redisTracker.clearSession(sessionId);
                        }

                        // Remove session row from DB
                        if (session != null) {
                            uploadSessionRepository.delete(session);
                        }

                        AirVaultStorageCleanupLog logEntry = AirVaultStorageCleanupLog.builder()
                                .cleanupPath("CHUNK")
                                .objectKey(dirKey)
                                .sessionId(sessionId)
                                .fileId(session != null ? session.getFileId() : null)
                                .reason(deadReason)
                                .byteSize(sizeBytes)
                                .phase1MarkedAt(now)
                                .phase2DeletedAt(now)
                                .status("DELETED")
                                .build();
                        cleanupLogRepository.save(logEntry);
                        deletedDirs++;
                        totalReclaimed += sizeBytes;
                        log.info("[AirVault Cleanup Path B] 🗑️ Purged dead chunk directory: dir={}, reason={}, size={} B", dirKey, deadReason, sizeBytes);
                    }
                }
            }

            log.info("[AirVault Cleanup Path B] Dead Chunk scan complete. Purged {} directories, reclaimed {} bytes.", deletedDirs, totalReclaimed);

        } catch (Exception e) {
            log.error("[AirVault Cleanup Path B] ⛔ Error during Dead Chunk Cleanup scan: {}", e.getMessage(), e);
        }
    }

    // =========================================================================
    // AUDIT & METRICS REPORTERS
    // =========================================================================

    @Transactional(readOnly = true)
    public Map<String, Object> getCleanupMetrics() {
        Long totalReclaimed = cleanupLogRepository.sumTotalBytesReclaimed();
        Long fileReclaimed = cleanupLogRepository.sumBytesReclaimedByPath("FILE");
        Long chunkReclaimed = cleanupLogRepository.sumBytesReclaimedByPath("CHUNK");

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalBytesReclaimed", totalReclaimed != null ? totalReclaimed : 0L);
        metrics.put("fileBytesReclaimed", fileReclaimed != null ? fileReclaimed : 0L);
        metrics.put("chunkBytesReclaimed", chunkReclaimed != null ? chunkReclaimed : 0L);
        metrics.put("filesDryRun", filesDryRun);
        metrics.put("chunksDryRun", chunksDryRun);
        metrics.put("filesGraceDays", limitsProperties.getTrashRetentionDays());
        metrics.put("chunksGraceHours", chunksGraceHours);
        return metrics;
    }

    private String cleanKey(String key) {
        if (key == null) return "";
        return key.replaceFirst("^[/\\\\]+", "").replace('\\', '/');
    }

    private String extractFileIdFromKey(String key) {
        // Example: files/file_abc123.mp4 -> abc123, or files/abc123.bin -> abc123
        int lastSlash = key.lastIndexOf('/');
        String filename = lastSlash >= 0 ? key.substring(lastSlash + 1) : key;
        if (filename.startsWith("file_")) {
            filename = filename.substring(5);
        }
        int dotIdx = filename.indexOf('.');
        return dotIdx > 0 ? filename.substring(0, dotIdx) : filename;
    }
}
