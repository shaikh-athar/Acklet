package com.code.acklet.tool.tools.qr;

import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.storage.LocalDiskQrStorageService;
import com.code.acklet.tool.tools.qr.storage.QrStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class LocalDiskQrStorageServiceTest {

    @TempDir
    Path tempStorageDir;

    private QrProperties properties;
    private LocalDiskQrStorageService storageService;

    @BeforeEach
    void setUp() {
        properties = new QrProperties();
        properties.setStorageDir(tempStorageDir.toString());
        properties.setMaxAssetSizeBytes(1024 * 1024); // 1 MB limit for test

        storageService = new LocalDiskQrStorageService(properties);
        storageService.init();
    }

    @Test
    void testStoreAndLoadAssetSuccess() throws IOException {
        byte[] content = "Hello QR Asset Content".getBytes(StandardCharsets.UTF_8);
        ByteArrayInputStream bais = new ByteArrayInputStream(content);

        QrStorageService.StoredAsset stored = storageService.store(
                "code123",
                "sample.txt",
                "text/plain",
                bais,
                content.length
        );

        assertNotNull(stored);
        assertNotNull(stored.id());
        assertEquals("sample.txt", stored.fileName());
        assertEquals("text/plain", stored.detectedMime());
        assertEquals((long) content.length, stored.sizeBytes());
        assertNotNull(stored.contentHash());
        assertTrue(stored.storagePath().startsWith("code123/"));

        Resource loaded = storageService.load(stored.storagePath());
        assertNotNull(loaded);
        assertTrue(loaded.exists());
        assertTrue(loaded.isReadable());
        assertArrayEquals(content, loaded.getInputStream().readAllBytes());
    }

    @Test
    void testStoreExceedsMaxSizeThrowsBadRequest() {
        byte[] largeContent = new byte[2 * 1024 * 1024]; // 2MB > 1MB limit
        ByteArrayInputStream bais = new ByteArrayInputStream(largeContent);

        assertThrows(BadRequestException.class, () ->
                storageService.store("code123", "big.bin", "application/octet-stream", bais, largeContent.length)
        );
    }

    @Test
    void testPathTraversalInSlugThrowsBadRequest() {
        byte[] content = "test".getBytes(StandardCharsets.UTF_8);
        ByteArrayInputStream bais = new ByteArrayInputStream(content);

        assertThrows(BadRequestException.class, () ->
                storageService.store("../../../etc", "hack.txt", "text/plain", bais, content.length)
        );
    }

    @Test
    void testLoadNonExistentAssetThrowsNotFound() {
        assertThrows(ResourceNotFoundException.class, () ->
                storageService.load("nonexistent/file.pdf")
        );
    }
}
