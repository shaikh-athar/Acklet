package com.code.acklet.github.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "repository_statistics")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryStatistics {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false, unique = true)
    private Repository repository;

    @Column(name = "stars", nullable = false)
    @Builder.Default
    private Integer stars = 0;

    @Column(name = "forks", nullable = false)
    @Builder.Default
    private Integer forks = 0;

    @Column(name = "watchers", nullable = false)
    @Builder.Default
    private Integer watchers = 0;

    @Column(name = "size_kb", nullable = false)
    @Builder.Default
    private Integer sizeKb = 0;

    @Column(name = "open_issues", nullable = false)
    @Builder.Default
    private Integer openIssues = 0;
}
