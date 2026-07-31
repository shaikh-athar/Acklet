package com.code.acklet.github.repository;

import com.code.acklet.github.entity.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

@org.springframework.stereotype.Repository
public interface RepositoryRepository extends JpaRepository<Repository, UUID> {
    Optional<Repository> findByIdAndUserId(UUID id, UUID userId);
    Optional<Repository> findByUserIdAndFullName(UUID userId, String fullName);
    Page<Repository> findAllByUserId(UUID userId, Pageable pageable);
    java.util.List<Repository> findAllByFullName(String fullName);
}
