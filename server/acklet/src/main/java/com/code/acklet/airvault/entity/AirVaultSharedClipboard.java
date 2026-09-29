package com.code.acklet.airvault.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;

@Entity
@Table(name = "airvault_shared_clipboards")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirVaultSharedClipboard {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id; // e.g. cb_9f83a2e1d7c4b6e5f0a1b2c3

    @Column(name = "owner_username", length = 64)
    private String ownerUsername;

    @Column(name = "owner_identity_id")
    private java.util.UUID ownerIdentityId;

    @Column(name = "owner_device_id", length = 64)
    private String ownerDeviceId;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "access_mode", length = 32, nullable = false)
    @Builder.Default
    private String accessMode = "read-only"; // "read-only" | "read-write"

    @Column(name = "is_personal", nullable = false)
    @Builder.Default
    private Boolean isPersonal = false;

    @Column(name = "items_json", columnDefinition = "TEXT")
    private String itemsJson;

    @Column(name = "next_seq", nullable = false)
    @Builder.Default
    private Long nextSeq = 1L;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
