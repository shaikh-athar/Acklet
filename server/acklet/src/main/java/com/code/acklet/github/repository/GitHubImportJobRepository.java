package com.code.acklet.github.repository;

import com.code.acklet.github.entity.GitHubImportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GitHubImportJobRepository extends JpaRepository<GitHubImportJob, UUID> {

    Optional<GitHubImportJob> findByIdAndUserId(UUID id, UUID userId);

    List<GitHubImportJob> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    List<GitHubImportJob> findAllByRepoFullName(String repoFullName);

    @Modifying
    @Query("UPDATE GitHubImportJob j SET j.status = :status, j.currentStep = :step, j.updatedAt = :now WHERE j.id = :id")
    void updateStatus(@Param("id") UUID id,
                      @Param("status") GitHubImportJob.ImportStatus status,
                      @Param("step") String step,
                      @Param("now") Instant now);
}
