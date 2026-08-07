package com.code.acklet.github.service;

import com.code.acklet.github.dto.GitHubAccountResponse;
import com.code.acklet.github.dto.GitHubRepoDto;
import com.code.acklet.github.dto.GitHubUserProfileDto;
import com.code.acklet.github.entity.GitHubAccount;
import com.code.acklet.github.repository.GitHubAccountRepository;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Manages user-scoped GitHub account connections (OAuth flow + account CRUD).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubConnectService {

    private static final String CSRF_PREFIX   = "gh:state:";
    private static final Duration STATE_TTL   = Duration.ofMinutes(10);

    private final GitHubApiClient          apiClient;
    private final GitHubAccountRepository  accountRepository;
    private final StringRedisTemplate      redis;

    // ── OAuth URL ──────────────────────────────────────────────────────────────

    /**
     * Generates a GitHub OAuth URL with a random CSRF state stored in Redis.
     */
    public String buildConnectUrl(UUID userId) {
        String state = userId.toString() + ":" + UUID.randomUUID();
        redis.opsForValue().set(CSRF_PREFIX + state, userId.toString(), STATE_TTL);
        return apiClient.buildConnectUrl(state);
    }

    // ── OAuth Callback ─────────────────────────────────────────────────────────

    /**
     * Completes the OAuth flow: validates CSRF state, exchanges code, stores account.
     */
    @Transactional
    public GitHubAccountResponse handleCallback(User user, String code, String state) {
        // Validate CSRF state
        String storedUserId = redis.opsForValue().get(CSRF_PREFIX + state);
        if (storedUserId == null || !storedUserId.equals(user.getId().toString())) {
            throw new SecurityException("Invalid or expired OAuth state");
        }
        redis.delete(CSRF_PREFIX + state);

        // Exchange code for token
        String token = apiClient.exchangeCodeForToken(code);
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("Failed to exchange GitHub OAuth code");
        }

        // Fetch user profile
        GitHubUserProfileDto profile = apiClient.fetchUserProfile(token);
        if (profile == null) {
            throw new IllegalStateException("Failed to fetch GitHub user profile");
        }

        // Upsert account
        GitHubAccount account = accountRepository
                .findByUserIdAndGithubUserId(user.getId(), profile.getId())
                .orElseGet(() -> GitHubAccount.builder().user(user).githubUserId(profile.getId()).build());

        account.setGithubLogin(profile.getLogin());
        account.setAvatarUrl(profile.getAvatarUrl());
        account.setAccessToken(token);
        account.setScopes("repo,read:user,user:email");
        account = accountRepository.save(account);

        log.info("GitHub account connected: user={} github={}", user.getId(), profile.getLogin());
        return toResponse(account);
    }

    // ── Account Management ─────────────────────────────────────────────────────

    public List<GitHubAccountResponse> listAccounts(UUID userId) {
        return accountRepository.findAllByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void disconnectAccount(UUID userId, UUID accountId) {
        GitHubAccount account = accountRepository.findByUserIdAndId(userId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("GitHub account not found"));
        accountRepository.delete(account);
        log.info("GitHub account disconnected: user={} account={}", userId, accountId);
    }

    // ── Repo Listing ───────────────────────────────────────────────────────────

    public List<GitHubRepoDto> listRepos(UUID userId, UUID accountId, int page, int perPage, String search) {
        GitHubAccount account = accountRepository.findByUserIdAndId(userId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("GitHub account not found"));
        return apiClient.fetchUserRepos(account.getAccessToken(), page, perPage, search);
    }

    public List<String> listBranches(UUID userId, UUID accountId, String owner, String repo) {
        GitHubAccount account = accountRepository.findByUserIdAndId(userId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("GitHub account not found"));
        return apiClient.fetchRepoBranches(owner + "/" + repo, account.getAccessToken());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private GitHubAccountResponse toResponse(GitHubAccount a) {
        return GitHubAccountResponse.builder()
                .id(a.getId())
                .githubLogin(a.getGithubLogin())
                .avatarUrl(a.getAvatarUrl())
                .scopes(a.getScopes())
                .connectedAt(a.getConnectedAt())
                .build();
    }
}
