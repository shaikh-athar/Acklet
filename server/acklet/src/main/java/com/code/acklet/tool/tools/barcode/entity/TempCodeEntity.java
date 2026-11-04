package com.code.acklet.tool.tools.barcode.entity;

import com.code.acklet.tool.tools.shortener.security.ShortenerEncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "temp_codes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"token", "content"})
public class TempCodeEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "owner_token_hash", nullable = false, length = 64)
    private String ownerTokenHash;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /**
     * Plain token encrypted with AES-256-GCM at rest.
     * Converted transparently by ShortenerEncryptedStringConverter.
     */
    @Convert(converter = ShortenerEncryptedStringConverter.class)
    @Column(name = "encrypted_token", nullable = false, columnDefinition = "TEXT")
    private String token;

    @Column(name = "payload_mode", nullable = false, length = 32)
    private String payloadMode; // "LINK" or "CODE"

    @Column(name = "content_type", nullable = false, length = 32)
    private String contentType; // "MESSAGE", "LINK", "REFERENCE_ONLY"

    /**
     * Payload content (message text or URL) encrypted with AES-256-GCM at rest.
     */
    @Convert(converter = ShortenerEncryptedStringConverter.class)
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "reference", length = 64)
    private String reference;

    @Column(name = "barcode_format", nullable = false, length = 32)
    private String barcodeFormat; // "qrcode", "datamatrix", "aztec", "pdf417", "code128"

    @Column(name = "show_expiry_on_label", nullable = false)
    @Builder.Default
    private Boolean showExpiryOnLabel = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    private String status = "ACTIVE"; // "ACTIVE", "DEACTIVATED", "EXPIRED"

    @Column(name = "check_count", nullable = false)
    @Builder.Default
    private Long checkCount = 0L;

    @Column(name = "last_checked_at")
    private Instant lastCheckedAt;

    @Column(name = "purge_at", nullable = false)
    private Instant purgeAt;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "idempotency_key", length = 128)
    private String idempotencyKey;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
