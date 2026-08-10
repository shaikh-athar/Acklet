package com.code.acklet.github.service;

import com.code.acklet.config.properties.AppProperties;
import com.code.acklet.github.dto.GitHubRepoDto;
import com.code.acklet.github.dto.GitHubRepoMetadata;
import com.code.acklet.github.dto.GitHubUserProfileDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Client for interacting with the GitHub REST API (https://api.github.com).
 * Handles OAuth token exchange, repository metadata fetching, Base64 README decoding,
 * and framework/tech-stack detection from repository manifests.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubApiClient {

    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Builds the GitHub OAuth authorization URL with CSRF state and required scopes.
     */
    public String buildConnectUrl(String state) {
        String clientId = appProperties.getGithub().getClientId();
        String scope = "repo,read:user,user:email";
        return String.format(
            "https://github.com/login/oauth/authorize?client_id=%s&scope=%s&state=%s&allow_signup=false",
            clientId != null ? clientId : "", scope, state);
    }

    /**
     * Exchanges OAuth authorization code for a GitHub User Access Token.
     */
    public String exchangeCodeForToken(String code) {
        String clientId = appProperties.getGithub().getClientId();
        String clientSecret = appProperties.getGithub().getClientSecret();

        if (clientId == null || clientId.isBlank()) {
            log.warn("GitHub OAuth client-id is not configured. Returning dummy token for local dev.");
            return "gho_dummy_token_" + UUID.randomUUID().toString();
        }

        String url = "https://github.com/login/oauth/access_token";
        Map<String, String> body = Map.of(
                "client_id", clientId,
                "client_secret", clientSecret != null ? clientSecret : "",
                "code", code
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody().path("access_token").asText();
            }
        } catch (Exception e) {
            log.error("Failed to exchange GitHub OAuth code for token: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Fetches comprehensive metadata for a GitHub repository.
     *
     * @param ownerRepo  "owner/repo" e.g. "facebook/react"
     * @param token      Optional access token for private repos / higher rate limits
     */
    public GitHubRepoMetadata fetchRepoMetadata(String ownerRepo, String token) {
        String cleanOwnerRepo = ownerRepo.replace("https://github.com/", "").replaceAll("^/", "").replaceAll("/$", "");
        String url = "https://api.github.com/repos/" + cleanOwnerRepo;

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Acklet-Platform");
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (token != null && !token.isBlank() && !token.startsWith("gho_dummy")) {
            headers.setBearerAuth(token);
        }

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<JsonNode> res = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
            JsonNode body = res.getBody();
            if (body == null) return null;

            String defaultBranch = body.path("default_branch").asText("main");
            String licenseName = body.path("license").path("spdx_id").asText("NOASSERTION");
            if (licenseName.equalsIgnoreCase("NOASSERTION")) {
                licenseName = body.path("license").path("name").asText(null);
            }

            // Fetch README.md
            String readme = fetchReadmeContent(cleanOwnerRepo, token);

            // Fetch latest release
            String releaseNotes = null;
            String releaseVersion = null;
            try {
                ResponseEntity<JsonNode> relRes = restTemplate.exchange(url + "/releases/latest", HttpMethod.GET, entity, JsonNode.class);
                if (relRes.getBody() != null) {
                    releaseVersion = relRes.getBody().path("tag_name").asText();
                    releaseNotes = relRes.getBody().path("body").asText();
                }
            } catch (Exception ignored) {}

            // Framework detection
            List<String> frameworks = detectFrameworks(cleanOwnerRepo, token, readme);

            return GitHubRepoMetadata.builder()
                    .repoId(body.path("id").asLong())
                    .name(body.path("name").asText())
                    .fullName(body.path("full_name").asText())
                    .owner(body.path("owner").path("login").asText())
                    .description(body.path("description").asText(null))
                    .htmlUrl(body.path("html_url").asText())
                    .defaultBranch(defaultBranch)
                    .license(licenseName)
                    .stars(body.path("stargazers_count").asInt())
                    .forks(body.path("forks_count").asInt())
                    .openIssues(body.path("open_issues_count").asInt())
                    .readmeContent(readme)
                    .latestReleaseNotes(releaseNotes)
                    .latestReleaseVersion(releaseVersion)
                    .detectedFrameworks(frameworks)
                    .build();

        } catch (Exception e) {
            log.error("Failed to fetch GitHub metadata for {}: {}", cleanOwnerRepo, e.getMessage());
            return null;
        }
    }

    private String fetchReadmeContent(String ownerRepo, String token) {
        String url = "https://api.github.com/repos/" + ownerRepo + "/readme";
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Acklet-Platform");
        if (token != null && !token.isBlank() && !token.startsWith("gho_dummy")) {
            headers.setBearerAuth(token);
        }

        try {
            ResponseEntity<JsonNode> res = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
            if (res.getBody() != null && res.getBody().has("content")) {
                String base64 = res.getBody().get("content").asText().replaceAll("\\s+", "");
                return new String(Base64.getDecoder().decode(base64), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            log.debug("README not found for {}: {}", ownerRepo, e.getMessage());
        }
        return null;
    }

    private List<String> detectFrameworks(String ownerRepo, String token, String readme) {
        Set<String> detected = new LinkedHashSet<>();
        String textToScan = (readme != null ? readme.toLowerCase() : "");

        if (textToScan.contains("react") || textToScan.contains("jsx")) detected.add("React");
        if (textToScan.contains("next.js") || textToScan.contains("nextjs")) detected.add("Next.js");
        if (textToScan.contains("vue") || textToScan.contains("nuxt")) detected.add("Vue.js");
        if (textToScan.contains("angular")) detected.add("Angular");
        if (textToScan.contains("svelte")) detected.add("Svelte");
        if (textToScan.contains("spring boot") || textToScan.contains("springframework")) detected.add("Spring Boot");
        if (textToScan.contains("express") || textToScan.contains("fastify")) detected.add("Node.js");
        if (textToScan.contains("docker")) detected.add("Docker");
        if (textToScan.contains("tailwind")) detected.add("Tailwind CSS");
        if (textToScan.contains("rust") || textToScan.contains("cargo")) detected.add("Rust");
        if (textToScan.contains("python") || textToScan.contains("fastapi")) detected.add("Python");

        return new ArrayList<>(detected);
    }

    // ── User-scoped API calls ──────────────────────────────────────────────────

    /**
     * Fetches the authenticated user's GitHub profile.
     */
    public GitHubUserProfileDto fetchUserProfile(String token) {
        HttpHeaders headers = buildHeaders(token);
        try {
            ResponseEntity<GitHubUserProfileDto> res = restTemplate.exchange(
                "https://api.github.com/user", HttpMethod.GET,
                new HttpEntity<>(headers), GitHubUserProfileDto.class);
            return res.getBody();
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized e) {
            log.error("Failed to fetch GitHub user profile due to bad credentials: {}", e.getMessage());
            throw new com.code.acklet.shared.exception.UnauthorizedException("GitHub integration token is invalid or expired. Please reconnect your account.");
        } catch (Exception e) {
            log.error("Failed to fetch GitHub user profile: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Lists repositories accessible to the authenticated user (paged, optional search filter).
     */
    public List<GitHubRepoDto> fetchUserRepos(String token, int page, int perPage, String search) {
        String url = String.format(
            "https://api.github.com/user/repos?sort=updated&direction=desc&per_page=%d&page=%d",
            perPage, page);
        HttpHeaders headers = buildHeaders(token);
        try {
            ResponseEntity<List<GitHubRepoDto>> res = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers),
                new org.springframework.core.ParameterizedTypeReference<List<GitHubRepoDto>>() {});
            List<GitHubRepoDto> repos = res.getBody();
            if (repos == null) return List.of();
            if (search != null && !search.isBlank()) {
                String q = search.toLowerCase();
                repos = repos.stream()
                    .filter(r -> r.getName().toLowerCase().contains(q) ||
                                 (r.getDescription() != null && r.getDescription().toLowerCase().contains(q)))
                    .toList();
            }
            return repos;
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized e) {
            log.error("Failed to fetch user repos from GitHub due to bad credentials: {}", e.getMessage());
            throw new com.code.acklet.shared.exception.UnauthorizedException("GitHub integration token is invalid or expired. Please reconnect your account.");
        } catch (Exception e) {
            log.error("Failed to fetch user repos from GitHub: {}", e.getMessage());
            return List.of();
        }
    }

    public List<String> fetchRepoBranches(String ownerRepo, String token) {

        String cleanOwnerRepo = ownerRepo.replace("https://github.com/", "").replaceAll("^/", "").replaceAll("/$", "");
        String url = "https://api.github.com/repos/" + cleanOwnerRepo + "/branches?per_page=100";
        HttpHeaders headers = buildHeaders(token);
        try {
            ResponseEntity<JsonNode> res = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
            JsonNode body = res.getBody();
            if (body != null && body.isArray()) {
                List<String> list = new ArrayList<>();
                for (JsonNode node : body) {
                    list.add(node.path("name").asText());
                }
                return list;
            }
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized e) {
            log.error("Failed to fetch branches for {} due to bad credentials: {}", cleanOwnerRepo, e.getMessage());
            throw new com.code.acklet.shared.exception.UnauthorizedException("GitHub integration token is invalid or expired. Please reconnect your account.");
        } catch (Exception e) {
            log.error("Failed to fetch branches for {}: {}", cleanOwnerRepo, e.getMessage());
        }
        return List.of("main", "master");
    }


    private HttpHeaders buildHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Acklet-Platform");
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (token != null && !token.isBlank() && !token.startsWith("gho_dummy")) {
            headers.setBearerAuth(token);
        }
        return headers;
    }
}
