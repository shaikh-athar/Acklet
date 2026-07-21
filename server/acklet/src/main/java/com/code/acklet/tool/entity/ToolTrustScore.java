package com.code.acklet.tool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tool_trust_scores")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolTrustScore {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tool_id", nullable = false, unique = true)
    private Tool tool;

    @Builder.Default private double overallScore       = 0.0;
    @Builder.Default private double performanceScore   = 0.0;
    @Builder.Default private double securityScore      = 0.0;
    @Builder.Default private double documentationScore = 0.0;
    @Builder.Default private double accessibilityScore = 0.0;
    @Builder.Default private double maintenanceScore   = 0.0;
    @Builder.Default private double communityScore     = 0.0;

    @Column(name = "computed_at")
    @Builder.Default
    private Instant computedAt = Instant.now();
}
