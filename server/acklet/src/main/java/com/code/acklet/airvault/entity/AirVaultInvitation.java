package com.code.acklet.airvault.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "airvault_invitations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirVaultInvitation {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id; // e.g. inv_xxxxxxxxxxxxxxxxxxxxxxxx

    @Column(name = "clipboard_id", length = 64, nullable = false)
    private String clipboardId;

    @Column(name = "inviter_user_id", length = 128, nullable = false)
    private String inviterUserId;

    @Column(name = "invite_type", length = 32, nullable = false)
    private String inviteType; // "USERNAME" | "LINK"

    @Column(name = "target_username", length = 128)
    private String targetUsername;

    @Column(name = "status", length = 32, nullable = false)
    @Builder.Default
    private String status = "PENDING"; // "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED" | "EXPIRED"

    @Column(name = "access_level", length = 32, nullable = false)
    @Builder.Default
    private String accessLevel = "read-only"; // "read-only" | "read-write"

    @Column(name = "max_uses")
    private Integer maxUses; // null for unlimited, 1 for single-use

    @Column(name = "used_count", nullable = false)
    @Builder.Default
    private int usedCount = 0;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isExhausted() {
        return maxUses != null && usedCount >= maxUses;
    }

    public boolean isValidForAcceptance() {
        return "PENDING".equalsIgnoreCase(status) && !isExpired() && !isExhausted();
    }
}
