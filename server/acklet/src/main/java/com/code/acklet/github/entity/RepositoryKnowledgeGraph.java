package com.code.acklet.github.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "repository_knowledge_graphs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryKnowledgeGraph {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false, unique = true)
    private Repository repository;

    @Column(name = "summary", columnDefinition = "text")
    private String summary;

    @Column(name = "purpose", columnDefinition = "text")
    private String purpose;

    @Column(name = "target_audience")
    private String targetAudience;

    @Column(name = "business_domain")
    private String businessDomain;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_capabilities", columnDefinition = "jsonb")
    private List<String> keyCapabilities;

    @Column(name = "architecture_type")
    private String architectureType;

    @Column(name = "architecture_conf")
    @Builder.Default
    private double architectureConfidence = 1.0;

    @Column(name = "infrastructure_style")
    private String infrastructureStyle;

    @Column(name = "doc_completeness")
    @Builder.Default
    private double docCompleteness = 0.0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_tags", columnDefinition = "jsonb")
    private List<String> aiTags;

    @Column(name = "analyzed_at", nullable = false)
    @Builder.Default
    private Instant analyzedAt = Instant.now();
}
