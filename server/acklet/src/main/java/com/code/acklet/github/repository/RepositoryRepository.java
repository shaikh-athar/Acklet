package com.code.acklet.github.repository;

import com.code.acklet.github.entity.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

@org.springframework.stereotype.Repository
public interface RepositoryRepository extends JpaRepository<Repository, UUID> {
    Optional<Repository> findByIdAndUserId(UUID id, UUID userId);
    Optional<Repository> findByUserIdAndFullName(UUID userId, String fullName);
    Page<Repository> findAllByUserId(UUID userId, Pageable pageable);

    @Query("SELECT r FROM Repository r WHERE r.user.id = :userId AND r.externalId NOT LIKE :prefix% AND r.statusAiAnalyzed = true")
    Page<Repository> findAllByUserIdAndExternalIdNotStartingWith(
            @Param("userId") UUID userId,
            @Param("prefix") String prefix,
            Pageable pageable);

    java.util.List<Repository> findAllByFullName(String fullName);
}
