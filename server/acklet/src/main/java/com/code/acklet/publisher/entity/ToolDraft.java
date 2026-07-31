package com.code.acklet.publisher.entity;

import com.code.acklet.github.entity.Repository;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Persists wizard state across sessions. One draft per (repository, user) pair.
 * Promoted to a real Tool on final publish.
 */
@Entity
@Table(name = "tool_drafts",
       uniqueConstraints = @UniqueConstraint(columnNames = {"repository_id", "user_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ToolDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "step_completed")
    @Builder.Default
    private int stepCompleted = 0;

    // ── Step 1: Identity ──────────────────────────────────────────────────────
    @Column(name = "tool_name")
    private String toolName;

    @Column(name = "slug")
    private String slug;

    @Column(name = "tagline")
    private String tagline;

    // ── Step 3: AI Info ───────────────────────────────────────────────────────
    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "problem_statement", columnDefinition = "text")
    private String problemStatement;

    @Column(name = "target_audience")
    private String targetAudience;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "use_cases", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> useCases = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "features", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> features = List.of();

    @Column(name = "business_domain")
    private String businessDomain;

    @Column(name = "ai_confidence_score")
    @Builder.Default
    private double aiConfidenceScore = 0.0;

    // ── Step 4: Tech & Capabilities ───────────────────────────────────────────
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tech_stack", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> techStack = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "capabilities", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> capabilities = List.of();

    // ── Step 5: Taxonomy & Pricing ────────────────────────────────────────────
    @Column(name = "primary_category_slug")
    private String primaryCategorySlug;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> tags = List.of();

    @Column(name = "pricing_type")
    @Builder.Default
    private String pricingType = "FREE";

    @Column(name = "license")
    private String license;

    @Column(name = "is_open_source")
    @Builder.Default
    private boolean isOpenSource = true;

    // ── Step 6: Branding ──────────────────────────────────────────────────────
    @Column(name = "github_url")
    private String githubUrl;

    @Column(name = "website_url")
    private String websiteUrl;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "cover_url")
    private String coverUrl;

    @Column(name = "documentation_url")
    private String documentationUrl;

    @Column(name = "discord_url")
    private String discordUrl;

    // ── State ─────────────────────────────────────────────────────────────────
    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "DRAFT";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_tool_id")
    private Tool publishedTool;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
