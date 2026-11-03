package com.code.acklet.tool.tools.shortener.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.shortener")
@Getter
@Setter
public class ShortenerProperties {

    /**
     * Base public URL for short links (e.g. http://localhost:8080/s, http://localhost:4200/s, https://acklet.com/s).
     */
    private String baseUrl = "http://localhost:8080/s";

    /**
     * Standard generated Base62 slug length (default 6 chars -> 56.8 billion combinations).
     */
    private int codeLength = 6;

    /**
     * Maximum collision retry attempts when auto-generating slugs.
     */
    private int maxCollisionRetries = 10;

    /**
     * Default link expiration in days.
     */
    private int defaultExpiryDays = 365;

    /**
     * Maximum link expiration in days.
     */
    private int maxExpiryDays = 730;

    /**
     * Retention period in days for expired, limit-reached, or soft-deleted links before hard purge.
     */
    private int purgeDays = 90;

    /**
     * Minimum password length for protected links.
     */
    private int minPasswordLength = 6;

    /**
     * Maximum destination URL character length.
     */
    private int maxUrlLength = 2048;

    /**
     * Rate limiting configurations.
     */
    private RateLimit rateLimit = new RateLimit();

    /**
     * Security and pepper secrets.
     */
    private Security security = new Security();

    /**
     * Target URL validation settings.
     */
    private Validation validation = new Validation();

    @Getter
    @Setter
    public static class RateLimit {
        private int createPerHour = 20;
        private int unlockFailuresPer15Min = 5;
        private int unlockLockoutSeconds = 900; // 15 minutes
        private int availabilityPerMinute = 60;
        private int lookupPerMinute = 30;
        private int previewPerMinute = 60;
    }

    @Getter
    @Setter
    public static class Security {
        /**
         * Secret pepper used for HMAC-SHA256 of IP-derived rate limit keys and reporter hashes.
         */
        private String pepper = "acklet_shortener_secure_pepper_default_2026";

        /**
         * Domains considered internal short domains to prevent redirect loops.
         */
        private List<String> shortDomains = List.of("urlshortener.localhost", "localhost", "acklet.com", "acklet.dev");

        /**
         * Unlock cookie secret signature key.
         */
        private String unlockSigningSecret = "acklet_shortener_unlock_signing_secret_key_32b";

        /**
         * Duration in seconds for password unlock session cookie.
         */
        private int unlockSessionSeconds = 600; // 10 minutes
    }

    @Getter
    @Setter
    public static class Validation {
        private boolean blockPrivateTargets = true;
        private List<String> blocklistedDomains = List.of(
                "evil.com",
                "phishing.com",
                "malware-test.com",
                "badsite.test"
        );
        private String safeBrowsingApiKey = "";
        private int reportThresholdToFlag = 3;
    }
}
