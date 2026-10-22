package com.code.acklet.tool.tools.qr.storage;

import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.tools.qr.config.QrProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocalDiskQrStorageService implements QrStorageService {

    private final QrProperties properties;
    private Path rootDir;

    @PostConstruct
    public void init() {
        try {
            this.rootDir = Path.of(properties.getStorageDir()).toAbsolutePath().normalize();
            Files.createDirectories(this.rootDir);
            log.info("[QrStorage] Initialized QR local disk storage at: {}", this.rootDir);
        } catch (IOException e) {
            log.error("[QrStorage] Failed to initialize QR storage directory: {}", e.getMessage(), e);
            throw new IllegalStateException("Could not create QR storage directory", e);
        }
    }

    @Override
    public StoredAsset store(String qrCode, String originalFilename, String contentType, InputStream inputStream, long sizeBytes) {
        if (sizeBytes > properties.getMaxAssetSizeBytes()) {
            throw new BadRequestException("Asset exceeds maximum allowed size of " + (properties.getMaxAssetSizeBytes() / (1024 * 1024)) + "MB");
        }

        if (qrCode == null || qrCode.contains("..") || qrCode.isBlank()) {
            throw new BadRequestException("Invalid QR code identifier");
        }

        String safeCode = sanitizeSlug(qrCode);
        Path codeDir = rootDir.resolve(safeCode).normalize();
        if (!codeDir.startsWith(rootDir)) {
            throw new BadRequestException("Invalid QR code storage path");
        }

        try {
            Files.createDirectories(codeDir);
            String assetId = UUID.randomUUID().toString();
            String cleanName = sanitizeFilename(originalFilename);
            String targetFileName = assetId + "_" + cleanName;
            Path targetPath = codeDir.resolve(targetFileName).normalize();

            MessageDigest md = MessageDigest.getInstance("SHA-256");
            long writtenBytes;
            try (DigestInputStream dis = new DigestInputStream(inputStream, md)) {
                writtenBytes = Files.copy(dis, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String contentHash = HexFormat.of().formatHex(md.digest());
            String relativeStoragePath = safeCode + "/" + targetFileName;

            return new StoredAsset(
                    assetId,
                    relativeStoragePath,
                    cleanName,
                    contentType != null ? contentType : "application/octet-stream",
                    writtenBytes,
                    contentHash
            );
        } catch (IOException | NoSuchAlgorithmException e) {
            log.error("[QrStorage] Failed to save asset for qr {}: {}", qrCode, e.getMessage(), e);
            throw new RuntimeException("Failed to store QR asset", e);
        }
    }

    @Override
    public Resource load(String storagePath) {
        try {
            Path file = rootDir.resolve(storagePath).normalize();
            if (!file.startsWith(rootDir) || !Files.exists(file)) {
                throw new ResourceNotFoundException("Asset not found: " + storagePath);
            }
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new ResourceNotFoundException("Asset file not readable: " + storagePath);
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Invalid asset storage path: " + storagePath);
        }
    }

    @Override
    public void delete(String storagePath) {
        try {
            Path file = rootDir.resolve(storagePath).normalize();
            if (file.startsWith(rootDir)) {
                Files.deleteIfExists(file);
            }
        } catch (IOException e) {
            log.warn("[QrStorage] Could not delete file {}: {}", storagePath, e.getMessage());
        }
    }

    @Override
    public boolean exists(String storagePath) {
        Path file = rootDir.resolve(storagePath).normalize();
        return file.startsWith(rootDir) && Files.exists(file);
    }

    private String sanitizeSlug(String slug) {
        if (slug == null) return "general";
        return slug.replaceAll("[^a-zA-Z0-9_-]", "");
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) return "asset.bin";
        String clean = Paths.get(filename).getFileName().toString();
        clean = clean.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.length() > 100 ? clean.substring(clean.length() - 100) : clean;
    }
}
