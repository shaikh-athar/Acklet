package com.code.acklet.github.entity;

import com.code.acklet.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Tracks async import jobs for repository → tool creation.
 * The frontend polls /api/v1/github/import/{jobId}/status for progress.
 */
@Entity
@Table(name = "github_import_jobs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "github_account_id")
    private GitHubAccount githubAccount;

    @Column(name = "repo_full_name", nullable = false)
    private String repoFullName;

    /** UUID of the created tool (set when DONE) */
    @Column(name = "tool_id")
    private UUID toolId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ImportStatus status = ImportStatus.PENDING;

    @Column(name = "current_step")
    private String currentStep;

    @Column(name = "error_message", length = 2000)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public enum ImportStatus {
        PENDING, CLONING, ANALYZING, AI_GENERATION, DONE, FAILED
    }
}
