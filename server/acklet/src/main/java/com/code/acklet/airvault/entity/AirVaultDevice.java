package com.code.acklet.airvault.entity;

import com.code.acklet.shared.entity.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

/**
 * Represents a registered device within a user's AirVault device constellation.
 */
@Entity
@Table(name = "airvault_devices")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AirVaultDevice extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    /** Client-generated stable device UUID (persisted in localStorage). */
    @Column(name = "client_device_id", nullable = false, length = 100)
    private String clientDeviceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "identity_id")
    private AirVaultIdentity identity;

    @Column(name = "device_name", nullable = false, length = 120)
    private String deviceName;

    @Column(name = "username", length = 60)
    private String username;

    @Column(name = "pin_hash", length = 120)
    private String pinHash;

    @Column(name = "is_customized", nullable = false)
    @Builder.Default
    private Boolean isCustomized = false;

    /** One of: laptop, smartphone, tablet, desktop */
    @Column(name = "device_type", nullable = false, length = 50)
    private String deviceType;

    @Column(name = "os", length = 80)
    private String os;

    @Column(name = "browser", length = 80)
    private String browser;

    /** ECDH P-256 public key fingerprint, e.g. AV-MBP1-98F2 */
    @Column(name = "thumbprint", length = 100)
    private String thumbprint;

    /** Local subnet IP hint, e.g. 192.168.1.45 */
    @Column(name = "ip_hint", length = 80)
    private String ipHint;

    /** One of: active, idle, offline, revoked */
    @Column(name = "status", nullable = false, length = 40)
    @Builder.Default
    private String status = "active";

    @Column(name = "sync_enabled", nullable = false)
    @Builder.Default
    private Boolean syncEnabled = true;

    @Column(name = "accent_color", length = 30)
    @Builder.Default
    private String accentColor = "#2196F3";

    @Column(name = "last_active_at")
    private Instant lastActiveAt;
}
