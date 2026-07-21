package com.code.acklet.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Tracks every AI provider call as an auditable job record.
 * Maps to the ai_jobs table created in V16.
 */
@Entity
@Table(name = "ai_jobs")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AiJob {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** The tool this job is enriching (nullable for non-tool jobs like moderation). */
    @Column(name = "tool_id")
    private UUID toolId;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false)
    private JobType jobType;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private JobStatus status = JobStatus.PENDING;

    /** Provider that handled this job (e.g. "mistral", "gemini"). */
    private String provider;

    private String model;

    /** SHA-256 hash of the prompt — used as a cache key to avoid re-running identical prompts. */
    @Column(name = "prompt_hash")
    private String promptHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> result;

    @Column(columnDefinition = "TEXT")
    private String error;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    public enum JobType {
        SUMMARY, CAPABILITIES, SEO, DOCUMENTATION, MODERATION, EMBEDDING
    }

    public enum JobStatus {
        PENDING, RUNNING, DONE, FAILED, RETRYING
    }
}
