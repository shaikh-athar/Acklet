package com.code.acklet.github.service;

import com.code.acklet.ai.provider.AiTaskType;
import com.code.acklet.ai.provider.ProviderRouter;
import com.code.acklet.github.entity.Repository;
import com.code.acklet.github.entity.RepositoryKnowledgeGraph;
import com.code.acklet.github.entity.RepositoryMetadata;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiRepositoryAnalysisEngine {

    private final ProviderRouter providerRouter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RepositoryKnowledgeGraph analyzeRepository(Repository repo, RepositoryMetadata metadata, Path workspace) {
        String readmeContent = readReadme(workspace);
        String buildFilesSummary = summarizeBuildFiles(workspace);

        // Task 1: Repository Understanding Prompt
        String understandingPrompt = String.format(
            "Analyze this repository:\nName: %s\nDescription: %s\nREADME:\n%s\n\n" +
            "Provide a JSON response with fields:\n" +
            "{\n" +
            "  \"summary\": \"2-sentence overview\",\n" +
            "  \"purpose\": \"main objective and core capabilities\",\n" +
            "  \"targetAudience\": \"intended developers/users\",\n" +
            "  \"businessDomain\": \"industry/domain e.g. DevOps, Fintech, Developer Tool\"\n" +
            "}",
            repo.getFullName(), metadata.getDescription(), readmeContent
        );

        // Task 2: Architecture & Infrastructure Inference Prompt
        String archPrompt = String.format(
            "Based on the project structure and build files:\n%s\n" +
            "And description: %s\n\n" +
            "Provide a JSON response with fields:\n" +
            "{\n" +
            "  \"architectureType\": \"Monolith/Microservice/Frontend/Library/CLI/SDK\",\n" +
            "  \"architectureConfidence\": 0.95,\n" +
            "  \"infrastructureStyle\": \"Docker/Kubernetes/Serverless/VM/Unknown\",\n" +
            "  \"aiTags\": [\"tag1\", \"tag2\", \"tag3\"]\n" +
            "}",
            buildFilesSummary, metadata.getDescription()
        );

        // Run both AI tasks concurrently to cut AI pipeline time in half
        java.util.concurrent.CompletableFuture<String> understandingFuture = java.util.concurrent.CompletableFuture.supplyAsync(
            () -> providerRouter.route(understandingPrompt, AiTaskType.SUMMARY)
        );
        java.util.concurrent.CompletableFuture<String> archFuture = java.util.concurrent.CompletableFuture.supplyAsync(
            () -> providerRouter.route(archPrompt, AiTaskType.CAPABILITIES)
        );

        // Wait for both concurrent requests to finish
        try {
            java.util.concurrent.CompletableFuture.allOf(understandingFuture, archFuture).join();
        } catch (Exception e) {
            log.error("AI pipeline exception in async task aggregation: {}", e.getMessage());
        }

        String understandingResult = null;
        try {
            understandingResult = understandingFuture.get();
        } catch (Exception e) {
            log.warn("Failed to retrieve AI repository understanding response: {}", e.getMessage());
        }

        String archResult = null;
        try {
            archResult = archFuture.get();
        } catch (Exception e) {
            log.warn("Failed to retrieve AI architecture inference response: {}", e.getMessage());
        }

        RepositoryKnowledgeGraph kg = RepositoryKnowledgeGraph.builder()
                 .repository(repo)
                 .analyzedAt(Instant.now())
                 .build();

        try {
            if (understandingResult != null) {
                JsonNode underNode = objectMapper.readTree(cleanJsonString(understandingResult));
                kg.setSummary(underNode.path("summary").asText(""));
                kg.setPurpose(underNode.path("purpose").asText(""));
                kg.setTargetAudience(underNode.path("targetAudience").asText(""));
                kg.setBusinessDomain(underNode.path("businessDomain").asText(""));
            } else {
                kg.setSummary(metadata.getDescription());
            }
        } catch (Exception e) {
            log.warn("Failed to parse AI understanding response: {}", e.getMessage());
            kg.setSummary(metadata.getDescription());
        }

        try {
            if (archResult != null) {
                JsonNode archNode = objectMapper.readTree(cleanJsonString(archResult));
                kg.setArchitectureType(archNode.path("architectureType").asText("Unknown"));
                kg.setArchitectureConfidence(archNode.path("architectureConfidence").asDouble(1.0));
                kg.setInfrastructureStyle(archNode.path("infrastructureStyle").asText("Unknown"));
                
                List<String> tags = new ArrayList<>();
                archNode.path("aiTags").forEach(n -> tags.add(n.asText()));
                kg.setAiTags(tags);
            } else {
                kg.setArchitectureType("Unknown");
                kg.setAiTags(Collections.emptyList());
            }
        } catch (Exception e) {
            log.warn("Failed to parse AI architecture response: {}", e.getMessage());
            kg.setArchitectureType("Unknown");
            kg.setAiTags(Collections.emptyList());
        }

        // Compute documentation completeness index
        double docScore = calculateDocumentationCompleteness(workspace);
        kg.setDocCompleteness(docScore);

        return kg;
    }

    private String readReadme(Path workspace) {
        try {
            Path readme = workspace.resolve("README.md");
            if (Files.exists(readme)) {
                String content = Files.readString(readme);
                return content.substring(0, Math.min(content.length(), 3000));
            }
        } catch (Exception ignored) {}
        return "No README file available.";
    }

    private String summarizeBuildFiles(Path workspace) {
        StringBuilder sb = new StringBuilder();
        try {
            Files.walk(workspace)
                    .filter(Files::isRegularFile)
                    .filter(path -> {
                        String relative = workspace.relativize(path).toString().replace('\\', '/');
                        String lower = relative.toLowerCase();
                        return !lower.contains(".git/") &&
                               !lower.contains("node_modules/") &&
                               !lower.contains("vendor/") &&
                               !lower.contains("target/") &&
                               !lower.contains("dist/") &&
                               !lower.contains("build/") &&
                               !lower.contains("coverage/");
                    })
                    .forEach(path -> {
                        String name = path.getFileName().toString();
                        if (name.equals("package.json") || name.equals("pom.xml") || name.equals("Dockerfile")) {
                            sb.append("File: ").append(workspace.relativize(path)).append("\n");
                        }
                    });
        } catch (IOException ignored) {}
        return sb.toString();
    }

    private double calculateDocumentationCompleteness(Path workspace) {
        double score = 20.0; // Base score
        if (Files.exists(workspace.resolve("README.md"))) score += 30.0;
        if (Files.exists(workspace.resolve("LICENSE"))) score += 20.0;
        if (Files.exists(workspace.resolve("CONTRIBUTING.md"))) score += 15.0;
        if (Files.exists(workspace.resolve("SECURITY.md"))) score += 15.0;
        return score;
    }

    private String cleanJsonString(String response) {
        if (response == null) return "{}";
        String clean = response.trim();
        int start = clean.indexOf('{');
        int end = clean.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return clean.substring(start, end + 1);
        }
        return clean;
    }
}
