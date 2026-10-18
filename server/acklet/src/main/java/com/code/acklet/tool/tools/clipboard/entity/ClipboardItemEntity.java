package com.code.acklet.tool.tools.clipboard.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "clipboard_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClipboardItemEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "share_code", nullable = false)
    private ClipboardShareEntity share;

    @Column(name = "item_type", length = 16, nullable = false)
    private String itemType; // TEXT, LINK, IMAGE, FILE

    @Column(name = "text_content", columnDefinition = "TEXT")
    private String textContent;

    @Column(name = "original_name")
    private String originalName;

    @Column(name = "size_bytes", nullable = false)
    @Builder.Default
    private Long sizeBytes = 0L;

    @Column(name = "detected_mime", length = 128)
    private String detectedMime;

    @Column(name = "storage_path", length = 512)
    private String storagePath;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "is_compressed", nullable = false)
    @Builder.Default
    private Boolean isCompressed = false;

    @Column(name = "is_encrypted", nullable = false)
    @Builder.Default
    private Boolean isEncrypted = false;

    @Column(name = "download_count", nullable = false)
    @Builder.Default
    private Integer downloadCount = 0;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
