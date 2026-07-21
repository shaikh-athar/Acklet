package com.code.acklet.ai.provider;

/**
 * Contract every AI provider must implement.
 * The application never depends on a concrete provider — only on this interface.
 */
public interface AiProvider {

    /** Human-readable name for logging and job tracking. */
    String getProviderName();

    /** Tasks this provider can handle. */
    AiTaskType[] getSupportedTasks();

    /**
     * Send a prompt and get a text completion.
     *
     * @param prompt  The fully-formed prompt (built by PromptTemplates)
     * @param task    The task type (used for metric tagging)
     * @return        The model's text response
     */
    String complete(String prompt, AiTaskType task);

    /** Health check — returns false if the API key is missing or the last call failed. */
    boolean isAvailable();
}
