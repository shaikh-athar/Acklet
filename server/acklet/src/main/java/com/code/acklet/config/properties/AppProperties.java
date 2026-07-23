package com.code.acklet.config.properties;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;
import org.springframework.validation.annotation.Validated;

/**
 * Enterprise-grade validated application configuration properties.
 * Binds and validates all 'app.*' properties from application profiles / environment variables.
 */
@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    @Valid
    @NestedConfigurationProperty
    private SecurityProperties security = new SecurityProperties();

    @Valid
    @NestedConfigurationProperty
    private AiProperties ai = new AiProperties();

    @Valid
    @NestedConfigurationProperty
    private GithubProperties github = new GithubProperties();

    @Getter
    @Setter
    public static class SecurityProperties {

        @Valid
        @NestedConfigurationProperty
        private JwtProperties jwt = new JwtProperties();

        @Valid
        @NestedConfigurationProperty
        private EncryptionProperties encryption = new EncryptionProperties();

        @Valid
        @NestedConfigurationProperty
        private GoogleProperties google = new GoogleProperties();
    }

    @Getter
    @Setter
    public static class JwtProperties {

        @NotBlank(message = "JWT Secret must be provided via JWT_SECRET environment variable")
        private String secret;

        @Min(value = 1000, message = "Access token expiration must be at least 1000ms")
        private long accessTokenExpirationMs = 900000; // 15 minutes

        @Min(value = 1000, message = "Refresh token expiration must be at least 1000ms")
        private long refreshTokenExpirationMs = 604800000; // 7 days
    }

    @Getter
    @Setter
    public static class EncryptionProperties {

        @NotBlank(message = "App encryption key must be provided via APP_ENCRYPTION_KEY environment variable")
        private String key;
    }

    @Getter
    @Setter
    public static class GoogleProperties {
        private String clientId;
        private String clientSecret;
    }

    @Getter
    @Setter
    public static class GithubProperties {
        private String clientId;
        private String clientSecret;
        private String webhookSecret;
    }

    @Getter
    @Setter
    public static class AiProperties {

        @Valid
        @NestedConfigurationProperty
        private MistralProperties mistral = new MistralProperties();

        @Valid
        @NestedConfigurationProperty
        private GeminiProperties gemini = new GeminiProperties();

        @Valid
        @NestedConfigurationProperty
        private ExecutorProperties executor = new ExecutorProperties();
    }

    @Getter
    @Setter
    public static class MistralProperties {
        private String apiKey;
        private String model = "mistral-small-latest";
    }

    @Getter
    @Setter
    public static class GeminiProperties {
        private String apiKey;
        private String model = "gemini-2.0-flash";
    }

    @Getter
    @Setter
    public static class ExecutorProperties {

        @Min(value = 1, message = "Core size must be at least 1")
        private int coreSize = 2;

        @Min(value = 1, message = "Max size must be at least 1")
        private int maxSize = 5;

        @Min(value = 1, message = "Queue capacity must be at least 1")
        private int queueCapacity = 50;
    }
}
