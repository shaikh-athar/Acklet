package com.code.acklet.discovery.entity;

import com.code.acklet.tool.entity.Tool;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tool_relationships")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ToolRelationship {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_tool_id", nullable = false)
    private Tool sourceTool;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_tool_id", nullable = false)
    private Tool targetTool;

    @Column(name = "relationship_type", nullable = false, length = 50)
    private String relationshipType; // ALTERNATIVE, FREQUENTLY_USED_TOGETHER, RECOMMENDED_NEXT, SIMILAR_PROBLEM

    @Column(name = "confidence_score")
    @Builder.Default
    private Double confidenceScore = 1.0;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
