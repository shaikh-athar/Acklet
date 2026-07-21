package com.code.acklet.ai.service;

import com.code.acklet.ai.entity.AiJob;
import com.code.acklet.ai.entity.AiJob.JobStatus;
import com.code.acklet.ai.entity.AiJob.JobType;
import com.code.acklet.ai.repository.AiJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Manages the lifecycle of AI job records in the ai_jobs table.
 * Every AI call starts by calling start(), ends with done() or failed().
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiJobService {

    private final AiJobRepository jobRepository;

    /** Create and persist a RUNNING job record before making the AI call. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AiJob start(UUID toolId, JobType jobType, String provider, String prompt) {
        AiJob job = AiJob.builder()
                .toolId(toolId)
                .jobType(jobType)
                .status(JobStatus.RUNNING)
                .provider(provider)
                .promptHash(sha256(prompt))
                .build();
        return jobRepository.save(job);
    }

    /** Mark the job DONE with result payload and timing info. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AiJob done(UUID jobId, Map<String, Object> result, long latencyMs) {
        AiJob job = jobRepository.findById(jobId).orElseThrow();
        job.setStatus(JobStatus.DONE);
        job.setResult(result);
        job.setLatencyMs((int) latencyMs);
        job.setCompletedAt(Instant.now());
        return jobRepository.save(job);
    }

    /** Mark the job FAILED with the error message. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AiJob failed(UUID jobId, String errorMessage) {
        AiJob job = jobRepository.findById(jobId).orElseThrow();
        job.setStatus(JobStatus.FAILED);
        job.setError(errorMessage);
        job.setCompletedAt(Instant.now());
        return jobRepository.save(job);
    }

    /**
     * Check if a completed job exists for the same tool + task type.
     * Used to skip re-running expensive AI jobs if already done.
     */
    public Optional<AiJob> findCompletedJob(UUID toolId, JobType jobType) {
        return jobRepository.findByToolIdAndJobTypeAndStatusNot(toolId, jobType, JobStatus.FAILED);
    }

    // SHA-256 hash of the prompt for deduplication / cache key
    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return UUID.randomUUID().toString(); // fallback: no cache
        }
    }
}
