package com.code.acklet.airvault.service;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * High-Performance Bounded LRU Cache for Decompressed File Streams.
 * <p>
 * Keyed by content hash ({@code checksum}) so deduplicated files across all users
 * benefit from a single decompressed cached representation.
 * <p>
 * <b>Features:</b>
 * <ul>
 *   <li><b>Cache Stampede Protection</b>: Concurrent requests for the same file wait on a per-key lock.</li>
 *   <li><b>Configurable TTL</b>: Evicts entries after configurable expiration (default 15 minutes).</li>
 *   <li><b>Size Bounded (LRU)</b>: Evicts oldest accessed files when max cache bytes (500 MB) is reached.</li>
 *   <li><b>Automatic Invalidation</b>: Cleans cached files immediately upon deletion/reset.</li>
 * </ul>
 */
@Component
@Slf4j
public class AirVaultDecompressedFileCache {

    public static final long DEFAULT_TTL_MS = 15L * 60L * 1000L; // 15 Minutes
    public static final long MAX_CACHE_CAPACITY_BYTES = 500L * 1024L * 1024L; // 500 MB Disk Budget

    @Getter
    @Builder
    public static class CacheEntry {
        private final String checksum;
        private final Path decompressedPath;
        private final long byteSize;
        private long lastAccessedAt;
        private final long expiresAt;
    }

    private final Map<String, CacheEntry> cacheMap = new ConcurrentHashMap<>();
    private final Map<String, ReentrantLock> keyLocks = new ConcurrentHashMap<>();
    private final Path cacheDir;
    private long currentCacheBytes = 0;

    public AirVaultDecompressedFileCache() {
        this.cacheDir = Paths.get(System.getProperty("java.io.tmpdir"), "acklet_airvault_decompressed_cache");
        try {
            if (!Files.exists(cacheDir)) {
                Files.createDirectories(cacheDir);
            }
        } catch (IOException e) {
            log.error("[AirVault FileCache] Failed to initialize cache directory: {}", e.getMessage());
        }
    }

    /**
     * Retrieves or produces a decompressed file stream with concurrency stampede protection.
     */
    public InputStream getOrDecompress(String checksum, DecompressionSupplier supplier) throws IOException {
        long now = System.currentTimeMillis();

        // 1. Fast path: check active cache
        CacheEntry entry = cacheMap.get(checksum);
        if (entry != null) {
            if (now < entry.getExpiresAt() && Files.exists(entry.getDecompressedPath())) {
                synchronized (this) {
                    entry.lastAccessedAt = now;
                }
                log.debug("[AirVault FileCache] ⚡ Cache HIT for checksum: {}", checksum);
                return Files.newInputStream(entry.getDecompressedPath());
            } else {
                // Expired or missing file
                evict(checksum);
            }
        }

        // 2. Slow path: Acquire per-key lock to prevent stampede
        ReentrantLock lock = keyLocks.computeIfAbsent(checksum, k -> new ReentrantLock());
        lock.lock();
        try {
            // Re-check cache after acquiring lock
            entry = cacheMap.get(checksum);
            if (entry != null && now < entry.getExpiresAt() && Files.exists(entry.getDecompressedPath())) {
                synchronized (this) {
                    entry.lastAccessedAt = now;
                }
                log.debug("[AirVault FileCache] ⚡ Cache HIT after lock for checksum: {}", checksum);
                return Files.newInputStream(entry.getDecompressedPath());
            }

            log.info("[AirVault FileCache] 🔄 Cache MISS for checksum: {}. Executing streaming decompression...", checksum);
            Path targetFile = cacheDir.resolve(checksum + ".decompressed");

            // Execute decompression supplier to disk
            long writtenBytes = supplier.decompressTo(targetFile);

            // Evict if cache capacity exceeded
            synchronized (this) {
                while (currentCacheBytes + writtenBytes > MAX_CACHE_CAPACITY_BYTES && !cacheMap.isEmpty()) {
                    evictOldestLru();
                }

                CacheEntry newEntry = CacheEntry.builder()
                        .checksum(checksum)
                        .decompressedPath(targetFile)
                        .byteSize(writtenBytes)
                        .lastAccessedAt(now)
                        .expiresAt(now + DEFAULT_TTL_MS)
                        .build();

                cacheMap.put(checksum, newEntry);
                currentCacheBytes += writtenBytes;
            }

            log.info("[AirVault FileCache] ✅ Cached decompressed file for checksum: {} ({} bytes)", checksum, writtenBytes);
            return Files.newInputStream(targetFile);

        } finally {
            lock.unlock();
            keyLocks.remove(checksum);
        }
    }

