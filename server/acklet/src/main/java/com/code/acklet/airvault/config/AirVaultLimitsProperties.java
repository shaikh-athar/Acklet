package com.code.acklet.airvault.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "airvault.limits")
public class AirVaultLimitsProperties {

    /** 1 GB Max Single File (1,073,741,824 bytes) */
    private long maxFileBytes = 1024L * 1024L * 1024L;

    /** 5 GB Max Clipboard Total Storage (5,368,709,120 bytes) */
    private long maxClipboardBytes = 5L * 1024L * 1024L * 1024L;

    /** 10 GB Max Account Total Storage (10,737,418,240 bytes) */
    private long maxAccountBytes = 10L * 1024L * 1024L * 1024L;

    /** Single unified trash & recoverable retention period in days (7 days) */
    private int trashRetentionDays = 7;

    /** Default clipboard lifecycle retention period in days (7 days) */
    private int defaultClipboardRetentionDays = 7;

    /** Daily write quota for public guest links in bytes (250 MB) */
    private long perGuestLinkDailyWriteBytes = 250L * 1024L * 1024L;

    /** Maximum number of clipboards a single user can create (5 clipboards) */
    private int maxClipboardsPerUser = 5;

    /** Daily write item count limit for public guest links */
    private int perGuestLinkDailyItemCount = 50;
}
