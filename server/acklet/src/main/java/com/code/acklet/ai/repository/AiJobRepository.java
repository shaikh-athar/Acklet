package com.code.acklet.ai.repository;

import com.code.acklet.ai.entity.AiJob;
import com.code.acklet.ai.entity.AiJob.JobStatus;
import com.code.acklet.ai.entity.AiJob.JobType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiJobRepository extends JpaRepository<AiJob, UUID> {

    List<AiJob> findByToolIdOrderByCreatedAtDesc(UUID toolId);

    Optional<AiJob> findByToolIdAndJobTypeAndStatusNot(UUID toolId, JobType jobType, JobStatus status);

    Optional<AiJob> findByPromptHash(String promptHash);

    Page<AiJob> findByStatus(JobStatus status, Pageable pageable);

    long countByToolId(UUID toolId);
}
