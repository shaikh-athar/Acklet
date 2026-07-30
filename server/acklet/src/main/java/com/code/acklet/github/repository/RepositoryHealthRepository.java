package com.code.acklet.github.repository;

import com.code.acklet.github.entity.RepositoryHealth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RepositoryHealthRepository extends JpaRepository<RepositoryHealth, UUID> {
    Optional<RepositoryHealth> findByRepositoryId(UUID repositoryId);
}
