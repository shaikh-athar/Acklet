package com.code.acklet.ai.provider;

/**
 * Thrown when an AI provider call fails.
 * Allows the ProviderRouter to catch and try the next provider.
 */
public class AiProviderException extends RuntimeException {
    public AiProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
