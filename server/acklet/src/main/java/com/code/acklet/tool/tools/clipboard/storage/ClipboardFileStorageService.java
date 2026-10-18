package com.code.acklet.tool.tools.clipboard.storage;

import jakarta.annotation.PostConstruct;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.Set;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClipboardFileStorageService {

    private final ClipboardStorageProperties properties;

    private Path blobsDir;
    private Path chunksDir;

    private static final Set<String> COMPRESSIBLE_EXTENSIONS = Set.of(
            "txt", "json", "xml", "csv", "tsv", "html", "htm", "css", "js", "ts",
            "md", "markdown", "log", "svg", "sql", "yaml", "yml", "toml", "ini", "sh", "env"
    );

    @Data
    @Builder
    public static class StorageResult {
        private String storagePath;
        private String contentHash;
        private long originalSizeBytes;
        private long storedSizeBytes;
        private boolean isCompressed;
    }

    @PostConstruct
    public void init() {
        try {
            Path root = Path.of(properties.getStorageDir()).toAbsolutePath().normalize();
            this.blobsDir = root.resolve("blobs");
            this.chunksDir = root.resolve("chunks");
            Files.createDirectories(blobsDir);
            Files.createDirectories(chunksDir);
            log.info("[ClipboardStorage] Initialized storage root at: {}", root);
        } catch (IOException e) {
            log.error("[ClipboardStorage] Failed to initialize storage directories: {}", e.getMessage(), e);
            throw new IllegalStateException("Could not create storage directories", e);
        }
    }

    public boolean isCompressible(String filename, String mimeType) {
        if (filename != null) {
            int dot = filename.lastIndexOf('.');
            if (dot >= 0 && dot < filename.length() - 1) {
                String ext = filename.substring(dot + 1).toLowerCase();
                if (COMPRESSIBLE_EXTENSIONS.contains(ext)) {
                    return true;
                }
            }
        }
        if (mimeType != null) {
            String mime = mimeType.toLowerCase();
            return mime.startsWith("text/")
                    || mime.equals("application/json")
                    || mime.equals("application/xml")
                    || mime.equals("image/svg+xml")
                    || mime.equals("application/javascript");
        }
        return false;
    }

    public StorageResult storeDirectFile(String originalName, byte[] bytes, String contentType, boolean isImage, String providedHash) throws IOException {
        String hash = (providedHash != null && !providedHash.isBlank()) ? providedHash.toLowerCase() : computeSha256(bytes);
        boolean compress = isCompressible(originalName, contentType);

        String blobFileName = hash + (compress ? ".gz" : ".dat");
        Path blobPath = blobsDir.resolve(blobFileName);

        long storedSize;
        if (Files.exists(blobPath)) {
            // Deduplication: File blob already exists on disk
            storedSize = Files.size(blobPath);
            log.debug("[ClipboardStorage] Deduplicated existing blob: {}", blobFileName);
        } else {
            if (compress) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                try (GZIPOutputStream gzos = new GZIPOutputStream(baos)) {
                    gzos.write(bytes);
                }
                byte[] compressedBytes = baos.toByteArray();
                // Only keep compressed version if it actually reduced file size
                if (compressedBytes.length < bytes.length) {
                    Files.write(blobPath, compressedBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                    storedSize = compressedBytes.length;
                } else {
                    compress = false;
                    blobFileName = hash + ".dat";
                    blobPath = blobsDir.resolve(blobFileName);
                    Files.write(blobPath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                    storedSize = bytes.length;
                }
            } else {
                Files.write(blobPath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                storedSize = bytes.length;
            }
        }

        return StorageResult.builder()
                .storagePath("blobs/" + blobFileName)
                .contentHash(hash)
                .originalSizeBytes(bytes.length)
                .storedSizeBytes(storedSize)
                .isCompressed(compress)
                .build();
    }

    public void storeChunk(String uploadId, int chunkNumber, byte[] chunkBytes) throws IOException {
        Path sessionDir = chunksDir.resolve(uploadId);
        Files.createDirectories(sessionDir);
        Path partFile = sessionDir.resolve("part_" + chunkNumber);
        Files.write(partFile, chunkBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    }

    public StorageResult assembleChunks(String uploadId, int totalChunks, String originalName, String contentType, String expectedHash) throws IOException {
        Path sessionDir = chunksDir.resolve(uploadId);
        if (!Files.exists(sessionDir)) {
            throw new FileNotFoundException("Chunk session directory not found for upload ID: " + uploadId);
        }

        // Verify all parts exist
        for (int i = 0; i < totalChunks; i++) {
            Path part = sessionDir.resolve("part_" + i);
            if (!Files.exists(part)) {
                throw new IllegalStateException("Missing chunk part " + i + " for upload: " + uploadId);
            }
        }

        // Create temporary assembled file and compute hash streaming
        Path tempAssembled = sessionDir.resolve("assembled.tmp");
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 digest unavailable", e);
        }

        long uncompressedSize = 0;
        try (OutputStream fos = Files.newOutputStream(tempAssembled, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
            for (int i = 0; i < totalChunks; i++) {
                Path part = sessionDir.resolve("part_" + i);
                try (InputStream fis = Files.newInputStream(part)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = fis.read(buffer)) != -1) {
                        digest.update(buffer, 0, read);
                        fos.write(buffer, 0, read);
                        uncompressedSize += read;
                    }
                }
            }
        }

        String calculatedHash = HexFormat.of().formatHex(digest.digest()).toLowerCase();
        if (expectedHash != null && !expectedHash.isBlank() && !expectedHash.equalsIgnoreCase(calculatedHash)) {
            Files.deleteIfExists(tempAssembled);
            throw new IllegalStateException("Integrity checksum mismatch for uploaded file");
        }

        boolean compress = isCompressible(originalName, contentType);
        String blobFileName = calculatedHash + (compress ? ".gz" : ".dat");
        Path finalBlobPath = blobsDir.resolve(blobFileName);

        long storedSize;
        if (Files.exists(finalBlobPath)) {
            // Deduplicated
            storedSize = Files.size(finalBlobPath);
            Files.deleteIfExists(tempAssembled);
        } else {
            if (compress) {
                Path tempCompressed = sessionDir.resolve("compressed.tmp");
                try (InputStream is = Files.newInputStream(tempAssembled);
                     OutputStream os = Files.newOutputStream(tempCompressed, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                     GZIPOutputStream gzos = new GZIPOutputStream(os)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = is.read(buffer)) != -1) {
                        gzos.write(buffer, 0, read);
                    }
                }
                long compressedLen = Files.size(tempCompressed);
                if (compressedLen < uncompressedSize) {
                    Files.move(tempCompressed, finalBlobPath, StandardCopyOption.REPLACE_EXISTING);
                    Files.deleteIfExists(tempAssembled);
                    storedSize = compressedLen;
                } else {
                    compress = false;
                    blobFileName = calculatedHash + ".dat";
                    finalBlobPath = blobsDir.resolve(blobFileName);
                    Files.move(tempAssembled, finalBlobPath, StandardCopyOption.REPLACE_EXISTING);
                    Files.deleteIfExists(tempCompressed);
                    storedSize = uncompressedSize;
                }
            } else {
                Files.move(tempAssembled, finalBlobPath, StandardCopyOption.REPLACE_EXISTING);
                storedSize = uncompressedSize;
            }
        }

        // Clean up temporary session directory
        deleteDirectoryRecursively(sessionDir);

        return StorageResult.builder()
                .storagePath("blobs/" + blobFileName)
                .contentHash(calculatedHash)
                .originalSizeBytes(uncompressedSize)
                .storedSizeBytes(storedSize)
                .isCompressed(compress)
                .build();
    }

    public InputStream getFileStream(String storagePath, boolean isCompressed) throws IOException {
        Path file = Path.of(properties.getStorageDir()).resolve(storagePath).normalize();
        if (!Files.exists(file)) {
            throw new FileNotFoundException("Blob file not found: " + storagePath);
        }
        InputStream raw = Files.newInputStream(file);
        return isCompressed ? new GZIPInputStream(raw) : raw;
    }

    public byte[] readByteRange(String storagePath, boolean isCompressed, long start, long end, long totalSize) throws IOException {
        if (start < 0 || end < start || end >= totalSize) {
            throw new IllegalArgumentException("Invalid range: " + start + "-" + end + " (total " + totalSize + ")");
        }
        int rangeLength = (int) (end - start + 1);
        byte[] result = new byte[rangeLength];

        Path file = Path.of(properties.getStorageDir()).resolve(storagePath).normalize();
        if (!Files.exists(file)) {
            throw new FileNotFoundException("Blob file not found: " + storagePath);
        }

        if (!isCompressed) {
            try (RandomAccessFile raf = new RandomAccessFile(file.toFile(), "r")) {
                raf.seek(start);
                raf.readFully(result);
            }
            return result;
        }

        // For compressed at rest, stream uncompressed bytes up to range
        try (InputStream is = new GZIPInputStream(Files.newInputStream(file))) {
            long skipped = 0;
            while (skipped < start) {
                long s = is.skip(start - skipped);
                if (s <= 0) {
                    if (is.read() == -1) break;
                    s = 1;
                }
                skipped += s;
            }
            int totalRead = 0;
            while (totalRead < rangeLength) {
                int read = is.read(result, totalRead, rangeLength - totalRead);
                if (read == -1) break;
                totalRead += read;
            }
        }
        return result;
    }

    public void deleteChunkSession(String uploadId) {
        Path sessionDir = chunksDir.resolve(uploadId);
        if (Files.exists(sessionDir)) {
            try {
                deleteDirectoryRecursively(sessionDir);
                log.info("[ClipboardStorage] Deleted chunk session directory: {}", uploadId);
            } catch (IOException e) {
                log.warn("[ClipboardStorage] Could not delete chunk session {}: {}", uploadId, e.getMessage());
            }
        }
    }

    public void deleteBlobIfOrphaned(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) return;
        Path file = Path.of(properties.getStorageDir()).resolve(storagePath).normalize();
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("[ClipboardStorage] Failed to delete blob: {}", storagePath, e);
        }
    }

    private void deleteDirectoryRecursively(Path dir) throws IOException {
        if (!Files.exists(dir)) return;
        try (var stream = Files.walk(dir)) {
            stream.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ignored) {}
                    });
        }
    }

    private String computeSha256(byte[] bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(bytes)).toLowerCase();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }
}
