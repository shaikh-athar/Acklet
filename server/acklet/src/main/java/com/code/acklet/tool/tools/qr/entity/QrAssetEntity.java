package com.code.acklet.tool.tools.qr.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "qr_assets")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrAssetEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "qr_code", nullable = false)
    private QrCodeEntity qrCode;

    @Column(name = "file_name", length = 255, nullable = false)
    private String fileName;

    @Column(name = "detected_mime", length = 128)
    private String detectedMime;

    @Column(name = "size_bytes", nullable = false)
    @Builder.Default
    private Long sizeBytes = 0L;

    @Column(name = "storage_path", length = 512, nullable = false)
    private String storagePath;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
