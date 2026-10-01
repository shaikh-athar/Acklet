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
 * {@code airvault.storage.type} (or legacy {@code airvault.storage.backend}) configuration.
 * <p>
 * <b>Configuration Options:</b>
 * <ul>
 *   <li>{@code airvault.storage.type=local} (or {@code STORAGE_BACKEND=local}, default): Uses {@link LocalStorageAdapter}.
 *       No cloud calls, zero credentials needed. Ideal for local dev & offline testing.</li>
 *   <li>{@code airvault.storage.type=s3} (or {@code r2}): Uses {@link R2StorageAdapter} pointing to Cloudflare R2 or AWS S3.
 *       Fails fast at startup if credentials (access key, secret key, bucket) are missing.</li>
 * </ul>
 */
@Configuration
@Slf4j
public class AirVaultStorageConfig {

    @Value("${airvault.storage.type:${airvault.storage.backend:local}}")
    private String storageType;

    @Value("${airvault.storage.s3.endpoint:${airvault.storage.r2.endpoint:}}")
    private String s3Endpoint;

    @Value("${airvault.storage.s3.access-key:${airvault.storage.r2.access-key-id:}}")
    private String s3AccessKey;

    @Value("${airvault.storage.s3.secret-key:${airvault.storage.r2.secret-access-key:}}")
    private String s3SecretKey;

    @Value("${airvault.storage.s3.bucket:${airvault.storage.r2.bucket-name:acklet-airvault}}")
    private String s3Bucket;

    @Value("${airvault.storage.s3.region:auto}")
    private String s3Region;

    @Value("${airvault.storage.r2.account-id:}")
    private String r2AccountId;

    @Bean
    public AirVaultStorageAdapter airVaultStorageAdapter() {
        String mode = storageType != null ? storageType.trim().toLowerCase() : "local";

        if ("s3".equals(mode) || "r2".equals(mode)) {
            log.info("[AirVault Storage] ☁️ Active storage backend: S3/CLOUDFLARE R2 (Production mode)");
            validateS3Credentials();
            S3Client s3Client = buildS3Client();
            return new R2StorageAdapter(s3Client, s3Bucket);
        }

        // Default: local filesystem
        log.info("[AirVault Storage] 📁 Active storage backend: LOCAL FILESYSTEM (Development mode)");
        Path localDir = Paths.get(System.getProperty("java.io.tmpdir"), "acklet_airvault_uploads");
        return new LocalStorageAdapter(localDir);
    }

    private void validateS3Credentials() {
        if (s3AccessKey == null || s3AccessKey.isBlank()) {
            throw new IllegalStateException("AirVault S3/R2 Storage initialization failed: airvault.storage.s3.access-key (or R2_ACCESS_KEY_ID) is missing or blank.");
        }
        if (s3SecretKey == null || s3SecretKey.isBlank()) {
            throw new IllegalStateException("AirVault S3/R2 Storage initialization failed: airvault.storage.s3.secret-key (or R2_SECRET_ACCESS_KEY) is missing or blank.");
        }
        if (s3Bucket == null || s3Bucket.isBlank()) {
            throw new IllegalStateException("AirVault S3/R2 Storage initialization failed: airvault.storage.s3.bucket is missing or blank.");
        }
        if ((s3Endpoint == null || s3Endpoint.isBlank()) && (r2AccountId == null || r2AccountId.isBlank())) {
            throw new IllegalStateException("AirVault S3/R2 Storage initialization failed: Either airvault.storage.s3.endpoint or R2_ACCOUNT_ID must be provided.");
        }
    }

    private S3Client buildS3Client() {
        URI endpointUri;
        if (s3Endpoint != null && !s3Endpoint.isBlank()) {
            endpointUri = URI.create(s3Endpoint);
        } else {
            endpointUri = URI.create(String.format("https://%s.r2.cloudflarestorage.net", r2AccountId));
        }

        log.info("[AirVault Storage] Connecting to S3/R2 endpoint: {}", endpointUri);

        AwsBasicCredentials credentials = AwsBasicCredentials.create(s3AccessKey, s3SecretKey);

        S3Configuration s3Configuration = S3Configuration.builder()
                .pathStyleAccessEnabled(true) // Cloudflare R2 and S3-compatible endpoints require path-style access
                .checksumValidationEnabled(false)
                .build();

        return S3Client.builder()
                .endpointOverride(endpointUri)
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of(s3Region != null && !s3Region.isBlank() ? s3Region : "auto"))
                .serviceConfiguration(s3Configuration)
                .httpClientBuilder(ApacheHttpClient.builder()
                        .maxConnections(100)
                        .connectionTimeout(Duration.ofSeconds(10))
                        .socketTimeout(Duration.ofSeconds(60)))
                .build();
    }
}
