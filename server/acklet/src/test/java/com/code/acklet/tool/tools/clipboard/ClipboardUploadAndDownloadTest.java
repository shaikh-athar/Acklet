package com.code.acklet.tool.tools.clipboard;

import com.code.acklet.tool.tools.clipboard.dto.ClipboardItemDto;
import com.code.acklet.tool.tools.clipboard.dto.UploadChunkResponse;
import com.code.acklet.tool.tools.clipboard.dto.UploadSessionInitRequest;
import com.code.acklet.tool.tools.clipboard.dto.UploadSessionResponse;
import com.code.acklet.tool.tools.clipboard.entity.ClipboardItemEntity;
import com.code.acklet.tool.tools.clipboard.service.ClipboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:clipboardtest;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.data.redis.repositories.enabled=false",
        "app.security.jwt.secret=Mzg1OTM4OTVhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM9",
        "app.security.encryption.key=MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI="
})
public class ClipboardUploadAndDownloadTest {

    @Autowired
    private ClipboardService clipboardService;

    @Autowired
    private com.code.acklet.tool.tools.clipboard.controller.ClipboardController clipboardController;

    private String roomCode;

    @BeforeEach
    void setUp() {
        roomCode = "testroom" + System.currentTimeMillis() % 10000;
        clipboardService.createShare(null);
    }

    @Test
    void testDirectFileUploadAndDownload() throws Exception {
        byte[] originalContent = "Hello Acklet Clipboard Storage!".getBytes(StandardCharsets.UTF_8);
        String filename = "sample.txt";

        ClipboardItemDto itemDto = clipboardService.addFileItem(
                roomCode, filename, originalContent, "text/plain", false, false, null
        );

        assertNotNull(itemDto);
        assertEquals(filename, itemDto.getOriginalName());
        assertEquals(originalContent.length, itemDto.getSizeBytes());

        Optional<ClipboardItemEntity> entityOpt = clipboardService.getItem(roomCode, itemDto.getId());
        assertTrue(entityOpt.isPresent());

        // Verify full download reproduces exact original bytes
        try (InputStream stream = clipboardService.getFileStream(entityOpt.get())) {
            byte[] downloaded = stream.readAllBytes();
            assertArrayEquals(originalContent, downloaded);
        }
    }

    @Test
    void testChunkedUploadAndAssembly() throws Exception {
        // Construct 120 KB test payload
        byte[] fullPayload = new byte[120 * 1024];
        for (int i = 0; i < fullPayload.length; i++) {
            fullPayload[i] = (byte) (i % 127);
        }

        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String fullHash = HexFormat.of().formatHex(md.digest(fullPayload));

        int chunkSize = 50 * 1024; // 50 KB chunks
        int totalChunks = 3; // 50KB, 50KB, 20KB

        UploadSessionInitRequest initReq = UploadSessionInitRequest.builder()
                .fileName("large-dataset.bin")
                .totalSize(fullPayload.length)
                .chunkSize(chunkSize)
                .totalChunks(totalChunks)
                .fileHash(fullHash)
                .build();

        UploadSessionResponse session = clipboardService.initChunkedUpload(roomCode, initReq, null);
        assertNotNull(session);
        assertEquals(3, session.getTotalChunks());
        assertEquals(0, session.getUploadedChunks().size());

        // Upload chunk 0 (0..50KB)
        byte[] chunk0 = Arrays.copyOfRange(fullPayload, 0, 50 * 1024);
        UploadChunkResponse res0 = clipboardService.uploadChunk(roomCode, session.getUploadId(), 0, chunk0);
        assertEquals(1, res0.getUploadedChunks().size());
        assertFalse(res0.getIsComplete());

        // Upload chunk 1 (50KB..100KB)
        byte[] chunk1 = Arrays.copyOfRange(fullPayload, 50 * 1024, 100 * 1024);
        UploadChunkResponse res1 = clipboardService.uploadChunk(roomCode, session.getUploadId(), 1, chunk1);
        assertEquals(2, res1.getUploadedChunks().size());
        assertFalse(res1.getIsComplete());

        // Upload chunk 2 (100KB..120KB)
        byte[] chunk2 = Arrays.copyOfRange(fullPayload, 100 * 1024, 120 * 1024);
        UploadChunkResponse res2 = clipboardService.uploadChunk(roomCode, session.getUploadId(), 2, chunk2);
        assertEquals(3, res2.getUploadedChunks().size());
        assertTrue(res2.getIsComplete());

        // Complete upload
        ClipboardItemDto completedItem = clipboardService.completeChunkedUpload(roomCode, session.getUploadId());
        assertNotNull(completedItem);
        assertEquals(fullPayload.length, completedItem.getSizeBytes());
        assertEquals(fullHash, completedItem.getContentHash());

        // Verify download content integrity
        Optional<ClipboardItemEntity> itemOpt = clipboardService.getItem(roomCode, completedItem.getId());
        assertTrue(itemOpt.isPresent());
        try (InputStream stream = clipboardService.getFileStream(itemOpt.get())) {
            byte[] downloaded = stream.readAllBytes();
            assertArrayEquals(fullPayload, downloaded);
        }
    }

