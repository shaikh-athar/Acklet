package com.code.acklet.github.repository;

import com.code.acklet.github.entity.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {
    List<Deployment> findAllByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId);
    List<Deployment> findAllByToolIdOrderByCreatedAtDesc(UUID toolId);

    @Modifying
    @Query("UPDATE Deployment d SET d.buildLogs = :logs WHERE d.id = :id")
    void updateBuildLogs(@Param("id") UUID id, @Param("logs") String logs);
}
