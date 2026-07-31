package com.code.acklet.github.entity;

import com.code.acklet.tool.entity.Tool;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "repository_projects",
       uniqueConstraints = @UniqueConstraint(columnNames = {"repository_id", "path"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryProject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @Column(name = "path", nullable = false)
    private String path; // e.g. "/" or "apps/web"

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "framework", nullable = false)
    @Builder.Default
    private String framework = "Unknown";

    @Column(name = "package_manager", nullable = false)
    @Builder.Default
    private String packageManager = "Unknown";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tool_id")
    private Tool tool; // Associated published Tool if linked
}
