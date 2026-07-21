package com.code.acklet.github.entity;

import com.code.acklet.shared.security.EncryptedStringConverter;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "github_integrations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubIntegration {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tool_id", unique = true)
    private Tool tool;

    @Column(name = "github_user")
    private String githubUser;

    @Column(name = "github_repo")
    private String githubRepo;

    @Column(name = "github_repo_id")
    private Long githubRepoId;

    @Column(name = "default_branch")
    @Builder.Default
    private String defaultBranch = "main";

    @Column(name = "webhook_id")
    private Long webhookId;

    /** Access token encrypted at application layer using AES-256 */
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "access_token")
    private String accessToken;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
