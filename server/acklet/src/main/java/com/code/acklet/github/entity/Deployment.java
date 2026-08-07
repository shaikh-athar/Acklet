package com.code.acklet.github.entity;

import com.code.acklet.tool.entity.Tool;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "deployments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deployment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tool_id")
    private Tool tool;

    @Column(name = "commit_sha")
    private String commitSha;

    @Column(name = "commit_message")
    private String commitMessage;

    @Column(name = "branch")
    private String branch;

    @Column(name = "author")
    private String author;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, BUILDING, DEPLOYING, SUCCESS, FAILED

    @Column(name = "build_logs", columnDefinition = "TEXT")
    private String buildLogs;

    @Column(name = "runtime_logs", columnDefinition = "TEXT")
    private String runtimeLogs;

    @Column(name = "duration_ms")
    @Builder.Default
    private Long durationMs = 0L;

    @Column(name = "framework")
    private String framework;

    @Column(name = "runtime")
    private String runtime;

    @Column(name = "package_manager")
    private String packageManager;

    @Column(name = "port")
    private Integer port;

    @Column(name = "live_url")
    private String liveUrl;

    @Column(name = "build_command")
    private String buildCommand;

    @Column(name = "start_command")
    private String startCommand;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "health_status")
    @Builder.Default
    private String healthStatus = "HEALTHY";

    @Column(name = "cpu_usage")
    @Builder.Default
    private String cpuUsage = "0%";

    @Column(name = "memory_usage")
    @Builder.Default
    private String memoryUsage = "0MB";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