    @Test
    void testResumableUploadAfterInterruption() throws Exception {
        byte[] fullPayload = "Resumable Payload Data for Testing 1234567890".repeat(100).getBytes(StandardCharsets.UTF_8);
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String fullHash = HexFormat.of().formatHex(md.digest(fullPayload));

        int chunkSize = fullPayload.length / 4;
        int totalChunks = 4;

        UploadSessionInitRequest initReq = UploadSessionInitRequest.builder()
                .fileName("resumable.dat")
                .totalSize(fullPayload.length)
                .chunkSize(chunkSize)
                .totalChunks(totalChunks)
                .fileHash(fullHash)
                .build();

        // Step 1: Initial upload session
        UploadSessionResponse session = clipboardService.initChunkedUpload(roomCode, initReq, null);
        assertNotNull(session);

        // Upload chunk 0 and 1 (50% progress)
        clipboardService.uploadChunk(roomCode, session.getUploadId(), 0, Arrays.copyOfRange(fullPayload, 0, chunkSize));
        clipboardService.uploadChunk(roomCode, session.getUploadId(), 1, Arrays.copyOfRange(fullPayload, chunkSize, chunkSize * 2));

        // Step 2: Simulating page refresh / network drop: Client calls init again with same hash and size
        UploadSessionResponse resumedSession = clipboardService.initChunkedUpload(roomCode, initReq, null);
        assertEquals(session.getUploadId(), resumedSession.getUploadId(), "Should return the existing session uploadId");
        assertTrue(resumedSession.getUploadedChunks().contains(0));
        assertTrue(resumedSession.getUploadedChunks().contains(1));
        assertEquals(2, resumedSession.getUploadedChunks().size());

        // Step 3: Client only needs to upload remaining chunks 2 and 3
        clipboardService.uploadChunk(roomCode, session.getUploadId(), 2, Arrays.copyOfRange(fullPayload, chunkSize * 2, chunkSize * 3));
        clipboardService.uploadChunk(roomCode, session.getUploadId(), 3, Arrays.copyOfRange(fullPayload, chunkSize * 3, fullPayload.length));

        // Step 4: Finalize
        ClipboardItemDto completedItem = clipboardService.completeChunkedUpload(roomCode, session.getUploadId());
        assertNotNull(completedItem);

        // Verify exact byte integrity
        Optional<ClipboardItemEntity> itemOpt = clipboardService.getItem(roomCode, completedItem.getId());
        assertTrue(itemOpt.isPresent());
        try (InputStream stream = clipboardService.getFileStream(itemOpt.get())) {
            assertArrayEquals(fullPayload, stream.readAllBytes());
        }
    }

    @Test
    void testRangeRequestDownload() throws Exception {
        byte[] payload = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".getBytes(StandardCharsets.UTF_8);
        ClipboardItemDto item = clipboardService.addFileItem(roomCode, "alphanumeric.txt", payload, "text/plain", false, false, null);

        ClipboardItemEntity entity = clipboardService.getItem(roomCode, item.getId()).orElseThrow();

        // Read range 10-19 ("ABCDEFGHIJ")
        byte[] rangeSlice = clipboardService.readByteRange(entity, 10, 19);
        String sliceText = new String(rangeSlice, StandardCharsets.UTF_8);
        assertEquals("ABCDEFGHIJ", sliceText);
    }

    @Test
    void testPathTraversalSanitization() throws Exception {
        byte[] content = "test content".getBytes(StandardCharsets.UTF_8);
        ClipboardItemDto item = clipboardService.addFileItem(
                roomCode, "../../../../etc/passwd", content, "text/plain", false, false, null
        );

        assertNotNull(item);
        assertFalse(item.getOriginalName().contains("/"));
        assertFalse(item.getOriginalName().contains(".."));
        assertEquals("passwd", item.getOriginalName());
    }

    @Test
    void testDangerousExtensionRejected() {
        byte[] content = "malicious payload".getBytes(StandardCharsets.UTF_8);
        assertThrows(IllegalArgumentException.class, () -> {
            clipboardService.addFileItem(roomCode, "exploit.exe", content, "application/x-msdownload", false, false, null);
        });
    }

    @Test
    void testUnicodeFilenameContentDispositionSafe() throws Exception {
        String unicodeName = "Screenshot 2026-10-15 at 11.28.13\u202FAM.png";
        byte[] content = "dummy png content".getBytes(StandardCharsets.UTF_8);

        ClipboardItemDto item = clipboardService.addFileItem(
                roomCode, unicodeName, content, "image/png", true, false, null
        );

        org.springframework.http.ResponseEntity<?> response = clipboardController.previewFile(roomCode, item.getId(), null);
        assertEquals(200, response.getStatusCode().value());

        String contentDisposition = response.getHeaders().getFirst(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION);
        assertNotNull(contentDisposition);

        // Verify that the fallback filename="..." contains only ASCII characters in 0x20..0x7E
        // This guarantees Tomcat's Http11OutputBuffer will never throw IllegalArgumentException
        int fnIndex = contentDisposition.indexOf("filename=\"");
        assertTrue(fnIndex >= 0);
        int fnEnd = contentDisposition.indexOf("\"", fnIndex + 10);
        assertTrue(fnEnd > fnIndex);
        String fallbackFilename = contentDisposition.substring(fnIndex + 10, fnEnd);

        for (char c : fallbackFilename.toCharArray()) {
            assertTrue(c >= 0x20 && c <= 0x7E, "Character must be ASCII printable: " + (int) c);
        }

        // Verify that the full Unicode filename is preserved in filename*=UTF-8''
        assertTrue(contentDisposition.contains("filename*=UTF-8''"));
        assertTrue(contentDisposition.contains("%E2%80%AFAM.png"));
    }
}
