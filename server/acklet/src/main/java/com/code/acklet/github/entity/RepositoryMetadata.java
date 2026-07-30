package com.code.acklet.github.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "repository_metadata")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false, unique = true)
    private Repository repository;

    @Column(name = "description")
    private String description;

    @Column(name = "homepage")
    private String homepage;

    @Column(name = "license_name")
    private String licenseName;

    @Column(name = "primary_language")
    private String primaryLanguage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "languages", columnDefinition = "jsonb")
    private Map<String, Long> languages;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "topics", columnDefinition = "jsonb")
    private List<String> topics;

    @Column(name = "contributors_count")
    @Builder.Default
    private Integer contributorsCount = 0;

    @Column(name = "commit_count")
    @Builder.Default
    private Integer commitCount = 0;

    @Column(name = "has_issues")
    @Builder.Default
    private boolean hasIssues = true;

    @Column(name = "has_wiki")
    @Builder.Default
    private boolean hasWiki = false;

    @Column(name = "has_discussions")
    @Builder.Default
    private boolean hasDiscussions = false;
}
