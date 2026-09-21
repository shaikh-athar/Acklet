package com.code.acklet.airvault.storage;

import lombok.extern.slf4j.Slf4j;

import java.io.*;
import java.nio.file.*;

/**
 * Local filesystem implementation of {@link AirVaultStorageAdapter}.
 * <p>
 * This adapter is active when {@code STORAGE_BACKEND=local} (the default during development).
 * It preserves existing local disk storage behavior in {@code java.io.tmpdir/acklet_airvault_uploads},
 * requiring zero network calls and zero cloud credentials.
 */
@Slf4j
public class LocalStorageAdapter implements AirVaultStorageAdapter {

    private final Path rootStorageDir;

    public LocalStorageAdapter(Path rootStorageDir) {
        this.rootStorageDir = rootStorageDir;
        initStorage();
    }

    private void initStorage() {
        try {
            if (!Files.exists(rootStorageDir)) {
                Files.createDirectories(rootStorageDir);
            }
        } catch (IOException e) {
            log.error("[AirVault LocalStorage] Failed to initialize root directory {}: {}", rootStorageDir, e.getMessage());
        }
    }

    private Path resolvePath(String objectKey) {
        // Strip leading slashes to prevent absolute path traversal outside storage root
        String cleanKey = objectKey.replaceFirst("^[/\\\\]+", "");
        return rootStorageDir.resolve(cleanKey).normalize();
    }

    @Override
    public void storeObject(String objectKey, InputStream inputStream, long contentLength, String contentType) throws IOException {
        Path target = resolvePath(objectKey);
        Path parent = target.getParent();
        if (parent != null && !Files.exists(parent)) {
            Files.createDirectories(parent);
        }

        try (OutputStream out = Files.newOutputStream(target,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
             BufferedOutputStream bufOut = new BufferedOutputStream(out)) {
            byte[] buffer = new byte[65536];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                bufOut.write(buffer, 0, bytesRead);
            }
            bufOut.flush();
        }
        log.debug("[AirVault LocalStorage] Stored object '{}' ({} bytes) at {}", objectKey, contentLength, target);
    }

    @Override
    public InputStream getObject(String objectKey) throws IOException {
        Path target = resolvePath(objectKey);
        if (!Files.exists(target)) {
            throw new FileNotFoundException("Local file not found for key: " + objectKey);
        }
        return new BufferedInputStream(Files.newInputStream(target));
    }

    @Override
    public boolean exists(String objectKey) {
        return Files.exists(resolvePath(objectKey));
    }

    @Override
    public void deleteObject(String objectKey) throws IOException {
        Path target = resolvePath(objectKey);
        boolean deleted = Files.deleteIfExists(target);
        if (deleted) {
            log.debug("[AirVault LocalStorage] Deleted local object: {}", objectKey);
        }
    }

    @Override
    public String getProviderName() {
        return "LOCAL";
    }

    public Path getRootStorageDir() {
        return rootStorageDir;
    }
}
