package com.code.acklet.tool.tools.clipboard.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
@ConfigurationProperties(prefix = "app.clipboard")
@Getter
@Setter
public class ClipboardStorageProperties {

    /**
     * Filesystem storage directory for clipboard blobs and chunks.
     */
    private String storageDir = System.getProperty("user.home") + File.separator + ".acklet" + File.separator + "clipboard_storage";

    /**
     * Max single file upload ceiling (200MB default).
     */
    private long maxFileSizeBytes = 200L * 1024 * 1024;

    /**
     * Max overall room capacity (500MB default).
     */
    private long maxTotalShareSizeBytes = 500L * 1024 * 1024;

    /**
     * Default chunk size (5MB).
     */
    private int chunkSize = 5 * 1024 * 1024;

    /**
     * Retention period for incomplete upload sessions (24 hours).
     */
    private int uploadSessionExpiryHours = 24;

    /**
     * Retention days for clipboard rooms (7 days default).
     */
    private int retentionDays = 7;
}
