package com.code.acklet.feedback.entity;

import com.code.acklet.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "feedbacks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(length = 50, nullable = false)
    private String category; // 'BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'USABILITY', 'GENERAL', 'PERFORMANCE'

    @Column(name = "tool_id", length = 100, nullable = false)
    private String toolId; // e.g. 'json-lens', 'airvault', 'platform'

    @Column(name = "tool_name", length = 150)
    private String toolName; // e.g. 'JSONLens', 'AirVault', 'Acklet Platform'

    @Column(length = 255)
    private String email;

    @Column(length = 50, nullable = false)
    private String source; // 'IN_APP', 'EMAIL', 'EXTERNAL', 'API', 'MANUAL'

    @Column(name = "page_url", length = 500)
    private String pageUrl;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "device_type", length = 50)
    private String deviceType;

    @Column(length = 50, nullable = false)
    private String status; // 'NEW', 'REVIEWING', 'PLANNED', 'RESOLVED', 'REJECTED'

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (status == null || status.isBlank()) {
            status = "NEW";
        }
        if (source == null || source.isBlank()) {
            source = "IN_APP";
        }
        if (category == null || category.isBlank()) {
            category = "GENERAL";
        }
        if (toolId == null || toolId.isBlank()) {
            toolId = "platform";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
