package com.code.acklet.github.repository;

import com.code.acklet.github.entity.GitHubAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GitHubAccountRepository extends JpaRepository<GitHubAccount, UUID> {

    List<GitHubAccount> findAllByUserId(UUID userId);

    Optional<GitHubAccount> findByUserIdAndGithubUserId(UUID userId, Long githubUserId);

    Optional<GitHubAccount> findByUserIdAndId(UUID userId, UUID accountId);

    boolean existsByUserIdAndGithubUserId(UUID userId, Long githubUserId);
}
