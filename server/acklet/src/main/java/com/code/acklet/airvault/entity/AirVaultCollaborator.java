package com.code.acklet.airvault.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "airvault_clipboard_collaborators")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirVaultCollaborator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clipboard_id", length = 64, nullable = false)
    private String clipboardId;

    @Column(name = "user_id", length = 128, nullable = false)
    private String userId; // The username or user identifier who accepted the invite

    @Column(name = "access_level", length = 32, nullable = false)
    @Builder.Default
    private String accessLevel = "read-only"; // "read-only" | "read-write"

    @Column(name = "joined_at", nullable = false)
    @Builder.Default
    private Instant joinedAt = Instant.now();

    @Column(name = "invited_via", length = 32, nullable = false)
    @Builder.Default
    private String invitedVia = "USERNAME"; // "USERNAME" | "LINK"

    @Column(name = "invitation_id", length = 64)
    private String invitationId;
}
