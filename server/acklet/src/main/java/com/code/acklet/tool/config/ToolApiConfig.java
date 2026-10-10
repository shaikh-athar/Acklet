package com.code.acklet.tool.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

/**
 * Central tool external API & key configuration layer.
 * Allows tools to declare their required external keys/endpoints without exposing secrets to frontend.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.tools")
public class ToolApiConfig {

    /**
     * Map of tool slug -> ToolServiceConfig
     */
    private Map<String, ToolServiceConfig> services = new HashMap<>();

    @Getter
    @Setter
    public static class ToolServiceConfig {
        private String endpointUrl;
        private String apiKey;
        private String apiSecret;
        private int timeoutSeconds = 30;
        private boolean enabled = true;
    }

    /**
     * Helper to retrieve tool API configuration by tool slug
     */
    public ToolServiceConfig getConfigForTool(String toolSlug) {
        return services.get(toolSlug);
    }
}
