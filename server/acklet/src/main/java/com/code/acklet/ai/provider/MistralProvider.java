package com.code.acklet.ai.provider;

import com.code.acklet.config.properties.AppProperties;
import dev.langchain4j.model.mistralai.MistralAiChatModel;
import dev.langchain4j.model.mistralai.MistralAiChatModelName;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Primary AI provider — Mistral AI.
 * Only active when app.ai.mistral.api-key is set.
 */
@Slf4j
@Component
@Order(1)
@ConditionalOnProperty(name = "app.ai.mistral.api-key")
public class MistralProvider implements AiProvider {

    private final MistralAiChatModel model;
    private final AtomicBoolean available = new AtomicBoolean(true);

    public MistralProvider(AppProperties appProperties) {
        String apiKey = appProperties.getAi().getMistral().getApiKey();
        String rawModel = appProperties.getAi().getMistral().getModel();
        String selectedModel = (rawModel != null && !rawModel.isBlank()) ? rawModel : "mistral-small-latest";
        if (apiKey == null || apiKey.isBlank()) {
            this.model = null;
            this.available.set(false);
            log.info("MistralProvider initialized in disabled state (API key not configured).");
        } else {
            this.model = MistralAiChatModel.builder()
                    .apiKey(apiKey)
                    .modelName(selectedModel)
                    .temperature(0.3)
                    .maxTokens(2048)
                    .timeout(Duration.ofSeconds(60))
                    .build();
            log.info("MistralProvider initialized with model: {}", selectedModel);
        }
    }

    @Override
    public String getProviderName() { return "mistral"; }

    @Override
    public AiTaskType[] getSupportedTasks() {
        return AiTaskType.values(); // Mistral handles all task types
    }

    @Override
    public String complete(String prompt, AiTaskType task) {
        if (model == null) {
            throw new AiProviderException("Mistral AI call failed: API key not configured");
        }
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
        return model != null && available.get();
    }
}
