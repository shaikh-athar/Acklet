package com.code.acklet.tool.tools.barcode.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.temp-code")
@Getter
@Setter
public class TempCodeProperties {

    /**
     * Public base URL for temporary verification links for barcodes (e.g. http://barcode.localhost:4200).
     */
    private String verifyBaseUrl = "http://barcode.localhost:4200";

    /**
     * Public base URL for temporary verification links for QR codes (e.g. http://qr.localhost:4200).
     */
    private String qrVerifyBaseUrl = "http://qr.localhost:4200";

    public String resolveVerifyBaseUrl(String barcodeFormat) {
        if ("qrcode".equalsIgnoreCase(barcodeFormat)) {
            return qrVerifyBaseUrl != null && !qrVerifyBaseUrl.isBlank() ? qrVerifyBaseUrl : "http://qr.localhost:4200";
        }
        return verifyBaseUrl != null && !verifyBaseUrl.isBlank() ? verifyBaseUrl : "http://barcode.localhost:4200";
    }

    /**
     * Token length in Base32 characters (16 chars * 5 bits = 80 bits cryptographic entropy).
     */
    private int tokenLength = 16;

    /**
     * Minimum expiry allowed in minutes (server enforced: 1 minute).
     */
    private int minExpiryMinutes = 1;

    /**
     * Maximum expiry allowed in days (server enforced: 365 days).
     */
    private int maxExpiryDays = 365;

    /**
     * Retention period in days for expired records before scheduled hard purge.
     */
    private int purgeDays = 30;

    /**
     * Maximum active codes allowed per owner token.
     */
    private int maxActiveCodesPerOwner = 200;

    /**
     * Maximum items allowed per batch creation request (default 500).
     */
    private int maxBatchItems = 500;

    /**
     * Maximum characters for message content.
     */
    private int maxMessageLength = 500;

    /**
     * Maximum characters for link destination.
     */
    private int maxUrlLength = 2048;

    /**
     * Maximum characters for reference text.
     */
    private int maxReferenceLength = 64;

    /**
     * Expiry threshold in seconds under which an active code is marked "expiring soon" (default 1 hour).
     */
    private long expiringSoonThresholdSeconds = 3600;

    private RateLimit rateLimit = new RateLimit();
    private Security security = new Security();
    private Validation validation = new Validation();

    @Getter
    @Setter
    public static class RateLimit {
        private int createPerHour = 20;
        private int verifyPerMinute = 60;
        private int reportPerDay = 1;
    }

    @Getter
    @Setter
    public static class Security {
        private String pepper = "acklet_barcode_temp_pepper_default_2026";
    }

    @Getter
    @Setter
    public static class Validation {
        private List<String> blocklistedDomains = List.of();
        private boolean blockPrivateTargets = true;
    }
}