    /**
     * Retrieves or produces a decompressed file Path for random-access and HTTP Byte-Range streaming.
     */
    public Path getOrDecompressPath(String checksum, DecompressionSupplier supplier) throws IOException {
        long now = System.currentTimeMillis();

        // 1. Fast path: check active cache
        CacheEntry entry = cacheMap.get(checksum);
        if (entry != null) {
            if (now < entry.getExpiresAt() && Files.exists(entry.getDecompressedPath())) {
                synchronized (this) {
                    entry.lastAccessedAt = now;
                }
                log.debug("[AirVault FileCache] ⚡ Cache HIT (path) for checksum: {}", checksum);
                return entry.getDecompressedPath();
            } else {
                evict(checksum);
            }
        }

        // 2. Slow path: Acquire per-key lock to prevent stampede
        ReentrantLock lock = keyLocks.computeIfAbsent(checksum, k -> new ReentrantLock());
        lock.lock();
        try {
            entry = cacheMap.get(checksum);
            if (entry != null && now < entry.getExpiresAt() && Files.exists(entry.getDecompressedPath())) {
                synchronized (this) {
                    entry.lastAccessedAt = now;
                }
                log.debug("[AirVault FileCache] ⚡ Cache HIT after lock (path) for checksum: {}", checksum);
                return entry.getDecompressedPath();
            }

            log.info("[AirVault FileCache] 🔄 Cache MISS (path) for checksum: {}. Executing streaming decompression...", checksum);
            Path targetFile = cacheDir.resolve(checksum + ".decompressed");

            long writtenBytes = supplier.decompressTo(targetFile);

            synchronized (this) {
                while (currentCacheBytes + writtenBytes > MAX_CACHE_CAPACITY_BYTES && !cacheMap.isEmpty()) {
                    evictOldestLru();
                }

                CacheEntry newEntry = CacheEntry.builder()
                        .checksum(checksum)
                        .decompressedPath(targetFile)
                        .byteSize(writtenBytes)
                        .lastAccessedAt(now)
                        .expiresAt(now + DEFAULT_TTL_MS)
                        .build();

                cacheMap.put(checksum, newEntry);
                currentCacheBytes += writtenBytes;
            }

            log.info("[AirVault FileCache] ✅ Cached decompressed file path for checksum: {} ({} bytes)", checksum, writtenBytes);
            return targetFile;

        } finally {
            lock.unlock();
            keyLocks.remove(checksum);
        }
    }

    /**
     * Invalidate entry for a given checksum (e.g., when file is deleted or modified).
     */
    public synchronized void evict(String checksum) {
        CacheEntry removed = cacheMap.remove(checksum);
        if (removed != null) {
            try {
                Files.deleteIfExists(removed.getDecompressedPath());
                currentCacheBytes = Math.max(0, currentCacheBytes - removed.getByteSize());
                log.debug("[AirVault FileCache] Evicted cached file: {}", checksum);
            } catch (IOException ignored) {}
        }
    }

    /**
     * Clear all cached files.
     */
    public synchronized void clearAll() {
        for (String checksum : new ArrayList<>(cacheMap.keySet())) {
            evict(checksum);
        }
        cacheMap.clear();
        currentCacheBytes = 0;
    }

    private synchronized void evictOldestLru() {
        String oldestKey = null;
        long oldestAccess = Long.MAX_VALUE;

        for (Map.Entry<String, CacheEntry> e : cacheMap.entrySet()) {
            if (e.getValue().getLastAccessedAt() < oldestAccess) {
                oldestAccess = e.getValue().getLastAccessedAt();
                oldestKey = e.getKey();
            }
        }

        if (oldestKey != null) {
            log.debug("[AirVault FileCache] Evicting LRU entry: {}", oldestKey);
            evict(oldestKey);
        }
    }

    @FunctionalInterface
    public interface DecompressionSupplier {
        long decompressTo(Path destination) throws IOException;
    }
}
