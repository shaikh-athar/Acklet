package com.code.acklet.github.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "repository_sync_history")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositorySyncHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @Column(name = "commit_sha", nullable = false)
    private String commitSha;

    @Column(name = "committer", nullable = false)
    private String committer;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "changed_files", columnDefinition = "jsonb")
    private List<String> changedFiles;

    @Column(name = "is_full_rescan", nullable = false)
    private boolean isFullRescan;

    @Column(name = "synced_at", nullable = false)
    @Builder.Default
    private Instant syncedAt = Instant.now();
}
