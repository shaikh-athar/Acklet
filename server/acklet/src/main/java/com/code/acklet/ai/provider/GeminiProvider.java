package com.code.acklet.ai.provider;

import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Fallback AI provider — Google Gemini Flash.
 * Only active when app.ai.gemini.api-key is set AND langchain4j-google-ai-gemini is on the classpath.
 * Used when the primary Mistral provider is unhealthy.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.ai.gemini.api-key")
public class GeminiProvider implements AiProvider {

    private final GoogleAiGeminiChatModel model;
    private final AtomicBoolean available = new AtomicBoolean(true);

    public GeminiProvider(
            @Value("${app.ai.gemini.api-key}") String apiKey,
            @Value("${app.ai.gemini.model:gemini-2.0-flash}") String modelName) {
        this.model = GoogleAiGeminiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(0.3)
                .maxOutputTokens(2048)
                .build();
        log.info("GeminiProvider initialized as fallback with model: {}", modelName);
    }

    @Override
    public String getProviderName() { return "gemini"; }

    @Override
    public AiTaskType[] getSupportedTasks() {
        return new AiTaskType[]{
            AiTaskType.SUMMARY, AiTaskType.CAPABILITIES, AiTaskType.SEO, AiTaskType.DOCUMENTATION
        };
    }

    @Override
    public String complete(String prompt, AiTaskType task) {
        try {
            String response = model.generate(prompt);
            available.set(true);
            return response;
        } catch (Exception e) {
            available.set(false);
            log.error("GeminiProvider failed for task {}: {}", task, e.getMessage());
            throw new AiProviderException("Gemini AI call failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean isAvailable() {
        return available.get();
    }
}
