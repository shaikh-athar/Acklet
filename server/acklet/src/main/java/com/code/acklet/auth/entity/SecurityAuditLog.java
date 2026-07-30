package com.code.acklet.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "security_audit_logs", indexes = {
    @Index(name = "idx_audit_log_event_type", columnList = "event_type"),
    @Index(name = "idx_audit_log_user_id", columnList = "user_id"),
    @Index(name = "idx_audit_log_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "email")
    private String email;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "device")
    private String device;

    @Column(name = "browser", length = 100)
    private String browser;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
