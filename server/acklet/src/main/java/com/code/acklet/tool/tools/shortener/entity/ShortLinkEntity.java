package com.code.acklet.tool.tools.shortener.entity;

import com.code.acklet.tool.tools.shortener.security.ShortenerEncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "short_links")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"targetUrl", "fallbackUrl", "passwordHash", "passwordSalt", "ownerTokenHash"})
public class ShortLinkEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(length = 32, nullable = false, unique = true)
    private String code;

    @Convert(converter = ShortenerEncryptedStringConverter.class)
    @Column(name = "target_url", nullable = false, columnDefinition = "TEXT")
    private String targetUrl;

    @Convert(converter = ShortenerEncryptedStringConverter.class)
    @Column(name = "fallback_url", columnDefinition = "TEXT")
    private String fallbackUrl;

    @Column(name = "target_host", length = 255)
    private String targetHost;

    @Column(name = "owner_token_hash", length = 64, nullable = false)
    private String ownerTokenHash;

    @Column(name = "user_id")
    private UUID userId;

    @Convert(converter = ShortenerEncryptedStringConverter.class)
    @Column(name = "label", columnDefinition = "TEXT")
    private String label;

    @Convert(converter = ShortenerEncryptedStringConverter.class)
    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "clicks", nullable = false)
    @Builder.Default
    private Long clicks = 0L;

    @Column(name = "max_clicks")
    private Long maxClicks;

    @Column(name = "is_one_time", nullable = false)
    @Builder.Default
    private Boolean isOneTime = false;

    @Column(name = "is_deactivated", nullable = false)
    @Builder.Default
    private Boolean isDeactivated = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "has_password", nullable = false)
    @Builder.Default
    private Boolean hasPassword = false;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "password_scheme", length = 32)
    private String passwordScheme;

    @Column(name = "password_salt", length = 64)
    private String passwordSalt;

    @Column(name = "last_opened_at")
    private Instant lastOpenedAt;

    @Column(name = "report_count", nullable = false)
    @Builder.Default
    private Integer reportCount = 0;

    @Column(name = "flagged", nullable = false)
    @Builder.Default
    private Boolean flagged = false;

    @Convert(converter = ShortenerEncryptedStringConverter.class)
    @Column(name = "utm_params", columnDefinition = "TEXT")
    private String utmParams;

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
        if (this.clicks == null) {
            this.clicks = 0L;
        }
        if (this.isOneTime == null) {
            this.isOneTime = false;
        }
        if (this.isDeactivated == null) {
            this.isDeactivated = false;
        }
        if (this.hasPassword == null) {
            this.hasPassword = false;
        }
        if (this.reportCount == null) {
            this.reportCount = 0;
        }
        if (this.flagged == null) {
            this.flagged = false;
        }
        computeTargetHost();
    }

    @PreUpdate
    public void preUpdate() {
        computeTargetHost();
    }

    private void computeTargetHost() {
        if (this.targetUrl != null && !this.targetUrl.isBlank()) {
            try {
                java.net.URI uri = java.net.URI.create(this.targetUrl.trim());
                String host = uri.getHost();
                if (host != null && !host.isBlank()) {
                    this.targetHost = host.toLowerCase(java.util.Locale.ROOT);
                }
            } catch (Exception ignored) {}
        }
    }
}
