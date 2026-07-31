package com.code.acklet.github.service;

import com.code.acklet.config.properties.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubExtendedApiClient {

    private final AppProperties appProperties;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> fetchExtendedMetadata(String ownerRepo, String token) {
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
            if (body == null) return Collections.emptyMap();

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("externalId", body.path("id").asText());
            metadata.put("name", body.path("name").asText());
            metadata.put("fullName", body.path("full_name").asText());
            metadata.put("owner", body.path("owner").path("login").asText());
            metadata.put("ownerType", body.path("owner").path("type").asText());
            metadata.put("ownerAvatar", body.path("owner").path("avatar_url").asText());
            metadata.put("htmlUrl", body.path("html_url").asText());
            metadata.put("description", body.path("description").asText(""));
            metadata.put("homepage", body.path("homepage").asText(""));
            metadata.put("isPrivate", body.path("private").asBoolean());
            metadata.put("isFork", body.path("fork").asBoolean());
            metadata.put("isArchived", body.path("archived").asBoolean());
            metadata.put("stars", body.path("stargazers_count").asInt());
            metadata.put("forks", body.path("forks_count").asInt());
            metadata.put("watchers", body.path("watchers_count").asInt());
            metadata.put("openIssues", body.path("open_issues_count").asInt());
            metadata.put("sizeKb", body.path("size").asInt());
            metadata.put("defaultBranch", body.path("default_branch").asText("main"));
            metadata.put("licenseName", body.path("license").path("name").asText("None"));
            metadata.put("primaryLanguage", body.path("language").asText("Unknown"));
            
            // Languages map
            metadata.put("languages", fetchRepoLanguages(cleanOwnerRepo, token));
            
            // Topics list
            List<String> topicsList = new ArrayList<>();
            if (body.has("topics")) {
                body.path("topics").forEach(node -> topicsList.add(node.asText()));
            }
            metadata.put("topics", topicsList);

            // Fetch extra metrics (Releases, Contributors)
            metadata.put("hasReleases", hasReleases(cleanOwnerRepo, token));
            metadata.put("contributorsCount", fetchContributorsCount(cleanOwnerRepo, token));

            return metadata;
        } catch (Exception e) {
            log.error("Failed to fetch extended GitHub metadata for {}: {}", cleanOwnerRepo, e.getMessage());
            return Collections.emptyMap();
        }
    }

    public List<String> fetchRecursiveTree(String ownerRepo, String branch, String token) {
        String cleanOwnerRepo = ownerRepo.replace("https://github.com/", "").replaceAll("^/", "").replaceAll("/$", "");
        String url = "https://api.github.com/repos/" + cleanOwnerRepo + "/git/trees/" + branch + "?recursive=1";

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
            if (body == null || !body.has("tree")) return Collections.emptyList();

            List<String> filePaths = new ArrayList<>();
            body.path("tree").forEach(node -> {
                String type = node.path("type").asText();
                if ("blob".equals(type) || "tree".equals(type)) {
                    filePaths.add(node.path("path").asText());
                }
            });
            return filePaths;
        } catch (Exception e) {
            log.error("Failed to fetch recursive tree for {} on branch {}: {}", cleanOwnerRepo, branch, e.getMessage());
            return Collections.emptyList();
        }
    }

    private Map<String, Long> fetchRepoLanguages(String ownerRepo, String token) {
        String url = "https://api.github.com/repos/" + ownerRepo + "/languages";
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Acklet-Platform");
        if (token != null && !token.isBlank() && !token.startsWith("gho_dummy")) {
            headers.setBearerAuth(token);
        }
        try {
            ResponseEntity<Map> res = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (res.getBody() != null) {
                Map<String, Long> langs = new HashMap<>();
                res.getBody().forEach((k, v) -> langs.put(String.valueOf(k), Long.valueOf(String.valueOf(v))));
                return langs;
            }
        } catch (Exception ignored) {}
        return Collections.emptyMap();
    }

    private boolean hasReleases(String ownerRepo, String token) {
        String url = "https://api.github.com/repos/" + ownerRepo + "/releases?per_page=1";
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Acklet-Platform");
        if (token != null && !token.isBlank() && !token.startsWith("gho_dummy")) {
            headers.setBearerAuth(token);
        }
        try {
            ResponseEntity<JsonNode> res = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
            return res.getBody() != null && res.getBody().isArray() && res.getBody().size() > 0;
        } catch (Exception ignored) {}
        return false;
    }

    private int fetchContributorsCount(String ownerRepo, String token) {
        String url = "https://api.github.com/repos/" + ownerRepo + "/contributors?per_page=1";
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Acklet-Platform");
        if (token != null && !token.isBlank() && !token.startsWith("gho_dummy")) {
            headers.setBearerAuth(token);
        }
        try {
            ResponseEntity<JsonNode> res = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
            // Read link headers to compute total pages/contributors or return approximation
            if (res.getBody() != null && res.getBody().isArray()) {
                return res.getBody().size();
            }
        } catch (Exception ignored) {}
        return 1;
    }

    public String fetchRawFileContent(String ownerRepo, String path, String branch, String token) {
        String cleanOwnerRepo = ownerRepo.replace("https://github.com/", "").replaceAll("^/", "").replaceAll("/$", "");
        String url = String.format("https://raw.githubusercontent.com/%s/%s/%s", cleanOwnerRepo, branch, path);

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Acklet-Platform");
        if (token != null && !token.isBlank() && !token.startsWith("gho_dummy")) {
            headers.setBearerAuth(token);
        }

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return res.getBody();
        } catch (Exception e) {
            log.warn("Failed to fetch raw file {}/{} from GitHub: {}", cleanOwnerRepo, path, e.getMessage());
            return null;
        }
    }
}
