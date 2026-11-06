package com.code.acklet.converter;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Configuration properties for the file converter engine.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "app.converter")
public class ConverterProperties {

    /**
     * Whether the converter engine is enabled.
     */
    private boolean enabled = true;

    /**
     * Maximum upload file size in bytes (default: 50MB = 52428800 bytes).
     */
    private long maxFileSizeBytes = 52_428_800L;

    /**
     * Working directory for temporary upload and converted files.
     */
    private String tempDir = "";

    /**
     * Conversion execution timeout in seconds (default: 120s).
     */
    private int timeoutSeconds = 120;

    /**
     * Path to LibreOffice home directory or binary.
     * If blank, JODConverter automatically detects the system LibreOffice installation.
     */
    private String libreofficePath = "";

    /**
     * Threshold in bytes above which synchronous requests are converted asynchronously (default: 5MB).
     */
    private long asyncThresholdBytes = 5_242_880L;

    /**
     * Time-to-live for completed conversion jobs in minutes before cleanup (default: 60 minutes).
     */
    private int jobTtlMinutes = 60;

    /**
     * Cron expression for scheduled temporary file cleanup (default: every 15 minutes).
     */
    private String cleanupCron = "0 */15 * * * *";

    /**
     * Whether to use fallback document generation when LibreOffice daemon is not available locally.
     * Default: false for strict production and unit tests; enabled in dev application.properties.
     */
    private boolean devFallback = false;

    /**
     * Port numbers for the local office manager process pool.
     */
    private int[] portNumbers = new int[]{2002};

    /**
     * Resolves the effective working directory path.
     */
    public Path resolveTempDirectory() {
        if (tempDir != null && !tempDir.isBlank()) {
            return Paths.get(tempDir);
        }
        return Paths.get(System.getProperty("java.io.tmpdir"), "acklet-converter");
    }
}

