package com.code.acklet.tool.tools.clipboard.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "clipboard_text_revisions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClipboardTextRevisionEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "share_code", nullable = false)
    private ClipboardShareEntity share;

    @Column(nullable = false)
    private Long version;

    @Column(name = "text_content", nullable = false, columnDefinition = "TEXT")
    private String textContent;

    @Column(name = "is_encrypted", nullable = false)
    @Builder.Default
    private Boolean isEncrypted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
