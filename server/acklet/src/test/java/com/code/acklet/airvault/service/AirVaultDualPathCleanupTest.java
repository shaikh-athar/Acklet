package com.code.acklet.airvault.service;

import com.code.acklet.airvault.entity.AirVaultStorageCleanupLog;
import com.code.acklet.airvault.entity.ClipboardFile;
import com.code.acklet.airvault.entity.UploadSession;
import com.code.acklet.airvault.repository.AirVaultStorageCleanupLogRepository;
import com.code.acklet.airvault.repository.ClipboardFileRepository;
import com.code.acklet.airvault.repository.UploadSessionRepository;
import com.code.acklet.airvault.storage.AirVaultStorageAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AirVaultDualPathCleanupTest {

    @Mock
    private AirVaultStorageAdapter storageAdapter;

    @Mock
    private ClipboardFileRepository clipboardFileRepository;

    @Mock
    private UploadSessionRepository uploadSessionRepository;

    @Mock
    private AirVaultStorageCleanupLogRepository cleanupLogRepository;

    @Mock
    private AirVaultRedisTracker redisTracker;

    @Mock
    private AirVaultDecompressedFileCache fileCache;

    private AirVaultStorageCleanupService cleanupService;

    @BeforeEach
    void setUp() {
        cleanupService = new AirVaultStorageCleanupService(
                storageAdapter,
                clipboardFileRepository,
                uploadSessionRepository,
                cleanupLogRepository,
                redisTracker,
                fileCache
        );

        ReflectionTestUtils.setField(cleanupService, "filesDryRun", false);
        ReflectionTestUtils.setField(cleanupService, "filesGraceDays", 7);
        ReflectionTestUtils.setField(cleanupService, "filesRetentionDays", 7);
        ReflectionTestUtils.setField(cleanupService, "chunksDryRun", false);
        ReflectionTestUtils.setField(cleanupService, "chunksGraceHours", 2);
        ReflectionTestUtils.setField(cleanupService, "activeGraceMinutes", 30);
    }

    @Test
    @DisplayName("Path A Phase 1: Should mark expired and orphaned files, leaving active and grace-window files alone")
    void testPathAPhase1Marking() throws Exception {
        Instant now = Instant.now();

        // 1. Active file (created 2 days ago)
        ClipboardFile activeFile = ClipboardFile.builder()
                .fileId("active-1")
                .fileName("active.mp4")
                .storagePath("files/file_active-1.mp4")
                .build();
        activeFile.setCreatedAt(now.minus(Duration.ofDays(2)));

        // 2. Expired file (created 9 days ago)
        ClipboardFile expiredFile = ClipboardFile.builder()
                .fileId("expired-1")
                .fileName("expired.mp4")
                .storagePath("files/file_expired-1.mp4")
                .build();
        expiredFile.setCreatedAt(now.minus(Duration.ofDays(9)));

        // Storage objects:
        // - files/file_active-1.mp4 (modified 2 days ago)
        // - files/file_expired-1.mp4 (modified 9 days ago)
        // - files/file_orphaned.mp4 (modified 3 hours ago, no DB row)
        // - files/file_recent.mp4 (modified 5 minutes ago, active grace window)
        List<AirVaultStorageAdapter.StorageObjectMetadata> storageList = List.of(
                new AirVaultStorageAdapter.StorageObjectMetadata("files/file_active-1.mp4", 1000L, now.minus(Duration.ofDays(2)), false),
                new AirVaultStorageAdapter.StorageObjectMetadata("files/file_expired-1.mp4", 2000L, now.minus(Duration.ofDays(9)), false),
                new AirVaultStorageAdapter.StorageObjectMetadata("files/file_orphaned.mp4", 3000L, now.minus(Duration.ofHours(3)), false),
                new AirVaultStorageAdapter.StorageObjectMetadata("files/file_recent.mp4", 4000L, now.minus(Duration.ofMinutes(5)), false)
        );

        when(storageAdapter.listAll()).thenReturn(storageList);
        when(clipboardFileRepository.findAll()).thenReturn(List.of(activeFile, expiredFile));
        when(cleanupLogRepository.findByObjectKeyAndStatus(anyString(), eq("MARKED"))).thenReturn(Optional.empty());

        cleanupService.runFileRetentionPhase1Mark();

        ArgumentCaptor<AirVaultStorageCleanupLog> logCaptor = ArgumentCaptor.forClass(AirVaultStorageCleanupLog.class);
        verify(cleanupLogRepository, times(2)).save(logCaptor.capture());

        List<AirVaultStorageCleanupLog> captured = logCaptor.getAllValues();
        assertThat(captured).extracting(AirVaultStorageCleanupLog::getObjectKey)
                .containsExactlyInAnyOrder("files/file_expired-1.mp4", "files/file_orphaned.mp4");

        assertThat(captured).extracting(AirVaultStorageCleanupLog::getReason)
                .containsExactlyInAnyOrder("EXPIRED", "ORPHANED_FILE");
    }

    @Test
    @DisplayName("Path A Phase 2: Should sweep candidates marked >7 days ago and hard-delete from storage and DB")
    void testPathAPhase2Sweep() throws Exception {
        Instant now = Instant.now();

        AirVaultStorageCleanupLog expiredLog = AirVaultStorageCleanupLog.builder()
                .cleanupPath("FILE")
                .objectKey("files/file_expired-1.mp4")
                .fileId("expired-1")
                .reason("EXPIRED")
                .byteSize(2000L)
                .phase1MarkedAt(now.minus(Duration.ofDays(8)))
                .status("MARKED")
                .build();

        ClipboardFile expiredDbFile = ClipboardFile.builder()
                .fileId("expired-1")
                .fileName("expired.mp4")
                .storagePath("files/file_expired-1.mp4")
                .build();
        expiredDbFile.setCreatedAt(now.minus(Duration.ofDays(16)));

        when(cleanupLogRepository.findAllByCleanupPathAndStatusAndPhase1MarkedAtBefore(eq("FILE"), eq("MARKED"), any()))
                .thenReturn(List.of(expiredLog));
        when(clipboardFileRepository.findByFileId("expired-1")).thenReturn(Optional.of(expiredDbFile));

        cleanupService.runFileRetentionPhase2Sweep();

        verify(storageAdapter).deleteObject("files/file_expired-1.mp4");
        verify(clipboardFileRepository).delete(expiredDbFile);
        assertThat(expiredLog.getStatus()).isEqualTo("DELETED");
    }

    @Test
    @DisplayName("Path B: Should immediately purge dead / abandoned upload chunks and clean Redis + DB session")
    void testPathBDeadChunkPurge() throws Exception {
        Instant now = Instant.now();
        UUID deadSessionId = UUID.randomUUID();
        UUID activeSessionId = UUID.randomUUID();

        UploadSession deadSession = UploadSession.builder()
                .id(deadSessionId)
                .status("FAILED")
                .build();
        deadSession.setCreatedAt(now.minus(Duration.ofHours(4)));

        UploadSession activeSession = UploadSession.builder()
                .id(activeSessionId)
                .status("UPLOADING")
                .build();
        activeSession.setCreatedAt(now.minus(Duration.ofMinutes(10)));

        List<AirVaultStorageAdapter.StorageObjectMetadata> storageList = List.of(
                new AirVaultStorageAdapter.StorageObjectMetadata("chunks_" + deadSessionId + "/chunk_0", 500L, now.minus(Duration.ofHours(4)), false),
                new AirVaultStorageAdapter.StorageObjectMetadata("chunks_" + activeSessionId + "/chunk_0", 500L, now.minus(Duration.ofMinutes(10)), false)
        );

        when(storageAdapter.listAll()).thenReturn(storageList);
        when(uploadSessionRepository.findAll()).thenReturn(List.of(deadSession, activeSession));

        cleanupService.runDeadChunkCleanup();

        // Should immediately delete dead chunks and clear session
        verify(storageAdapter).deleteObject("chunks_" + deadSessionId);
        verify(redisTracker).clearSession(deadSessionId);
        verify(uploadSessionRepository).delete(deadSession);

        // Active session chunks must NOT be deleted
        verify(storageAdapter, never()).deleteObject("chunks_" + activeSessionId);
        verify(redisTracker, never()).clearSession(activeSessionId);
        verify(uploadSessionRepository, never()).delete(activeSession);
    }
}
