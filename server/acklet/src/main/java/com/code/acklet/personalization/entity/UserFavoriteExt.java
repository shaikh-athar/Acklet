package com.code.acklet.personalization.entity;

import com.code.acklet.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_favorites_ext",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "entity_type", "entity_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UserFavoriteExt {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType; // TOOL | CATEGORY | COLLECTION | BLOG | GUIDE

    @Column(name = "entity_id", nullable = false)
    private String entityId;

    @Column(name = "entity_name")
    private String entityName;

    @Column(name = "entity_slug")
    private String entitySlug;

    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private boolean pinned = false;

    @Column(name = "pinned_at")
    private Instant pinnedAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
