package com.code.acklet.airvault.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "airvault_storage_cleanup_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AirVaultStorageCleanupLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "cleanup_path", nullable = false, length = 20)
    private String cleanupPath; // 'FILE' (Path A) or 'CHUNK' (Path B)

    @Column(name = "object_key", nullable = false, length = 500)
    private String objectKey;

    @Column(name = "file_id", length = 100)
    private String fileId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "reason", nullable = false, length = 50)
    private String reason; // EXPIRED, SOFT_DELETED, ORPHANED_FILE, DEAD_CHUNK_SESSION, STALE_INCOMPLETE_CHUNK, ORPHANED_CHUNK_DIR

    @Column(name = "byte_size", nullable = false)
    @Builder.Default
    private Long byteSize = 0L;

    @Column(name = "phase1_marked_at")
    private Instant phase1MarkedAt;

    @Column(name = "phase2_deleted_at")
    private Instant phase2DeletedAt;

    @Column(name = "status", nullable = false, length = 30)
    private String status; // MARKED, DELETED, UNMARKED_ACTIVE, DRY_RUN, FAILED

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
