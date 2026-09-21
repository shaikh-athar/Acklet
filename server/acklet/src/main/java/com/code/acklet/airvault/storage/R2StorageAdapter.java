package com.code.acklet.airvault.storage;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.io.InputStream;

/**
 * Cloudflare R2 object storage implementation of {@link AirVaultStorageAdapter} using AWS SDK v2 S3 API.
 * <p>
 * This adapter is active when {@code STORAGE_BACKEND=r2} (the production deployment mode).
 * It communicates with Cloudflare R2's S3-compatible API using the configured bucket and credentials.
 * <p>
 * Switching between {@code LocalStorageAdapter} and {@code R2StorageAdapter} requires no code changes —
 * only changing the {@code STORAGE_BACKEND} environment variable from {@code local} to {@code r2}.
 */
@Slf4j
public class R2StorageAdapter implements AirVaultStorageAdapter {

    private final S3Client s3Client;
    private final String bucketName;

    public R2StorageAdapter(S3Client s3Client, String bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        log.info("[AirVault R2Storage] Initialized R2 adapter for bucket: {}", bucketName);
    }

    private String cleanKey(String objectKey) {
        return objectKey.replaceFirst("^[/\\\\]+", "");
    }

    @Override
    public void storeObject(String objectKey, InputStream inputStream, long contentLength, String contentType) throws IOException {
        String key = cleanKey(objectKey);
        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentLength(contentLength)
                    .contentType(contentType != null ? contentType : "application/octet-stream")
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(inputStream, contentLength));
            log.debug("[AirVault R2Storage] Uploaded object '{}' ({} bytes) to R2 bucket '{}'", key, contentLength, bucketName);
        } catch (S3Exception e) {
            log.error("[AirVault R2Storage] ⛔ S3 error uploading '{}' to bucket '{}': {}", key, bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("R2 storage upload failed for key " + key + ": " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AirVault R2Storage] ⛔ Unexpected error uploading '{}' to R2: {}", key, e.getMessage());
            throw new IOException("R2 storage upload error for key " + key + ": " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream getObject(String objectKey) throws IOException {
        String key = cleanKey(objectKey);
        try {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            ResponseInputStream<GetObjectResponse> s3Stream = s3Client.getObject(getRequest);
            return s3Stream;
        } catch (NoSuchKeyException e) {
            throw new IOException("Object not found in R2: " + key, e);
        } catch (S3Exception e) {
            log.error("[AirVault R2Storage] ⛔ S3 error retrieving '{}' from bucket '{}': {}", key, bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("R2 getObject failed for key " + key + ": " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AirVault R2Storage] ⛔ Unexpected error retrieving '{}' from R2: {}", key, e.getMessage());
            throw new IOException("R2 retrieval error for key " + key + ": " + e.getMessage(), e);
        }
    }

    @Override
    public boolean exists(String objectKey) {
        String key = cleanKey(objectKey);
        try {
            HeadObjectRequest headRequest = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            s3Client.headObject(headRequest);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return false;
            }
            log.warn("[AirVault R2Storage] HeadObject check warning for '{}': {}", key, e.awsErrorDetails().errorMessage());
            return false;
        } catch (Exception e) {
            log.warn("[AirVault R2Storage] Unexpected error checking existence for '{}': {}", key, e.getMessage());
            return false;
        }
    }

    @Override
    public void deleteObject(String objectKey) throws IOException {
        String key = cleanKey(objectKey);
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            s3Client.deleteObject(deleteRequest);
            log.debug("[AirVault R2Storage] Deleted object '{}' from R2 bucket '{}'", key, bucketName);
        } catch (S3Exception e) {
            log.error("[AirVault R2Storage] ⛔ S3 error deleting '{}' from bucket '{}': {}", key, bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("R2 deleteObject failed for key " + key + ": " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AirVault R2Storage] ⛔ Unexpected error deleting '{}' from R2: {}", key, e.getMessage());
            throw new IOException("R2 delete error for key " + key + ": " + e.getMessage(), e);
        }
    }

    @Override
    public String getProviderName() {
        return "R2";
    }

    public String getBucketName() {
        return bucketName;
    }
}
