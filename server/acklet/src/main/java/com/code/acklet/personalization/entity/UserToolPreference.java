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
@Table(name = "user_tool_preferences",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "tool_slug"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UserToolPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "tool_slug", nullable = false, length = 100)
    private String toolSlug;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferences", nullable = false)
    private Map<String, Object> preferences;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
