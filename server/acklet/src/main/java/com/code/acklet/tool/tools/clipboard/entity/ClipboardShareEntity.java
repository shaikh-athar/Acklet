package com.code.acklet.tool.tools.clipboard.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "clipboard_shares")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClipboardShareEntity {

    @Id
    @Column(length = 32)
    private String code;

    @Column(name = "word_code", length = 64)
    private String wordCode;

    @Column(name = "owner_token", length = 64)
    private String ownerToken;

    @Column(name = "pin_hash")
    private String pinHash;

    @Column(name = "has_pin", nullable = false)
    @Builder.Default
    private Boolean hasPin = false;

    @Column(name = "burn_after_reading", nullable = false)
    @Builder.Default
    private Boolean burnAfterReading = false;

    @Column(name = "live_mode", nullable = false)
    @Builder.Default
    private Boolean liveMode = true;

    @Column(name = "expires_at", nullable = false)
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

    @OneToMany(mappedBy = "share", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<ClipboardItemEntity> items = new ArrayList<>();
}
