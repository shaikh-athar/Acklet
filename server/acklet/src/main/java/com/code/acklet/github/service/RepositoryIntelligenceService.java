package com.code.acklet.github.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
public class RepositoryIntelligenceService {

    public static class DetectionResult {
        public final String value;
        public final int confidence;

        public DetectionResult(String value, int confidence) {
            this.value = value;
            this.confidence = confidence;
        }
    }

    public List<DetectionResult> detectFrameworks(List<String> treeFiles, String packageJsonContent, String pomXmlContent) {
        List<DetectionResult> results = new ArrayList<>();

        // Next.js Heuristics
        int nextConfidence = 0;
        if (packageJsonContent != null) {
            if (packageJsonContent.contains("\"next\"")) nextConfidence += 50;
        }
        if (treeFiles.stream().anyMatch(f -> f.endsWith("next.config.js") || f.endsWith("next.config.mjs"))) {
            nextConfidence += 30;
        }
        if (treeFiles.stream().anyMatch(f -> f.contains("/app/") || f.contains("/pages/"))) {
            nextConfidence += 20;
        }
        if (nextConfidence > 0) {
            results.add(new DetectionResult("Next.js", nextConfidence));
        }

        // Spring Boot Heuristics
        int springConfidence = 0;
        if (pomXmlContent != null) {
            if (pomXmlContent.contains("spring-boot")) springConfidence += 50;
        }
        if (treeFiles.stream().anyMatch(f -> f.endsWith("application.properties") || f.endsWith("application.yml") || f.endsWith("application.yaml"))) {
            springConfidence += 30;
        }
        if (treeFiles.stream().anyMatch(f -> f.endsWith("pom.xml") || f.endsWith("build.gradle"))) {
            springConfidence += 20;
        }
        if (springConfidence > 0) {
            results.add(new DetectionResult("Spring Boot", springConfidence));
        }

        // Vue/Nuxt Heuristics
        int nuxtConfidence = 0;
        if (packageJsonContent != null && packageJsonContent.contains("\"nuxt\"")) {
            nuxtConfidence += 60;
        }
        if (treeFiles.stream().anyMatch(f -> f.endsWith("nuxt.config.js") || f.endsWith("nuxt.config.ts"))) {
            nuxtConfidence += 40;
        }
        if (nuxtConfidence > 0) {
            results.add(new DetectionResult("Nuxt.js", nuxtConfidence));
        }

        return results;
    }

    public List<String> inferCapabilities(List<String> treeFiles, String packageJsonContent) {
        List<String> capabilities = new ArrayList<>();

        // Database migrations
        if (treeFiles.stream().anyMatch(f -> f.contains("db/migration") || f.contains("migrations/"))) {
            capabilities.add("Database Migrations");
        }

        // AI Capable
        if (packageJsonContent != null && (packageJsonContent.contains("openai") || packageJsonContent.contains("langchain") || packageJsonContent.contains("ollama"))) {
            capabilities.add("AI/LLM Application");
        }

        // REST API
        if (treeFiles.stream().anyMatch(f -> f.contains("Controller") || f.contains("api/") || f.contains("routes/"))) {
            capabilities.add("REST API");
        }

        return capabilities;
    }

    public double calculateHealthScore(List<String> treeFiles, boolean hasLicense, boolean hasDescription) {
        double score = 40.0; // Base score

        if (treeFiles.stream().anyMatch(f -> f.toLowerCase().endsWith("readme.md"))) {
            score += 20.0;
        }
        if (hasLicense) {
            score += 20.0;
        }
        if (hasDescription) {
            score += 10.0;
        }
        if (treeFiles.stream().anyMatch(f -> f.contains(".github/workflows") || f.contains("gitlab-ci.yml"))) {
            score += 10.0;
        }

        return Math.min(100.0, score);
    }
}
