package com.code.acklet.airvault.service;

import com.code.acklet.airvault.controller.AirVaultUploadController;
import com.code.acklet.airvault.entity.ClipboardFile;
import com.code.acklet.airvault.entity.UploadSession;
import com.code.acklet.airvault.repository.ClipboardFileRepository;
import com.code.acklet.airvault.repository.UploadSessionRepository;
import com.code.acklet.airvault.storage.LocalStorageAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AirVaultUploadAssemblyIntegrationTest {

    @TempDir
    Path tempStorageDir;

    private LocalStorageAdapter storageAdapter;
    private ClipboardFileRepository clipboardFileRepository;
    private UploadSessionRepository uploadSessionRepository;
    private AirVaultRedisTracker redisTracker;
    private AirVaultUploadService uploadService;
    private AirVaultAuditService auditService;
    private AirVaultUploadAssemblyWorker assemblyWorker;
    private AirVaultUploadController uploadController;

    @BeforeEach
    void setUp() {
        storageAdapter = new LocalStorageAdapter(tempStorageDir);
        clipboardFileRepository = Mockito.mock(ClipboardFileRepository.class);
        uploadSessionRepository = Mockito.mock(UploadSessionRepository.class);
        redisTracker = Mockito.mock(AirVaultRedisTracker.class);
        uploadService = Mockito.mock(AirVaultUploadService.class);
        auditService = Mockito.mock(AirVaultAuditService.class);

        assemblyWorker = new AirVaultUploadAssemblyWorker(
                uploadSessionRepository,
                clipboardFileRepository,
                redisTracker,
                uploadService,
                auditService,
                storageAdapter
        );

        uploadController = new AirVaultUploadController(uploadService, storageAdapter);
    }

    @Test
    void testFullAssemblyAndRangeStreamingEndToEnd() throws Exception {
        UUID sessionId = UUID.randomUUID();
        String fileId = "att_test_media_12345";
        String fileName = "sample_clip.mp4";
        String clipboardId = "default";

        // 1. Prepare 3 chunks of test binary video data
        byte[] chunk0 = "PART_000_HEADER_DATA_STREAM_BYTES_".getBytes(StandardCharsets.UTF_8);
        byte[] chunk1 = "PART_001_INTERMEDIATE_VIDEO_PAYLOAD_CHUNK_".getBytes(StandardCharsets.UTF_8);
        byte[] chunk2 = "PART_002_FINAL_FOOTER_METADATA_EOF_".getBytes(StandardCharsets.UTF_8);

        byte[] fullPayload = new byte[chunk0.length + chunk1.length + chunk2.length];
        System.arraycopy(chunk0, 0, fullPayload, 0, chunk0.length);
        System.arraycopy(chunk1, 0, fullPayload, chunk0.length, chunk1.length);
        System.arraycopy(chunk2, 0, fullPayload, chunk0.length + chunk1.length, chunk2.length);

        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        byte[] expectedHashBytes = sha256.digest(fullPayload);
        StringBuilder hexString = new StringBuilder();
        for (byte b : expectedHashBytes) {
            hexString.append(String.format("%02x", b));
        }
        String expectedChecksum = hexString.toString();

        // 2. Write chunks to storageRoot/chunks_<sessionId>/chunk_i
        Path storageRoot = Path.of(System.getProperty("java.io.tmpdir"), "acklet_airvault_uploads");
        Path sessionChunkDir = storageRoot.resolve("chunks_" + sessionId);
        Files.createDirectories(sessionChunkDir);
        Files.write(sessionChunkDir.resolve("chunk_0"), chunk0);
        Files.write(sessionChunkDir.resolve("chunk_1"), chunk1);
        Files.write(sessionChunkDir.resolve("chunk_2"), chunk2);

        UploadSession session = UploadSession.builder()
                .id(sessionId)
                .clipboardId(clipboardId)
                .fileId(fileId)
                .fileName(fileName)
                .category("video")
                .declaredSize((long) fullPayload.length)
                .totalChunks(3)
                .receivedBytes(0L)
                .chunksReceivedCount(3)
                .status("ASSEMBLING")
                .build();

        when(uploadSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        Map<String, ClipboardFile> dbStore = new HashMap<>();
        when(clipboardFileRepository.findByFileId(fileId)).thenAnswer(inv -> Optional.ofNullable(dbStore.get(fileId)));
        when(clipboardFileRepository.save(any(ClipboardFile.class))).thenAnswer(inv -> {
            ClipboardFile saved = inv.getArgument(0);
            dbStore.put(fileId, saved);
            return saved;
        });

        // 3. Trigger assembly worker
        com.rabbitmq.client.Channel mockChannel = Mockito.mock(com.rabbitmq.client.Channel.class);
        assemblyWorker.processUploadAssembly(
                Map.of("uploadSessionId", sessionId.toString()),
                mockChannel,
                1L
        );

        // 4. Assert DB record has exact storagePath and byteSize
        ClipboardFile savedEntity = dbStore.get(fileId);
        assertThat(savedEntity).isNotNull();
        assertThat(savedEntity.getStoragePath()).isEqualTo("files/file_" + fileId + ".mp4");
        assertThat(savedEntity.getByteSize()).isEqualTo((long) fullPayload.length);
        assertThat(savedEntity.getChecksum()).isEqualTo(expectedChecksum);

        // 5. Assert physical object exists on disk
        assertThat(storageAdapter.exists(savedEntity.getStoragePath())).isTrue();
        assertThat(storageAdapter.getObjectSize(savedEntity.getStoragePath())).isEqualTo(fullPayload.length);

        // 6. Test Controller Streaming via /raw with Range header (RFC 7233)
        when(uploadService.getFileMetadata(fileId)).thenReturn(savedEntity);

        ResponseEntity<InputStreamResource> rangeResponse = uploadController.downloadRawFile(
                clipboardId,
                fileId,
                "bytes=10-25"
        );

        assertThat(rangeResponse.getStatusCode()).isEqualTo(HttpStatus.PARTIAL_CONTENT);
        assertThat(rangeResponse.getHeaders().getFirst("Content-Range"))
                .isEqualTo("bytes 10-25/" + fullPayload.length);
        assertThat(rangeResponse.getHeaders().getFirst("Accept-Ranges")).isEqualTo("bytes");

        InputStream stream = rangeResponse.getBody().getInputStream();
        byte[] readRangeBytes = stream.readAllBytes();
        assertThat(readRangeBytes.length).isEqualTo(16);

        byte[] expectedSubArray = Arrays.copyOfRange(fullPayload, 10, 26);
        assertThat(readRangeBytes).isEqualTo(expectedSubArray);

        // 7. Test full 200 OK download stream
        ResponseEntity<InputStreamResource> fullResponse = uploadController.downloadRawFile(
                clipboardId,
                fileId,
                null
        );

        assertThat(fullResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        byte[] readFullBytes = fullResponse.getBody().getInputStream().readAllBytes();
        assertThat(readFullBytes).isEqualTo(fullPayload);
    }

    @Test
    void testVideoFileAssemblyDirectStorage() throws Exception {
        UUID sessionId = UUID.randomUUID();
        String fileId = "att_test_quicktime_99999";
        String fileName = "Screen Recording 2026-09-18.mov";
        String clipboardId = "default";

        byte[] chunk0 = "FAKE_MOV_HEADER_ATOM_MOOV_DATA_".getBytes(StandardCharsets.UTF_8);
        byte[] chunk1 = "FAKE_MOV_MEDIA_TRACKS_FRAMES_".getBytes(StandardCharsets.UTF_8);

        byte[] fullPayload = new byte[chunk0.length + chunk1.length];
        System.arraycopy(chunk0, 0, fullPayload, 0, chunk0.length);
        System.arraycopy(chunk1, 0, fullPayload, chunk0.length, chunk1.length);

        Path storageRoot = Path.of(System.getProperty("java.io.tmpdir"), "acklet_airvault_uploads");
        Path sessionChunkDir = storageRoot.resolve("chunks_" + sessionId);
        Files.createDirectories(sessionChunkDir);
        Files.write(sessionChunkDir.resolve("chunk_0"), chunk0);
        Files.write(sessionChunkDir.resolve("chunk_1"), chunk1);

        UploadSession session = UploadSession.builder()
                .id(sessionId)
                .clipboardId(clipboardId)
                .fileId(fileId)
                .fileName(fileName)
                .category("video")
                .declaredSize((long) fullPayload.length)
                .totalChunks(2)
                .receivedBytes(0L)
                .chunksReceivedCount(2)
                .status("ASSEMBLING")
                .build();

        when(uploadSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        Map<String, ClipboardFile> dbStore = new HashMap<>();
        when(clipboardFileRepository.findByFileId(fileId)).thenAnswer(inv -> Optional.ofNullable(dbStore.get(fileId)));
        when(clipboardFileRepository.save(any(ClipboardFile.class))).thenAnswer(inv -> {
            ClipboardFile saved = inv.getArgument(0);
            dbStore.put(fileId, saved);
            return saved;
        });

        com.rabbitmq.client.Channel mockChannel = Mockito.mock(com.rabbitmq.client.Channel.class);
        assemblyWorker.processUploadAssembly(
                Map.of("uploadSessionId", sessionId.toString()),
                mockChannel,
                1L
        );

        ClipboardFile savedEntity = dbStore.get(fileId);
        assertThat(savedEntity).isNotNull();
        assertThat(savedEntity.getStoragePath()).isEqualTo("files/file_" + fileId + ".mov");
        assertThat(storageAdapter.exists(savedEntity.getStoragePath())).isTrue();
        assertThat(savedEntity.getByteSize()).isEqualTo((long) fullPayload.length);

        when(uploadService.getFileMetadata(fileId)).thenReturn(savedEntity);
        ResponseEntity<InputStreamResource> res = uploadController.downloadRawFile(clipboardId, fileId, null);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getHeaders().getContentType().toString()).isEqualTo("video/quicktime");
    }
}
