package com.code.acklet.airvault.entity;

import com.code.acklet.shared.entity.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@Entity
@Table(name = "airvault_upload_sessions")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UploadSession extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "clipboard_id", nullable = false, length = 100)
    private String clipboardId;

    @Column(name = "file_id", nullable = false, length = 100)
    private String fileId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "declared_size", nullable = false)
    private Long declaredSize;

    @Column(name = "received_bytes", nullable = false)
    @Builder.Default
    private Long receivedBytes = 0L;

    /** PENDING, UPLOADING, COMPLETE, FAILED, CANCELLED */
    @Column(name = "status", nullable = false, length = 40)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "chunk_size", nullable = false)
    private Integer chunkSize;

    @Column(name = "total_chunks", nullable = false)
    private Integer totalChunks;

    @Column(name = "chunks_received_count", nullable = false)
    @Builder.Default
    private Integer chunksReceivedCount = 0;

    /** Bitmask or comma-separated indices of received chunks for fast idempotency check */
    @Column(name = "received_chunk_indices", columnDefinition = "TEXT")
    @Builder.Default
    private String receivedChunkIndices = "";

    @Column(name = "checksum", length = 120)
    private String checksum;

    @Column(name = "preview_url", columnDefinition = "TEXT")
    private String previewUrl;

    @Column(name = "storage_path", length = 500)
    private String storagePath;

    @Column(name = "batch_id", length = 100)
    private String batchId;
}
