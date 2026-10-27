package com.code.acklet.tool.tools.qr.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "qr_links")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrLinkEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(length = 32, nullable = false, unique = true)
    private String code;

    @Column(name = "type", length = 32, nullable = false)
    @Builder.Default
    private String type = "URL";

    @Column(name = "payload", columnDefinition = "TEXT", nullable = false)
    private String payload;

    @Column(name = "mime", length = 128)
    private String mime;

    @Column(name = "content_bytes", nullable = false)
    @Builder.Default
    private Long contentBytes = 0L;

    @Column(name = "manage_token_hash", length = 64, nullable = false)
    private String manageTokenHash;

    @Column(name = "status", length = 24, nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "scan_count", nullable = false)
    @Builder.Default
    private Long scanCount = 0L;

    @Column(name = "last_scan_at")
    private Instant lastScanAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "is_downloaded", nullable = false)
    @Builder.Default
    private Boolean isDownloaded = false;
}
