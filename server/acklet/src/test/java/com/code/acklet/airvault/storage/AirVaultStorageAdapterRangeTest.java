package com.code.acklet.airvault.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AirVaultStorageAdapterRangeTest {

    @TempDir
    Path tempDir;

    private LocalStorageAdapter storageAdapter;

    @BeforeEach
    void setUp() {
        storageAdapter = new LocalStorageAdapter(tempDir);
    }

    @Test
    @DisplayName("Should store and retrieve full object")
    void testStoreAndGetFullObject() throws Exception {
        String key = "files/test_sample.txt";
        byte[] content = "Hello AirVault Storage Layer!".getBytes(StandardCharsets.UTF_8);

        storageAdapter.storeObject(key, new ByteArrayInputStream(content), content.length, "text/plain");

        assertThat(storageAdapter.exists(key)).isTrue();
        assertThat(storageAdapter.getObjectSize(key)).isEqualTo(content.length);

        try (InputStream in = storageAdapter.getObject(key)) {
            byte[] readBytes = in.readAllBytes();
            assertThat(readBytes).isEqualTo(content);
        }
    }

    @Test
    @DisplayName("Should retrieve precise byte ranges (RFC 7233)")
    void testGetRangeSlicing() throws Exception {
        String key = "files/range_test.dat";
        byte[] payload = new byte[1000];
        for (int i = 0; i < 1000; i++) {
            payload[i] = (byte) (i % 256);
        }

        storageAdapter.storeObject(key, new ByteArrayInputStream(payload), payload.length, "application/octet-stream");

        // Range: 100-199 (100 bytes)
        try (InputStream rangeStream = storageAdapter.getRange(key, 100, 199)) {
            byte[] slice = rangeStream.readAllBytes();
            assertThat(slice).hasSize(100);
            for (int i = 0; i < 100; i++) {
                assertThat(slice[i]).isEqualTo((byte) ((100 + i) % 256));
            }
        }

        // Range: 0-0 (first byte only)
        try (InputStream rangeStream = storageAdapter.getRange(key, 0, 0)) {
            byte[] slice = rangeStream.readAllBytes();
            assertThat(slice).hasSize(1);
            assertThat(slice[0]).isEqualTo((byte) 0);
        }

        // Range: 900-999 (last 100 bytes)
        try (InputStream rangeStream = storageAdapter.getRange(key, 900, 999)) {
            byte[] slice = rangeStream.readAllBytes();
            assertThat(slice).hasSize(100);
            assertThat(slice[0]).isEqualTo((byte) (900 % 256));
            assertThat(slice[99]).isEqualTo((byte) (999 % 256));
        }
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException on invalid byte ranges")
    void testInvalidRangeOffsets() throws Exception {
        String key = "files/bounds.dat";
        byte[] payload = "12345".getBytes(StandardCharsets.UTF_8);
        storageAdapter.storeObject(key, new ByteArrayInputStream(payload), payload.length, "text/plain");

        assertThatThrownBy(() -> storageAdapter.getRange(key, 10, 20))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> storageAdapter.getRange(key, 3, 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Should list all stored objects and delete recursively")
    void testListAllAndDelete() throws Exception {
        storageAdapter.storeObject("files/file1.mp4", new ByteArrayInputStream(new byte[]{1, 2, 3}), 3, "video/mp4");
        storageAdapter.storeObject("chunks_session1/chunk_0", new ByteArrayInputStream(new byte[]{4, 5}), 2, "application/octet-stream");
        storageAdapter.storeObject("chunks_session1/chunk_1", new ByteArrayInputStream(new byte[]{6, 7}), 2, "application/octet-stream");

        List<AirVaultStorageAdapter.StorageObjectMetadata> all = storageAdapter.listAll();
        assertThat(all).extracting(AirVaultStorageAdapter.StorageObjectMetadata::objectKey)
                .contains("files/file1.mp4", "chunks_session1/chunk_0", "chunks_session1/chunk_1");

        // Delete chunks_session1 directory recursively
        storageAdapter.deleteObject("chunks_session1");
        assertThat(storageAdapter.exists("chunks_session1/chunk_0")).isFalse();
        assertThat(storageAdapter.exists("files/file1.mp4")).isTrue();
    }
}
