package com.code.acklet.airvault.storage;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;

/**
 * Storage Abstraction Layer for AirVault.
 * <p>
 * Decouples AirVault business logic from underlying physical storage mechanisms.
 * Implementations provide uniform support for:
 * <ul>
 *   <li>{@link LocalStorageAdapter}: Local disk storage (active during local development)</li>
 *   <li>{@link R2StorageAdapter}: Cloudflare R2 / AWS S3 object storage via S3 API (active in deployment)</li>
 * </ul>
 * <p>
 * Selection is controlled by the server-side {@code airvault.storage.type} (or {@code STORAGE_BACKEND}) environment variable.
 */
public interface AirVaultStorageAdapter {

    /**
     * Storage Object Metadata returned by {@link #listAll()}.
     */
    record StorageObjectMetadata(String objectKey, long sizeBytes, Instant lastModified, boolean isDirectory) {}

    /**
     * Store a file / binary object under the given object key.
     *
     * @param objectKey     unique storage key (e.g., "files/abcd123.mp4")
     * @param inputStream   stream of content to write
     * @param contentLength size in bytes of the content
     * @param contentType   MIME type of the content (e.g., "video/mp4", "application/octet-stream")
     * @throws IOException if storage fails
     */
    void storeObject(String objectKey, InputStream inputStream, long contentLength, String contentType) throws IOException;

    /**
     * Retrieve an input stream of the stored object.
     *
     * @param objectKey storage key
     * @return readable InputStream of the object content
     * @throws IOException if retrieval fails or object not found
     */
    InputStream getObject(String objectKey) throws IOException;

    /**
     * Retrieve a bounded byte-range input stream of the stored object (RFC 7233).
     *
     * @param objectKey storage key
     * @param start     start byte offset (inclusive)
     * @param end       end byte offset (inclusive)
     * @return readable InputStream containing exactly bytes [start, end]
     * @throws IOException if retrieval fails or object not found
     */
    InputStream getRange(String objectKey, long start, long end) throws IOException;

    /**
     * Get the exact byte length of a stored object.
     *
     * @param objectKey storage key
     * @return size in bytes
     * @throws IOException if object not found or size check fails
     */
    long getObjectSize(String objectKey) throws IOException;

    /**
     * Checks if the object exists in the backend storage.
     *
     * @param objectKey storage key
     * @return true if object exists, false otherwise
     */
    boolean exists(String objectKey);

    /**
     * Permanently deletes an object or directory from backend storage.
     *
     * @param objectKey storage key
     * @throws IOException if deletion fails
     */
    void deleteObject(String objectKey) throws IOException;

    /**
     * List all objects and directories currently present in storage.
     *
     * @return list of metadata for all objects
     * @throws IOException if listing fails
     */
    List<StorageObjectMetadata> listAll() throws IOException;

    /**
     * Returns the human-readable identifier of the active storage provider ("LOCAL", "S3", or "R2").
     */
    String getProviderName();
}
