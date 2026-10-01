package com.code.acklet.airvault.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "airvault_clipboard_items",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_clipboard_seq", columnNames = {"clipboard_id", "seq"}),
        @UniqueConstraint(name = "uk_clipboard_op_id", columnNames = {"clipboard_id", "op_id"})
    },
    indexes = {
        @Index(name = "idx_clipboard_seq", columnList = "clipboard_id, seq")
    }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirVaultClipboardItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "clipboard_id", length = 64, nullable = false)
    private String clipboardId;

    @Column(name = "seq", nullable = false)
    private Long seq;

    @Column(name = "op_id", length = 64, nullable = false)
    private String opId;

    @Column(name = "author_id", length = 128)
    private String authorId;

    @Column(name = "author_type", length = 32, nullable = false)
    private String authorType; // "owner", "collaborator", "guest"

    @Column(name = "author_name", length = 64)
    private String authorName;

    @Column(name = "author_color", length = 32)
    private String authorColor;

    @Column(name = "last_change_seq", nullable = false)
    private Long lastChangeSeq;

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    @Column(name = "retention_seconds")
    private Long retentionSeconds;

    @Column(name = "burn_after_read")
    private Boolean burnAfterRead;

    @Column(name = "burned_at")
    private Instant burnedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
