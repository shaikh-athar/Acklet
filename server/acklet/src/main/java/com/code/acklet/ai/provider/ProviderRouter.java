package com.code.acklet.ai.provider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Provider Router — selects the best available AI provider for a given task.
 *
 * Strategy:
 *  1. Filter providers that support the requested task type
 *  2. Take the first that reports isAvailable()
 *  3. Try it — if it throws, move to the next provider
 *  4. If all fail, throw AiProviderException
 *
 * Providers are injected in priority order (primary first).
 * Spring auto-wires the list in @ConditionalOnProperty registration order:
 *   MistralProvider (primary) → GeminiProvider (fallback, if configured)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProviderRouter {

    /** Injected by Spring — contains only configured (non-null) providers. */
    private final List<AiProvider> providers;

    /**
     * Route a prompt to the best available provider.
     *
     * @param prompt   The completed prompt string
     * @param task     The task type — used for provider selection and logging
     * @return         Model response text
     * @throws AiProviderException if all providers fail
     */
    public String route(String prompt, AiTaskType task) {
        List<AiProvider> eligible = providers.stream()
                .filter(p -> supports(p, task) && p.isAvailable())
                .toList();

        if (eligible.isEmpty()) {
            log.warn("No available providers for task {}. Attempting all configured providers...", task);
            eligible = providers.stream().filter(p -> supports(p, task)).toList();
        }

        if (eligible.isEmpty()) {
            throw new AiProviderException("No providers configured for task type: " + task, null);
        }

        Exception lastException = null;
        for (AiProvider provider : eligible) {
            try {
                log.debug("Routing task {} to provider: {}", task, provider.getProviderName());
                String result = provider.complete(prompt, task);
                log.info("Task {} completed by provider: {} ({} chars)", task, provider.getProviderName(), result.length());
                return result;
            } catch (AiProviderException e) {
                log.warn("Provider {} failed for task {}. Trying next...", provider.getProviderName(), task);
                lastException = e;
            }
        }

        throw new AiProviderException("All AI providers failed for task: " + task, lastException);
    }

    /** Returns the name of the currently active (first available) provider for a task. */
    public String activeProviderName(AiTaskType task) {
        return providers.stream()
                .filter(p -> supports(p, task) && p.isAvailable())
                .findFirst()
                .map(AiProvider::getProviderName)
                .orElse("none");
    }

    private boolean supports(AiProvider provider, AiTaskType task) {
        return Arrays.asList(provider.getSupportedTasks()).contains(task);
    }
}
