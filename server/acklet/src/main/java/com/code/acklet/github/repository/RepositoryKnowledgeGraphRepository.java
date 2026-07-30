package com.code.acklet.github.repository;

import com.code.acklet.github.entity.RepositoryKnowledgeGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RepositoryKnowledgeGraphRepository extends JpaRepository<RepositoryKnowledgeGraph, UUID> {
    Optional<RepositoryKnowledgeGraph> findByRepositoryId(UUID repositoryId);
}
