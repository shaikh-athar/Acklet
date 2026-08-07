package com.code.acklet.github.repository;

import com.code.acklet.github.entity.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {
    List<Deployment> findAllByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId);
    List<Deployment> findAllByToolIdOrderByCreatedAtDesc(UUID toolId);
}
