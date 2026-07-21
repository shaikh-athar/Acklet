package com.code.acklet.ai.service;

import com.code.acklet.ai.entity.AiJob.JobType;
import com.code.acklet.tool.entity.Tool;
import dev.langchain4j.model.mistralai.MistralAiEmbeddingModel;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

/**
 * Dense Vector Embedding Generator for Acklet tools and queries.
 *
 * Supports dual-mode embedding generation:
 * 1. Mistral AI Embeddings (1024d/384d) when MISTRAL_API_KEY is configured.
 * 2. High-performance normalized Trigram Hash Vectorizer (384d dense unit vector) for 100% offline local development.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingGenerationService {

    private final AiJobService  jobService;
    private final EntityManager entityManager;

    @Value("${app.ai.mistral.api-key:}")
    private String mistralApiKey;

    private MistralAiEmbeddingModel mistralEmbeddingModel;

    private synchronized MistralAiEmbeddingModel getMistralEmbeddingModel() {
        if (mistralEmbeddingModel == null && mistralApiKey != null && !mistralApiKey.isBlank()) {
            try {
                log.info("Initializing Mistral AI Embedding Model...");
                mistralEmbeddingModel = MistralAiEmbeddingModel.builder()
                        .apiKey(mistralApiKey)
                        .modelName("mistral-embed")
                        .build();
            } catch (Exception e) {
                log.warn("Failed to initialize Mistral AI Embedding Model: {}", e.getMessage());
            }
        }
        return mistralEmbeddingModel;
    }

    /**
     * Generates a 384-dimensional normalized dense embedding vector for text.
     */
    public float[] embedText(String text) {
        if (text == null || text.isBlank()) {
            return new float[384];
        }

        MistralAiEmbeddingModel mistralModel = getMistralEmbeddingModel();
        if (mistralModel != null) {
            try {
                var response = mistralModel.embed(text.strip());
                return response.content().vector();
            } catch (Exception e) {
                log.warn("Mistral embedding call failed ({}), falling back to local dense vectorizer.", e.getMessage());
            }
        }

        return generateLocalDenseVector(text, 384);
    }

    /**
     * Local Deterministic Trigram Hashing Dense Vectorizer.
     * Maps arbitrary text into a 384-dimensional L2-normalized dense vector.
     */
    private float[] generateLocalDenseVector(String text, int dim) {
        float[] vector = new float[dim];
        String cleaned = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ").strip();
        String[] words = cleaned.split("\\s+");

        for (String word : words) {
            if (word.isBlank()) continue;

            // Word hash bucket
            int wordHash = Math.abs(word.hashCode()) % dim;
            vector[wordHash] += 1.5f;

            // Subword trigram hashing for semantic capture
            for (int i = 0; i <= word.length() - 3; i++) {
                String trigram = word.substring(i, i + 3);
                int triHash = Math.abs(trigram.hashCode()) % dim;
                vector[triHash] += 0.5f;
            }
        }

        // L2 Normalization (unit vector)
        double norm = 0.0;
        for (float v : vector) {
            norm += v * v;
        }
        norm = Math.sqrt(norm);

        if (norm > 0) {
            for (int i = 0; i < dim; i++) {
                vector[i] = (float) (vector[i] / norm);
            }
        }

        return vector;
    }

    /**
     * Generates and saves vector embedding for a tool into PostgreSQL pgvector column.
     */
    @Transactional
    public void embedTool(Tool tool) {
        UUID toolId = tool.getId();
        String textToEmbed = buildToolTextRepresentation(tool);

        var job = jobService.start(toolId, JobType.EMBEDDING, mistralApiKey != null && !mistralApiKey.isBlank() ? "mistral-embed" : "local-dense-384", textToEmbed);
        long start = System.currentTimeMillis();

        try {
            float[] vector = embedText(textToEmbed);
            long latency = System.currentTimeMillis() - start;

            String vectorString = formatVectorForPgVector(vector);

            entityManager.createNativeQuery(
                    "UPDATE tools SET embedding = :vectorVal::vector WHERE id = :toolId"
            )
            .setParameter("vectorVal", vectorString)
            .setParameter("toolId", toolId)
            .executeUpdate();

            jobService.done(job.getId(), Map.of("dimensions", vector.length, "vectorPreview", Arrays.copyOf(vector, Math.min(5, vector.length))), latency);
            log.info("Successfully stored {}d vector for tool {} in {}ms", vector.length, tool.getSlug(), latency);

        } catch (Exception e) {
            jobService.failed(job.getId(), e.getMessage());
            log.error("Failed to generate embedding for tool {}: {}", tool.getSlug(), e.getMessage(), e);
        }
    }

    private String buildToolTextRepresentation(Tool tool) {
        StringBuilder sb = new StringBuilder();
        sb.append(tool.getName()).append(". ");
        if (tool.getTagline() != null && !tool.getTagline().isBlank()) {
            sb.append(tool.getTagline()).append(". ");
        }
        if (tool.getDescription() != null && !tool.getDescription().isBlank()) {
            sb.append(tool.getDescription()).append(". ");
        }
        if (tool.getCategory() != null) {
            sb.append("Category: ").append(tool.getCategory().getName()).append(". ");
        }
        return sb.toString();
    }

    /**
     * Formats float array to PostgreSQL pgvector string syntax: "[0.123, -0.456, 0.789]"
     */
    public String formatVectorForPgVector(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            sb.append(vector[i]);
            if (i < vector.length - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }
}
