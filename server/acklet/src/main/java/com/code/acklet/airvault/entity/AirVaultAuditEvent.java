package com.code.acklet.airvault.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "airvault_audit_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirVaultAuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "timestamp_utc", nullable = false)
    private Instant timestampUtc;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(name = "actor_identity_id")
    private UUID actorIdentityId;

    @Column(name = "actor_username", length = 64)
    private String actorUsername;

    @Column(name = "device_id", length = 64)
    private String deviceId;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "target_resource_id", length = 128)
    private String targetResourceId;

    @Column(name = "result", nullable = false, length = 16)
    private String result; // "SUCCESS" or "FAILURE"

    @Column(name = "before_value", columnDefinition = "TEXT")
    private String beforeValue;

    @Column(name = "after_value", columnDefinition = "TEXT")
    private String afterValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (timestampUtc == null) {
            timestampUtc = Instant.now();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (result == null) {
            result = "SUCCESS";
        }
    }
}
