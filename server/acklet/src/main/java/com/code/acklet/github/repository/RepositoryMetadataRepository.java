package com.code.acklet.github.repository;

import com.code.acklet.github.entity.RepositoryMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RepositoryMetadataRepository extends JpaRepository<RepositoryMetadata, UUID> {
    Optional<RepositoryMetadata> findByRepositoryId(UUID repositoryId);
}
