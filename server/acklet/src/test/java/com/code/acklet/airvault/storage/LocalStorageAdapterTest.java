package com.code.acklet.airvault.storage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

import static org.junit.jupiter.api.Assertions.*;

class LocalStorageAdapterTest {

    private Path tempDir;
    private LocalStorageAdapter adapter;

    @BeforeEach
    void setUp() throws IOException {
        tempDir = Files.createTempDirectory("airvault_test_storage_");
        adapter = new LocalStorageAdapter(tempDir);
    }

    @AfterEach
    void tearDown() throws IOException {
        if (Files.exists(tempDir)) {
            try (var stream = Files.walk(tempDir)) {
                stream.sorted(Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(File::delete);
            }
        }
    }

    @Test
    void testStoreAndGetObject() throws IOException {
        String testKey = "files/test_sample_123.bin";
        byte[] content = "Hello AirVault Object Storage!".getBytes(StandardCharsets.UTF_8);

        // 1. Store object
        try (InputStream in = new ByteArrayInputStream(content)) {
            adapter.storeObject(testKey, in, content.length, "text/plain");
        }

        // 2. Existence check
        assertTrue(adapter.exists(testKey), "Stored object must exist");

        // 3. Read object
        try (InputStream readIn = adapter.getObject(testKey)) {
            byte[] readBytes = readIn.readAllBytes();
            assertArrayEquals(content, readBytes, "Read content must match stored content exactly");
        }

        // 4. Delete object
        adapter.deleteObject(testKey);
        assertFalse(adapter.exists(testKey), "Deleted object must not exist");
    }

    @Test
    void testProviderName() {
        assertEquals("LOCAL", adapter.getProviderName());
    }
}
