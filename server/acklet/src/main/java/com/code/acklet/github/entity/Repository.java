package com.code.acklet.github.entity;

import com.code.acklet.user.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "repositories",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "provider", "external_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Repository {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "provider", nullable = false)
    @Builder.Default
    private String provider = "GITHUB";

    @Column(name = "external_id", nullable = false)
    private String externalId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "default_branch", nullable = false)
    @Builder.Default
    private String defaultBranch = "main";

    @Column(name = "is_private", nullable = false)
    private boolean isPrivate;

    @Column(name = "html_url", nullable = false)
    private String htmlUrl;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "status_metadata_fetched", nullable = false)
    @Builder.Default
    private boolean statusMetadataFetched = false;

    @Column(name = "status_tree_analyzed", nullable = false)
    @Builder.Default
    private boolean statusTreeAnalyzed = false;

    @Column(name = "status_ai_analyzed", nullable = false)
    @Builder.Default
    private boolean statusAiAnalyzed = false;
}
