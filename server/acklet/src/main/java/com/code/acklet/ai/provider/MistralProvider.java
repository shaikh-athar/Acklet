package com.code.acklet.ai.provider;

import dev.langchain4j.model.mistralai.MistralAiChatModel;
import dev.langchain4j.model.mistralai.MistralAiChatModelName;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Primary AI provider — Mistral AI.
 * Only active when app.ai.mistral.api-key is set.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.ai.mistral.api-key")
public class MistralProvider implements AiProvider {

    private final MistralAiChatModel model;
    private final AtomicBoolean available = new AtomicBoolean(true);

    public MistralProvider(
            @Value("${app.ai.mistral.api-key}") String apiKey,
            @Value("${app.ai.mistral.model:mistral-small-latest}") String modelName) {
        this.model = MistralAiChatModel.builder()
                .apiKey(apiKey)
                .modelName(MistralAiChatModelName.MISTRAL_SMALL_LATEST)
                .temperature(0.3)
                .maxTokens(2048)
                .timeout(Duration.ofSeconds(60))
                .build();
        log.info("MistralProvider initialized with model: {}", modelName);
    }

    @Override
    public String getProviderName() { return "mistral"; }

    @Override
    public AiTaskType[] getSupportedTasks() {
        return AiTaskType.values(); // Mistral handles all task types
    }

    @Override
    public String complete(String prompt, AiTaskType task) {
        try {
            String response = model.generate(prompt);
            available.set(true);
            return response;
        } catch (Exception e) {
            available.set(false);
            log.error("MistralProvider failed for task {}: {}", task, e.getMessage());
            throw new AiProviderException("Mistral AI call failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean isAvailable() {
        return available.get();
    }
}
