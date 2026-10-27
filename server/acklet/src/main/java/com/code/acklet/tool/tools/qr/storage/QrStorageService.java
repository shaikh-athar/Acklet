package com.code.acklet.tool.tools.qr.storage;

import org.springframework.core.io.Resource;

import java.io.InputStream;

public interface QrStorageService {

    record StoredAsset(
            String id,
            String storagePath,
            String fileName,
            String detectedMime,
            long sizeBytes,
            String contentHash
    ) {}

    StoredAsset store(String qrCode, String originalFilename, String contentType, InputStream inputStream, long sizeBytes);

    Resource load(String storagePath);

    void delete(String storagePath);

    boolean exists(String storagePath);
}
