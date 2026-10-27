package com.code.acklet.tool.tools.qr.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "qr_scans")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrScanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "qr_code", nullable = false)
    private QrCodeEntity qrCode;

    @Column(name = "scanned_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant scannedAt = Instant.now();

    @Column(name = "country_code", length = 8)
    private String countryCode;

    @Column(name = "city", length = 64)
    private String city;

    @Column(name = "device_type", length = 32)
    private String deviceType;

    @Column(name = "os", length = 32)
    private String os;

    @Column(name = "browser", length = 32)
    private String browser;

    @Column(name = "referrer", length = 512)
    private String referrer;

    @Column(name = "visitor_hash", length = 64)
    private String visitorHash;
}
