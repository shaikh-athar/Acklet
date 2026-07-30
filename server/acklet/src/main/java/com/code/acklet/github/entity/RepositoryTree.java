package com.code.acklet.github.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "repository_trees")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryTree {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false, unique = true)
    private Repository repository;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tree_structure", columnDefinition = "jsonb")
    private List<String> treeStructure; // Flat list of file paths in tree

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "detected_build_files", columnDefinition = "jsonb")
    private List<String> detectedBuildFiles; // Special build files (e.g. package.json, Dockerfile)

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
