package com.code.acklet.tool.entity.knowledge;

import com.code.acklet.tool.entity.Tool;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tool_knowledge")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ToolKnowledge {

    @Id
    @Column(name = "tool_id")
    private UUID toolId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "tool_id")
    private Tool tool;

    @Column(columnDefinition = "TEXT")
    private String overview;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "problems_solved", columnDefinition = "TEXT")
    private String problemsSolved;

    @Column(name = "who_should_use", columnDefinition = "TEXT")
    private String whoShouldUse;

    @Column(name = "who_should_avoid", columnDefinition = "TEXT")
    private String whoShouldAvoid;

    @Column(name = "expected_inputs", columnDefinition = "TEXT")
    private String expectedInputs;

    @Column(name = "expected_outputs", columnDefinition = "TEXT")
    private String expectedOutputs;

    @Column(name = "best_practices", columnDefinition = "TEXT")
    private String bestPractices;

    @Column(columnDefinition = "TEXT")
    private String advantages;

    @Column(columnDefinition = "TEXT")
    private String limitations;

    @Column(name = "verified_badge")
    @Builder.Default
    private boolean verifiedBadge = false;

    private String maintainer;

    @Column(name = "official_website")
    private String officialWebsite;

    @Column(name = "documentation_url")
    private String documentationUrl;

    @Column(name = "github_repository")
    private String githubRepository;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "technical_details")
    private Map<String, Object> technicalDetails;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "compatibility")
    private Map<String, Object> compatibility;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pricing_details")
    private Map<String, Object> pricingDetails;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "privacy_details")
    private Map<String, Object> privacyDetails;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "resources")
    private Map<String, Object> resources;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "seo_metadata")
    private Map<String, Object> seoMetadata;
}
