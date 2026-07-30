package com.code.acklet.github.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "repository_health")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryHealth {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false, unique = true)
    private Repository repository;

    @Column(name = "health_score", nullable = false)
    @Builder.Default
    private double healthScore = 0.0;

    @Column(name = "maintenance_score", nullable = false)
    @Builder.Default
    private double maintenanceScore = 0.0;

    @Column(name = "activity_score", nullable = false)
    @Builder.Default
    private double activityScore = 0.0;

    @Column(name = "popularity_score", nullable = false)
    @Builder.Default
    private double popularityScore = 0.0;

    @Column(name = "calculated_at", nullable = false)
    @Builder.Default
    private Instant calculatedAt = Instant.now();
}
