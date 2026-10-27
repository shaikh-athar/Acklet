package com.code.acklet.tool.tools.qr.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "qr_codes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrCodeEntity {

    @Id
    @Column(length = 32)
    private String code;

    @Column(name = "type", length = 32, nullable = false)
    @Builder.Default
    private String type = "DYNAMIC_URL";

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "target_url", columnDefinition = "TEXT")
    private String targetUrl;

    @Column(name = "content_json", columnDefinition = "TEXT")
    private String contentJson;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "has_password", nullable = false)
    @Builder.Default
    private Boolean hasPassword = false;

    @Column(name = "status", length = 24, nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "manage_key_hash", length = 64, nullable = false)
    private String manageKeyHash;

    @Column(name = "scan_count", nullable = false)
    @Builder.Default
    private Long scanCount = 0L;

    @Column(name = "unique_scan_count", nullable = false)
    @Builder.Default
    private Long uniqueScanCount = 0L;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 1L;

    @OneToMany(mappedBy = "qrCode", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<QrAssetEntity> assets = new ArrayList<>();
}
