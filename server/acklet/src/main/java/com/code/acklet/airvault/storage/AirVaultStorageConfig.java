package com.code.acklet.airvault.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

/**
 * Configuration that instantiates the active {@link AirVaultStorageAdapter} based on the server-side
 * {@code STORAGE_BACKEND} flag.
 * <p>
 * <b>Configuration Flag Behavior:</b>
 * <ul>
 *   <li>{@code STORAGE_BACKEND=local} (or unset): Uses {@link LocalStorageAdapter}.
 *       No cloud calls, no credentials needed. Ideal for local dev & offline testing.</li>
 *   <li>{@code STORAGE_BACKEND=r2}: Uses {@link R2StorageAdapter} pointing to Cloudflare R2.
 *       Fails fast at startup if credentials (account ID, access key, secret key) are missing.</li>
 * </ul>
 * <p>
 * <b>Zero Code Changes for Deployment:</b>
 * Switching from local to R2 requires only changing the environment variable {@code STORAGE_BACKEND=r2}
 * and providing the standard R2 credentials. No code modifications are needed anywhere in the application.
 */
@Configuration
@Slf4j
public class AirVaultStorageConfig {

    @Value("${airvault.storage.backend:local}")
    private String storageBackend;

    @Value("${airvault.storage.r2.account-id:}")
    private String r2AccountId;

    @Value("${airvault.storage.r2.access-key-id:}")
    private String r2AccessKeyId;

    @Value("${airvault.storage.r2.secret-access-key:}")
    private String r2SecretAccessKey;

    @Value("${airvault.storage.r2.bucket-name:acklet-airvault}")
    private String r2BucketName;

    @Value("${airvault.storage.r2.endpoint:}")
    private String r2CustomEndpoint;

    @Bean
    public AirVaultStorageAdapter airVaultStorageAdapter() {
        String backendMode = storageBackend != null ? storageBackend.trim().toLowerCase() : "local";

        if ("r2".equals(backendMode)) {
            log.info("[AirVault Storage] ☁️ Active storage backend: CLOUDFLARE R2 (Production mode)");
            validateR2Credentials();
            S3Client s3Client = buildR2S3Client();
            return new R2StorageAdapter(s3Client, r2BucketName);
        }

        // Default: local filesystem
        log.info("[AirVault Storage] 📁 Active storage backend: LOCAL FILESYSTEM (Development mode)");
        Path localDir = Paths.get(System.getProperty("java.io.tmpdir"), "acklet_airvault_uploads");
        return new LocalStorageAdapter(localDir);
    }

    private void validateR2Credentials() {
        if (r2AccessKeyId == null || r2AccessKeyId.isBlank()) {
            throw new IllegalStateException("AirVault R2 Storage initialization failed: R2_ACCESS_KEY_ID is missing or blank.");
        }
        if (r2SecretAccessKey == null || r2SecretAccessKey.isBlank()) {
            throw new IllegalStateException("AirVault R2 Storage initialization failed: R2_SECRET_ACCESS_KEY is missing or blank.");
        }
        if ((r2AccountId == null || r2AccountId.isBlank()) && (r2CustomEndpoint == null || r2CustomEndpoint.isBlank())) {
            throw new IllegalStateException("AirVault R2 Storage initialization failed: Either R2_ACCOUNT_ID or R2_CUSTOM_ENDPOINT must be provided.");
        }
    }

    private S3Client buildR2S3Client() {
        URI endpointUri;
        if (r2CustomEndpoint != null && !r2CustomEndpoint.isBlank()) {
            endpointUri = URI.create(r2CustomEndpoint);
        } else {
            endpointUri = URI.create(String.format("https://%s.r2.cloudflarestorage.net", r2AccountId));
        }

        log.info("[AirVault Storage] Connecting to R2 endpoint: {}", endpointUri);

        AwsBasicCredentials credentials = AwsBasicCredentials.create(r2AccessKeyId, r2SecretAccessKey);

        S3Configuration s3Configuration = S3Configuration.builder()
                .pathStyleAccessEnabled(true) // Cloudflare R2 requires path-style access
                .checksumValidationEnabled(false)
                .build();

        return S3Client.builder()
                .endpointOverride(endpointUri)
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of("auto")) // Cloudflare R2 uses 'auto' region
                .serviceConfiguration(s3Configuration)
                .httpClientBuilder(ApacheHttpClient.builder()
                        .maxConnections(100)
                        .connectionTimeout(Duration.ofSeconds(10))
                        .socketTimeout(Duration.ofSeconds(60)))
                .build();
    }
}
