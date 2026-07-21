package com.code.acklet.github.repository;

import com.code.acklet.github.entity.GitHubIntegration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GitHubIntegrationRepository extends JpaRepository<GitHubIntegration, UUID> {

    List<GitHubIntegration> findByUserId(UUID userId);

    Optional<GitHubIntegration> findByToolId(UUID toolId);

    Optional<GitHubIntegration> findByGithubRepo(String githubRepo);

    Optional<GitHubIntegration> findByGithubRepoId(Long githubRepoId);
}
