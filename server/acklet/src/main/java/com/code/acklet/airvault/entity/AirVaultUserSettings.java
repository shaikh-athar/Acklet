package com.code.acklet.airvault.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "airvault_user_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirVaultUserSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "identity_id", nullable = false, unique = true)
    private UUID identityId;

    @Column(name = "username", length = 64, nullable = false)
    private String username;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 1L;

    @Column(name = "settings_json", columnDefinition = "TEXT", nullable = false)
    @Builder.Default
    private String settingsJson = "{}";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
