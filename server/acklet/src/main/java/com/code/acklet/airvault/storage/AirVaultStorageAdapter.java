package com.code.acklet.airvault.storage;

import java.io.IOException;
import java.io.InputStream;

/**
 * Storage Abstraction Layer for AirVault.
 * <p>
 * Decouples AirVault business logic from underlying physical storage mechanisms.
 * Implementations provide uniform support for:
 * <ul>
 *   <li>{@link LocalStorageAdapter}: Local disk storage (active during local development)</li>
 *   <li>{@link R2StorageAdapter}: Cloudflare R2 object storage via S3 API (active in deployment)</li>
 * </ul>
 * <p>
 * Selection is controlled by the server-side {@code STORAGE_BACKEND} environment variable.
 */
public interface AirVaultStorageAdapter {

    /**
     * Store a file / binary object under the given object key.
     *
     * @param objectKey     unique storage key (e.g., content-hash based path like "files/abcd123.bin")
     * @param inputStream   stream of content to write
     * @param contentLength size in bytes of the content
     * @param contentType   MIME type of the content (e.g., "application/octet-stream")
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
     * Checks if the object exists in the backend storage.
     *
     * @param objectKey storage key
     * @return true if object exists, false otherwise
     */
    boolean exists(String objectKey);

    /**
     * Permanently deletes an object from backend storage.
     *
     * @param objectKey storage key
     * @throws IOException if deletion fails
     */
    void deleteObject(String objectKey) throws IOException;

    /**
     * Returns the human-readable identifier of the active storage provider ("LOCAL" or "R2").
     */
    String getProviderName();
}
