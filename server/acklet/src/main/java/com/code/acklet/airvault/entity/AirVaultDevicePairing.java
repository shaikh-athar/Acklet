package com.code.acklet.airvault.entity;

import com.code.acklet.shared.entity.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

/**
 * Represents an explicit, authorized device-to-device pairing relationship with its own connection state.
 */
@Entity
@Table(name = "airvault_device_pairings")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AirVaultDevicePairing extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_device_id", nullable = false)
    private AirVaultDevice sourceDevice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_device_id", nullable = false)
    private AirVaultDevice targetDevice;

    @Column(name = "source_client_device_id", nullable = false, length = 100)
    private String sourceClientDeviceId;

    @Column(name = "target_client_device_id", nullable = false, length = 100)
    private String targetClientDeviceId;

    /** One of: CONNECTED, PAUSED_DISCONNECTED, REVOKED */
    @Column(name = "pairing_state", nullable = false, length = 40)
    @Builder.Default
    private String pairingState = "CONNECTED";

    @Column(name = "sync_enabled", nullable = false)
    @Builder.Default
    private Boolean syncEnabled = true;

    @Column(name = "established_at", nullable = false)
    @Builder.Default
    private Instant establishedAt = Instant.now();
}
