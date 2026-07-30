package com.code.acklet.github.repository;

import com.code.acklet.github.entity.RepositoryTree;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RepositoryTreeRepository extends JpaRepository<RepositoryTree, UUID> {
    Optional<RepositoryTree> findByRepositoryId(UUID repositoryId);
}
