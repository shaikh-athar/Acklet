package com.code.acklet.tool.entity;

import com.code.acklet.shared.entity.Auditable;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tools")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tool extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    private String description;

    @Builder.Default
    private String version = "1.0.0";

    private String url;

    private String icon;

    private String author;

    @Column(name = "usage_count")
    @Builder.Default
    private long usageCount = 0;

    @Column(name = "is_featured")
    @Builder.Default
    private boolean isFeatured = false;

    @Column(name = "is_trending")
    @Builder.Default
    private boolean isTrending = false;

    // ── Publisher fields ──────────────────────────────────────────────────────
    @Column(name = "publisher_id")
    private UUID publisherId;

    @Column(name = "tagline")
    private String tagline;

    @Column(name = "website_url")
    private String websiteUrl;

    @Column(name = "github_url")
    private String githubUrl;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "cover_url")
    private String coverUrl;

    @Column(name = "pricing_type")
    @Builder.Default
    private String pricingType = "FREE";

    @Column(name = "is_open_source")
    @Builder.Default
    private boolean isOpenSource = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private ToolStatus status = ToolStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status")
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

    @Column(name = "upvote_count")
    @Builder.Default
    private long upvoteCount = 0;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "repository_id")
    private UUID repositoryId;

    public enum ToolStatus {
        DRAFT, PENDING, ACTIVE, ARCHIVED, REJECTED
    }

    public enum VerificationStatus {
        UNVERIFIED, COMMUNITY, VERIFIED, OFFICIAL
    }
}
