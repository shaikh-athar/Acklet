package com.code.acklet.tool.tools.qr.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
@ConfigurationProperties(prefix = "app.qr")
@Getter
@Setter
public class QrProperties {

    /**
     * Base public URL for shortlinks (e.g. https://acklet.dev/q or http://localhost:8080/q).
     */
    private String shortlinkBaseUrl = "http://localhost:8080/q";

    /**
     * Frontend landing page viewer base URL for hosted dynamic types (PDF, Menu, etc.).
     */
    private String clientLandingBaseUrl = "http://localhost:4200/tools/qr-generator/view";

    /**
     * Filesystem storage directory for uploaded QR assets (PDFs, images, vCards).
     */
    private String storageDir = System.getProperty("user.home") + File.separator + ".acklet" + File.separator + "qr_storage";

    /**
     * Maximum allowed size for uploaded assets (20MB default).
     */
    private long maxAssetSizeBytes = 20L * 1024 * 1024;

    /**
     * Default slug length for auto-generated Base62 codes.
     */
    private int defaultSlugLength = 6;

    /**
     * Salt used for computing anonymous visitor hashes for unique scan metrics.
     */
    private String salt = "acklet_qr_salt_default_key_2026";

    /**
     * Number of days to retain detailed scan event rows.
     */
    private int analyticsRetentionDays = 365;
}
