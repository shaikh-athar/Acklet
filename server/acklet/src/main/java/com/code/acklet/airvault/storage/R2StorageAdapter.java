package com.code.acklet.airvault.storage;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Cloudflare R2 / AWS S3 object storage implementation of {@link AirVaultStorageAdapter} using AWS SDK v2 S3 API.
 * <p>
 * This adapter is active when {@code airvault.storage.type=s3} or {@code STORAGE_BACKEND=r2}.
 * It communicates with Cloudflare R2 / AWS S3's S3-compatible API using the configured bucket, credentials, and endpoint.
 */
@Slf4j
public class R2StorageAdapter implements AirVaultStorageAdapter {

    private final S3Client s3Client;
    private final String bucketName;

    public R2StorageAdapter(S3Client s3Client, String bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        log.info("[AirVault S3/R2Storage] Initialized S3/R2 adapter for bucket: {}", bucketName);
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
            log.debug("[AirVault S3/R2Storage] Uploaded object '{}' ({} bytes) to bucket '{}'", key, contentLength, bucketName);
        } catch (S3Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ S3 error uploading '{}' to bucket '{}': {}", key, bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("S3/R2 storage upload failed for key " + key + ": " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ Unexpected error uploading '{}' to S3/R2: {}", key, e.getMessage());
            throw new IOException("S3/R2 storage upload error for key " + key + ": " + e.getMessage(), e);
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

            return s3Client.getObject(getRequest);
        } catch (NoSuchKeyException e) {
            throw new IOException("Object not found in S3/R2: " + key, e);
        } catch (S3Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ S3 error retrieving '{}' from bucket '{}': {}", key, bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("S3/R2 getObject failed for key " + key + ": " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ Unexpected error retrieving '{}' from S3/R2: {}", key, e.getMessage());
            throw new IOException("S3/R2 retrieval error for key " + key + ": " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream getRange(String objectKey, long start, long end) throws IOException {
        String key = cleanKey(objectKey);
        try {
            String rangeHeader = String.format("bytes=%d-%d", start, end);
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .range(rangeHeader)
                    .build();

            return s3Client.getObject(getRequest);
        } catch (NoSuchKeyException e) {
            throw new IOException("Object not found in S3/R2: " + key, e);
        } catch (S3Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ S3 error retrieving range for '{}' from bucket '{}': {}", key, bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("S3/R2 getRange failed for key " + key + ": " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ Unexpected error retrieving range for '{}' from S3/R2: {}", key, e.getMessage());
            throw new IOException("S3/R2 getRange error for key " + key + ": " + e.getMessage(), e);
        }
    }

    @Override
    public long getObjectSize(String objectKey) throws IOException {
        String key = cleanKey(objectKey);
        try {
            HeadObjectRequest headRequest = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            HeadObjectResponse resp = s3Client.headObject(headRequest);
            return resp.contentLength();
        } catch (NoSuchKeyException e) {
            throw new IOException("Object not found in S3/R2: " + key, e);
        } catch (S3Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ S3 error retrieving size for '{}' from bucket '{}': {}", key, bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("S3/R2 getObjectSize failed for key " + key + ": " + e.getMessage(), e);
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
            log.warn("[AirVault S3/R2Storage] HeadObject check warning for '{}': {}", key, e.awsErrorDetails().errorMessage());
            return false;
        } catch (Exception e) {
            log.warn("[AirVault S3/R2Storage] Unexpected error checking existence for '{}': {}", key, e.getMessage());
            return false;
        }
    }

    @Override
    public void deleteObject(String objectKey) throws IOException {
        String key = cleanKey(objectKey);
        try {
            // First check if this key might represent a prefix / directory in S3
            ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(key)
                    .build();
            ListObjectsV2Response listResp = s3Client.listObjectsV2(listReq);

            if (!listResp.contents().isEmpty()) {
                for (S3Object s3Obj : listResp.contents()) {
                    s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(s3Obj.key()).build());
                    log.debug("[AirVault S3/R2Storage] Deleted object '{}' under prefix '{}'", s3Obj.key(), key);
                }
            } else {
                DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build();
                s3Client.deleteObject(deleteRequest);
                log.debug("[AirVault S3/R2Storage] Deleted object '{}' from bucket '{}'", key, bucketName);
            }
        } catch (S3Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ S3 error deleting '{}' from bucket '{}': {}", key, bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("S3/R2 deleteObject failed for key " + key + ": " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ Unexpected error deleting '{}' from S3/R2: {}", key, e.getMessage());
            throw new IOException("S3/R2 delete error for key " + key + ": " + e.getMessage(), e);
        }
    }

    @Override
    public List<StorageObjectMetadata> listAll() throws IOException {
        List<StorageObjectMetadata> results = new ArrayList<>();
        try {
            ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .build();

            for (ListObjectsV2Response page : s3Client.listObjectsV2Paginator(listReq)) {
                for (S3Object s3Object : page.contents()) {
                    boolean isDir = s3Object.key().endsWith("/");
                    results.add(new StorageObjectMetadata(
                            s3Object.key(),
                            s3Object.size() != null ? s3Object.size() : 0L,
                            s3Object.lastModified() != null ? s3Object.lastModified() : Instant.now(),
                            isDir
                    ));
                }
            }
        } catch (S3Exception e) {
            log.error("[AirVault S3/R2Storage] ⛔ Error listing bucket contents for '{}': {}", bucketName, e.awsErrorDetails().errorMessage());
            throw new IOException("Failed to list objects in S3/R2 bucket " + bucketName + ": " + e.getMessage(), e);
        }
        return results;
    }

    @Override
    public String getProviderName() {
        return "S3";
    }

    public String getBucketName() {
        return bucketName;
    }
}
