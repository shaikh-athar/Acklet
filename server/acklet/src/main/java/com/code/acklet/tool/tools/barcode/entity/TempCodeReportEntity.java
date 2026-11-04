package com.code.acklet.tool.tools.barcode.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "temp_code_reports")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TempCodeReportEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code_id", nullable = false)
    private UUID codeId;

    @Column(name = "reporter_ip_hash", nullable = false, length = 64)
    private String reporterIpHash;

    @Column(nullable = false, length = 64)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

