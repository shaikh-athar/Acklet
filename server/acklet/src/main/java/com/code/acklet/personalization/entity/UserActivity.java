package com.code.acklet.personalization.entity;

import com.code.acklet.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "user_activity")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UserActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType; // TOOL | CATEGORY | COLLECTION | BLOG | GUIDE | SEARCH

    @Column(name = "entity_id")
    private String entityId;

    @Column(name = "entity_slug")
    private String entitySlug;

    @Column(name = "entity_name")
    private String entityName;

    @Column(name = "accessed_at", nullable = false)
    @Builder.Default
    private Instant accessedAt = Instant.now();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata")
    private Map<String, Object> metadata;
}
