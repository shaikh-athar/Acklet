package com.code.acklet.discovery.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "discovery_ranking_weights")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class DiscoveryRankingWeight {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "relevance_weight")
    @Builder.Default
    private Double relevanceWeight = 0.4;

    @Column(name = "popularity_weight")
    @Builder.Default
    private Double popularityWeight = 0.25;

    @Column(name = "trending_weight")
    @Builder.Default
    private Double trendingWeight = 0.15;

    @Column(name = "quality_weight")
    @Builder.Default
    private Double qualityWeight = 0.2;

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
