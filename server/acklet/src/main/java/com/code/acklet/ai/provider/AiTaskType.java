package com.code.acklet.ai.provider;

/**
 * Every task type maps to a specific AI job category.
 * The ProviderRouter uses this to pick the best model for the task.
 */
public enum AiTaskType {
    SUMMARY,
    CAPABILITIES,
    SEO,
    DOCUMENTATION,
    MODERATION,
    EMBEDDING
}
