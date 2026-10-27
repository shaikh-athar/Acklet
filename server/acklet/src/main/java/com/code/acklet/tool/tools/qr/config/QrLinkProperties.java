package com.code.acklet.tool.tools.qr.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.qr.link")
@Getter
@Setter
public class QrLinkProperties {

    /**
     * Base public URL for short links (e.g., http://localhost:8080/q or https://acklet.dev/q).
     */
    private String shortlinkBaseUrl = "http://localhost:8080/q";

    /**
     * Maximum character length for Plain Text payload (default 20,000 characters).
     */
    private int maxTextChars = 20000;

    /**
     * Maximum character length for Website URL.
     */
    private int maxUrlChars = 4000;

    /**
     * Maximum UTF-8 byte size for other dynamic payloads (vCard, WiFi, etc.).
     */
    private long maxOtherBytes = 10000;

    /**
     * Rolling retention period in months (extended upon each scan).
     */
    private int defaultTtlMonths = 12;

    /**
     * Orphan link retention in hours for links never scanned and never marked downloaded.
     */
    private int orphanTtlHours = 24;

    /**
     * Max link creations allowed per minute per client IP address.
     */
    private int createRateLimitPerMinute = 60;

    /**
     * Whether to enforce strict blocking of localhost/RFC1918 private IPs for URL targets.
     */
    private boolean blockPrivateTargets = false;
}
