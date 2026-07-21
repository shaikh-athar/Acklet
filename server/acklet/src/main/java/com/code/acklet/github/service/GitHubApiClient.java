package com.code.acklet.github.service;

import com.code.acklet.github.dto.GitHubRepoMetadata;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.github.client-id:}")
    private String clientId;

    @Value("${app.github.client-secret:}")
    private String clientSecret;

    /**
     * Exchanges OAuth authorization code for a GitHub User Access Token.
     */
    public String exchangeCodeForToken(String code) {
        if (clientId == null || clientId.isBlank()) {
            log.warn("GitHub OAuth client-id is not configured. Returning dummy token for local dev.");
            return "gho_dummy_token_" + UUID.randomUUID().toString();
        }

        String url = "https://github.com/login/oauth/access_token";
        Map<String, String> body = Map.of(
                "client_id", clientId,
                "client_secret", clientSecret,
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
}
