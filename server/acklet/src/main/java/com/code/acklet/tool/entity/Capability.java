package com.code.acklet.tool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "capabilities")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Capability {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tool_id", nullable = false)
    private Tool tool;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_ai_generated")
    @Builder.Default
    private boolean isAiGenerated = false;

    @Builder.Default
    private double confidence = 1.0;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
