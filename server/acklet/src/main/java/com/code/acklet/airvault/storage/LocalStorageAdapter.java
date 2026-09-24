package com.code.acklet.airvault.storage;

import lombok.extern.slf4j.Slf4j;

import java.io.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Local filesystem implementation of {@link AirVaultStorageAdapter}.
 * <p>
 * This adapter is active when {@code airvault.storage.type=local} (or {@code STORAGE_BACKEND=local}, default during development).
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
    public InputStream getRange(String objectKey, long start, long end) throws IOException {
        Path target = resolvePath(objectKey);
        if (!Files.exists(target)) {
            throw new FileNotFoundException("Local file not found for key: " + objectKey);
        }

        long fileLength = Files.size(target);
        if (start < 0 || start >= fileLength || end < start) {
            throw new IllegalArgumentException("Invalid range: " + start + "-" + end + " for file of length " + fileLength);
        }

        long boundedEnd = Math.min(end, fileLength - 1);
        long rangeLength = boundedEnd - start + 1;

        RandomAccessFile raf = new RandomAccessFile(target.toFile(), "r");
        raf.seek(start);

        return new InputStream() {
            private long remaining = rangeLength;

            @Override
            public int read() throws IOException {
                if (remaining <= 0) {
                    return -1;
                }
                int b = raf.read();
                if (b != -1) {
                    remaining--;
                }
                return b;
            }

            @Override
            public int read(byte[] b, int off, int len) throws IOException {
                if (remaining <= 0) {
                    return -1;
                }
                int toRead = (int) Math.min(len, remaining);
                int read = raf.read(b, off, toRead);
                if (read != -1) {
                    remaining -= read;
                }
                return read;
            }

            @Override
            public void close() throws IOException {
                raf.close();
            }
        };
    }

    @Override
    public long getObjectSize(String objectKey) throws IOException {
        Path target = resolvePath(objectKey);
        if (!Files.exists(target)) {
            throw new FileNotFoundException("Local file not found for key: " + objectKey);
        }
        return Files.size(target);
    }

    @Override
    public boolean exists(String objectKey) {
        return Files.exists(resolvePath(objectKey));
    }

    @Override
    public void deleteObject(String objectKey) throws IOException {
        Path target = resolvePath(objectKey);
        if (!Files.exists(target)) {
            return;
        }

        if (Files.isDirectory(target)) {
            try (var stream = Files.walk(target)) {
                stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException ignored) {}
                });
            }
            log.debug("[AirVault LocalStorage] Deleted local directory: {}", objectKey);
        } else {
            boolean deleted = Files.deleteIfExists(target);
            if (deleted) {
                log.debug("[AirVault LocalStorage] Deleted local object: {}", objectKey);
            }
        }
    }

    @Override
    public List<StorageObjectMetadata> listAll() throws IOException {
        List<StorageObjectMetadata> results = new ArrayList<>();
        if (!Files.exists(rootStorageDir)) {
            return results;
        }

        try (var stream = Files.walk(rootStorageDir)) {
            stream.filter(p -> !p.equals(rootStorageDir)).forEach(p -> {
                try {
                    String relativeKey = rootStorageDir.relativize(p).toString().replace('\\', '/');
                    boolean isDir = Files.isDirectory(p);
                    long size = isDir ? 0L : Files.size(p);
                    Instant lastModified = Files.getLastModifiedTime(p).toInstant();
                    results.add(new StorageObjectMetadata(relativeKey, size, lastModified, isDir));
                } catch (IOException e) {
                    log.warn("[AirVault LocalStorage] Could not read metadata for path {}: {}", p, e.getMessage());
                }
            });
        }
        return results;
    }

    @Override
    public String getProviderName() {
        return "LOCAL";
    }

    public Path getRootStorageDir() {
        return rootStorageDir;
    }
}
