package com.code.acklet.github.entity;

import com.code.acklet.shared.security.EncryptedStringConverter;
import com.code.acklet.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * User-scoped GitHub account connection.
 * One user can connect multiple GitHub accounts (personal + org).
 * Unlike {@link GitHubIntegration} (which is tool-scoped), this records
 * the OAuth grant at the user level so we can list/import repos.
 */
@Entity
@Table(name = "github_accounts",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "github_user_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "github_user_id", nullable = false)
    private Long githubUserId;

    @Column(name = "github_login", nullable = false)
    private String githubLogin;

    @Column(name = "avatar_url")
    private String avatarUrl;

    /** GitHub OAuth access token — stored AES-256 encrypted. */
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "access_token", nullable = false)
    private String accessToken;

    @Column(name = "scopes")
    private String scopes;

    @Column(name = "connected_at", nullable = false)
    @Builder.Default
    private Instant connectedAt = Instant.now();
}
