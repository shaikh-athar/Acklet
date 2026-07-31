package com.code.acklet.publisher.repository;

import com.code.acklet.publisher.entity.ToolDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ToolDraftRepository extends JpaRepository<ToolDraft, UUID> {
    Optional<ToolDraft> findByRepositoryIdAndUserId(UUID repositoryId, UUID userId);
    boolean existsByRepositoryIdAndUserId(UUID repositoryId, UUID userId);
}
