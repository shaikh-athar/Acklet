package com.code.acklet.tool.tools.barcode;

import com.code.acklet.config.properties.AppProperties;
import com.code.acklet.shared.security.RateLimitingService;
import com.code.acklet.tool.tools.barcode.config.TempCodeProperties;
import com.code.acklet.tool.tools.barcode.dto.*;
import com.code.acklet.tool.tools.barcode.entity.TempCodeEntity;
import com.code.acklet.tool.tools.barcode.repository.TempCodeReportRepository;
import com.code.acklet.tool.tools.barcode.repository.TempCodeRepository;
import com.code.acklet.tool.tools.barcode.service.TempCodeService;
import com.code.acklet.tool.tools.barcode.util.TempCodeSecurityHelper;
import com.code.acklet.tool.tools.shortener.security.ShortenerCryptoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TempCodeServiceTest {

    @Mock
    private TempCodeRepository repository;

    @Mock
    private TempCodeReportRepository reportRepository;

    @Mock
    private RateLimitingService rateLimitingService;

    private TempCodeProperties properties;
    private TempCodeSecurityHelper securityHelper;
    private ShortenerCryptoService cryptoService;

    // Mutable test clock for advancing time
    private static class TestClock extends Clock {
        private Instant currentInstant;
        private final ZoneId zone;

        public TestClock(Instant initial, ZoneId zone) {
            this.currentInstant = initial;
            this.zone = zone;
        }

        public void advance(Duration duration) {
            this.currentInstant = this.currentInstant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return new TestClock(currentInstant, zone);
        }

        @Override
        public Instant instant() {
            return currentInstant;
        }
    }

    private TestClock testClock;
    private TempCodeService service;

    @BeforeEach
    void setUp() {
        properties = new TempCodeProperties();
        properties.setVerifyBaseUrl("http://barcode.localhost:4200");
        properties.setTokenLength(16);
        properties.setMinExpiryMinutes(1);
        properties.setMaxExpiryDays(365);
        properties.setPurgeDays(30);
        properties.setMaxActiveCodesPerOwner(200);
        properties.getSecurity().setPepper("test_pepper_12345");

        securityHelper = new TempCodeSecurityHelper(properties);

        AppProperties appProps = new AppProperties();
        appProps.getSecurity().getEncryption().setKey("0123456789abcdef0123456789abcdef");
        cryptoService = new ShortenerCryptoService(appProps, new MockEnvironment());

        testClock = new TestClock(Instant.parse("2026-11-03T12:00:00Z"), ZoneId.of("UTC"));

        lenient().when(rateLimitingService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);

        service = new TempCodeService(repository, reportRepository, securityHelper, properties, rateLimitingService, testClock);
    }

    @Test
    @DisplayName("Create with 1 minute expiry is Valid; advance Clock and it is Expired")
    void testCreateOneMinuteExpiryAndAdvanceClock() {
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        Instant expiresAt = testClock.instant().plus(1, ChronoUnit.MINUTES);
        CreateTempCodeRequest req = CreateTempCodeRequest.builder()
                .name("Expiring Soon Test")
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .content("Secret code for pick up")
                .barcodeFormat("qrcode")
                .expiresAt(expiresAt)
                .build();

        TempCodeResponse response = service.createCode(req, null, "127.0.0.1");
        assertNotNull(response);
        // With 1 minute expiry, the owner status is EXPIRING_SOON (under 1 hour threshold)
        assertEquals("EXPIRING_SOON", response.getStatus());
        assertEquals("Expiring Soon Test", response.getName());
        assertNotNull(response.getToken());
        assertTrue(response.getVerifyUrl().contains("/v/" + response.getToken()));

        // Capture saved entity
        ArgumentCaptor<TempCodeEntity> captor = ArgumentCaptor.forClass(TempCodeEntity.class);
        verify(repository, times(1)).save(captor.capture());
        TempCodeEntity savedEntity = captor.getValue();

        // Verification immediately -> VALID
        when(repository.findByTokenHash(savedEntity.getTokenHash())).thenReturn(Optional.of(savedEntity));
        TempCodeVerifyResponse verifyBefore = service.verifyCode(response.getToken(), "127.0.0.1");
        assertEquals("VALID", verifyBefore.getStatus());
        assertEquals("Secret code for pick up", verifyBefore.getContent());
        assertTrue(verifyBefore.getRemainingSeconds() > 0);

        // Advance Clock past expiry (advance 2 minutes)
        testClock.advance(Duration.ofMinutes(2));

        // Verification after advancing Clock -> EXPIRED, content MUST BE null
        TempCodeVerifyResponse verifyAfter = service.verifyCode(response.getToken(), "127.0.0.1");
        assertEquals("EXPIRED", verifyAfter.getStatus());
        assertNull(verifyAfter.getContent(), "Content must never be returned after expiry");
        assertEquals(0L, verifyAfter.getRemainingSeconds());
    }

    @Test
    @DisplayName("Extend an expired code reactivates it")
    void testExtendExpiredCodeReactivates() {
        UUID id = UUID.randomUUID();
        Instant pastExpiry = testClock.instant().minus(10, ChronoUnit.MINUTES);
        String ownerToken = "tok_test_owner_123";
        String ownerTokenHash = securityHelper.hashOwnerToken(ownerToken);

        TempCodeEntity entity = TempCodeEntity.builder()
                .id(id)
                .name("Expired Code")
                .ownerTokenHash(ownerTokenHash)
                .token("testtoken1234567")
                .tokenHash(securityHelper.hashToken("testtoken1234567"))
                .status("EXPIRED")
                .createdAt(testClock.instant().minus(2, ChronoUnit.DAYS))
                .expiresAt(pastExpiry)
                .purgeAt(pastExpiry.plus(30, ChronoUnit.DAYS))
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .content("Some data")
                .barcodeFormat("qrcode")
                .build();

        when(repository.findByIdAndOwnerTokenHash(id, ownerTokenHash)).thenReturn(Optional.of(entity));

        UpdateTempCodeRequest updateReq = UpdateTempCodeRequest.builder()
                .action("extend")
                .extensionSeconds(86400L) // extend 24 hours from now
                .build();

        TempCodeResponse res = service.updateCode(id, updateReq, ownerToken);
        assertEquals("ACTIVE", res.getStatus());
        assertTrue(res.getExpiresAt().isAfter(testClock.instant()));
        assertEquals(entity.getExpiresAt(), res.getExpiresAt());
    }

    @Test
    @DisplayName("Extend an active code adds time to current expiry")
    void testExtendActiveCodeAddsTime() {
        UUID id = UUID.randomUUID();
        Instant initialExpiry = testClock.instant().plus(2, ChronoUnit.HOURS);
        String ownerToken = "tok_test_owner_456";
        String ownerTokenHash = securityHelper.hashOwnerToken(ownerToken);

        TempCodeEntity entity = TempCodeEntity.builder()
                .id(id)
                .name("Active Code")
                .ownerTokenHash(ownerTokenHash)
                .token("activetoken12345")
                .tokenHash(securityHelper.hashToken("activetoken12345"))
                .status("ACTIVE")
                .createdAt(testClock.instant())
                .expiresAt(initialExpiry)
                .purgeAt(initialExpiry.plus(30, ChronoUnit.DAYS))
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .content("Data")
                .barcodeFormat("qrcode")
                .build();

        when(repository.findByIdAndOwnerTokenHash(id, ownerTokenHash)).thenReturn(Optional.of(entity));

        UpdateTempCodeRequest updateReq = UpdateTempCodeRequest.builder()
                .action("extend")
                .extensionSeconds(7200L) // add 2 more hours
                .build();

        TempCodeResponse res = service.updateCode(id, updateReq, ownerToken);
        assertEquals(initialExpiry.plusSeconds(7200L), res.getExpiresAt());
    }

    @Test
    @DisplayName("Expire now sets status Deactivated and suppresses content")
    void testExpireNowSetsDeactivated() {
        UUID id = UUID.randomUUID();
        String ownerToken = "tok_test_owner_789";
        String ownerTokenHash = securityHelper.hashOwnerToken(ownerToken);

        TempCodeEntity entity = TempCodeEntity.builder()
                .id(id)
                .name("To Deactivate")
                .ownerTokenHash(ownerTokenHash)
                .token("deactivateme1234")
                .tokenHash(securityHelper.hashToken("deactivateme1234"))
                .status("ACTIVE")
                .createdAt(testClock.instant())
                .expiresAt(testClock.instant().plus(1, ChronoUnit.DAYS))
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .content("Confidential message")
                .barcodeFormat("qrcode")
                .build();

        when(repository.findByIdAndOwnerTokenHash(id, ownerTokenHash)).thenReturn(Optional.of(entity));

        UpdateTempCodeRequest updateReq = UpdateTempCodeRequest.builder()
                .action("expireNow")
                .build();

        TempCodeResponse res = service.updateCode(id, updateReq, ownerToken);
        assertEquals("DEACTIVATED", res.getStatus());

        // Verify public verify returns DEACTIVATED with null content
        when(repository.findByTokenHash(entity.getTokenHash())).thenReturn(Optional.of(entity));
        TempCodeVerifyResponse verifyRes = service.verifyCode("deactivateme1234", "127.0.0.1");
        assertEquals("DEACTIVATED", verifyRes.getStatus());
        assertNull(verifyRes.getContent());
    }

    @Test
    @DisplayName("Unknown token gives Not found")
    void testUnknownTokenNotFound() {
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        TempCodeVerifyResponse res = service.verifyCode("nonexistent_token", "127.0.0.1");
        assertEquals("NOT_FOUND", res.getStatus());
        assertNull(res.getContent());
    }

    @Test
    @DisplayName("Creating with past time or >365 days is rejected")
    void testExpiryBoundaryValidation() {
        // 1. Past time
        CreateTempCodeRequest pastReq = CreateTempCodeRequest.builder()
                .contentType("MESSAGE")
                .content("hello")
                .barcodeFormat("qrcode")
                .expiresAt(testClock.instant().minus(5, ChronoUnit.MINUTES))
                .build();

        IllegalArgumentException exPast = assertThrows(IllegalArgumentException.class, () ->
                service.createCode(pastReq, null, "127.0.0.1"));
        assertEquals("Choose a time at least 1 minute from now.", exPast.getMessage());

        // 2. More than 365 days
        CreateTempCodeRequest farFutureReq = CreateTempCodeRequest.builder()
                .contentType("MESSAGE")
                .content("hello")
                .barcodeFormat("qrcode")
                .expiresAt(testClock.instant().plus(400, ChronoUnit.DAYS))
                .build();

        IllegalArgumentException exFuture = assertThrows(IllegalArgumentException.class, () ->
                service.createCode(farFutureReq, null, "127.0.0.1"));
        assertEquals("The maximum is 365 days.", exFuture.getMessage());
    }

    @Test
    @DisplayName("Tokens are unique and at least 80 bits")
    void testTokensUniqueAndAtLeast80Bits() {
        Set<String> generatedTokens = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            String token = securityHelper.generateToken();
            assertNotNull(token);
            // 16 Crockford Base32 characters: 16 * 5 = 80 bits entropy
            assertTrue(token.length() >= 16, "Token must be at least 16 Base32 characters (80 bits)");
            // Characters must be Crockford Base32
            assertTrue(token.matches("^[0123456789abcdefghjkmnpqrstvwxyz]{16,}$"), "Token must contain only Crockford Base32 characters");
            assertFalse(generatedTokens.contains(token), "Generated tokens must be distinct");
            generatedTokens.add(token);
        }
    }

    @Test
    @DisplayName("Content is stored encrypted (assert ciphertext differs from plain text)")
    void testContentEncryptionAtRest() {
        String plainText = "My Confidential Barcode Message 2026";
        String ciphertext = cryptoService.encrypt(plainText);

        assertNotNull(ciphertext);
        assertNotEquals(plainText, ciphertext, "Ciphertext must differ from plain text");
        assertTrue(ciphertext.startsWith("v1:"), "Ciphertext must contain version prefix");

        String decrypted = cryptoService.decrypt(ciphertext);
        assertEquals(plainText, decrypted, "Decryption must recover exact plaintext");
    }

    @Test
    @DisplayName("Rate limiting returns 429 response")
    void testRateLimitingEnforced() {
        when(rateLimitingService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(false);

        CreateTempCodeRequest req = CreateTempCodeRequest.builder()
                .contentType("MESSAGE")
                .content("Test")
                .barcodeFormat("qrcode")
                .expiresAt(testClock.instant().plus(1, ChronoUnit.HOURS))
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.createCode(req, null, "127.0.0.1"));
        assertEquals(429, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("Rejected URL schemes: javascript:, data:, vbscript:")
    void testRejectedUrlSchemes() {
        String[] disallowed = {
                "javascript:alert(1)",
                "data:text/html,<script>alert(1)</script>",
                "vbscript:msgbox",
                "file:///etc/passwd"
        };

        for (String url : disallowed) {
            CreateTempCodeRequest req = CreateTempCodeRequest.builder()
                    .payloadMode("LINK")
                    .contentType("LINK")
                    .content(url)
                    .barcodeFormat("qrcode")
                    .expiresAt(testClock.instant().plus(1, ChronoUnit.HOURS))
                    .build();

            assertThrows(IllegalArgumentException.class, () ->
                    service.createCode(req, null, "127.0.0.1"), "Scheme should be rejected: " + url);
        }
    }

    @Test
    @DisplayName("Owner cannot touch another owner's code")
    void testOwnerIsolation() {
        UUID id = UUID.randomUUID();
        String realOwnerToken = "tok_real_owner";
        String attackerOwnerToken = "tok_attacker";

        when(repository.findByIdAndOwnerTokenHash(id, securityHelper.hashOwnerToken(attackerOwnerToken)))
                .thenReturn(Optional.empty());

        UpdateTempCodeRequest updateReq = UpdateTempCodeRequest.builder()
                .action("expireNow")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.updateCode(id, updateReq, attackerOwnerToken));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("Purge job deletes expired data after configured days")
    void testPurgeJobExecution() {
        when(repository.purgeExpiredOrDeletedBefore(any(Instant.class))).thenReturn(5);

        int count = service.purgeExpiredCodes();
        assertEquals(5, count);
        verify(repository, times(1)).purgeExpiredOrDeletedBefore(testClock.instant());
    }

    @Test
    @DisplayName("Batch create atomically creates items with shared batchId")
    void testBatchCreateSuccess() {
        when(rateLimitingService.isAllowed(anyString(), anyInt(), anyInt(), anyInt())).thenReturn(true);
        when(repository.countActiveByOwnerTokenHash(anyString(), any(Instant.class))).thenReturn(0L);
        when(repository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        when(repository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        BatchCreateTempCodeRequest req = BatchCreateTempCodeRequest.builder()
                .items(List.of(
                        BatchItemRequest.builder().name("Item 1").content("Message 1").build(),
                        BatchItemRequest.builder().name("Item 2").content("Message 2").build()
                ))
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .barcodeFormat("code128")
                .durationSeconds(3600L)
                .build();

        BatchTempCodeResponse resp = service.createBatch(req, null, "127.0.0.1");
        assertNotNull(resp.getBatchId());
        assertEquals(2, resp.getTotalCount());
        assertEquals(2, resp.getItems().size());
        assertEquals("Item 1", resp.getItems().get(0).getName());
        assertEquals(resp.getBatchId(), resp.getItems().get(0).getBatchId());
        assertNotNull(resp.getOwnerToken());

        verify(repository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Batch create with same idempotency key returns existing batch")
    void testBatchCreateIdempotency() {
        String ownerToken = "tok_test_owner";
        String idempotencyKey = "run_12345";
        UUID batchId = UUID.randomUUID();

        TempCodeEntity existing1 = TempCodeEntity.builder()
                .id(UUID.randomUUID())
                .batchId(batchId)
                .idempotencyKey(idempotencyKey)
                .name("Item 1")
                .token("tok1")
                .tokenHash("hash1")
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .barcodeFormat("code128")
                .status("ACTIVE")
                .createdAt(testClock.instant())
                .expiresAt(testClock.instant().plus(1, ChronoUnit.HOURS))
                .build();

        when(repository.findByOwnerTokenHashAndIdempotencyKey(anyString(), eq(idempotencyKey)))
                .thenReturn(List.of(existing1));

        BatchCreateTempCodeRequest req = BatchCreateTempCodeRequest.builder()
                .items(List.of(BatchItemRequest.builder().name("Item 1").build()))
                .idempotencyKey(idempotencyKey)
                .build();

        BatchTempCodeResponse resp = service.createBatch(req, ownerToken, "127.0.0.1");
        assertEquals(batchId, resp.getBatchId());
        assertEquals(1, resp.getTotalCount());
        verify(repository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Batch create fails when exceeding maxBatchItems")
    void testBatchCreateExceedsLimit() {
        properties.setMaxBatchItems(2);
        BatchCreateTempCodeRequest req = BatchCreateTempCodeRequest.builder()
                .items(List.of(
                        BatchItemRequest.builder().name("1").build(),
                        BatchItemRequest.builder().name("2").build(),
                        BatchItemRequest.builder().name("3").build()
                ))
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                service.createBatch(req, null, "127.0.0.1"));
    }

    @Test
    @DisplayName("Batch update extends or deactivates all codes in the batch")
    void testBatchUpdate() {
        String ownerToken = "tok_test_owner";
        UUID batchId = UUID.randomUUID();

        TempCodeEntity e1 = TempCodeEntity.builder()
                .id(UUID.randomUUID())
                .batchId(batchId)
                .name("Item 1")
                .token("tok1")
                .tokenHash("hash1")
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .barcodeFormat("code128")
                .status("ACTIVE")
                .createdAt(testClock.instant())
                .expiresAt(testClock.instant().plus(1, ChronoUnit.HOURS))
                .build();

        when(repository.findByOwnerTokenHashAndBatchId(anyString(), eq(batchId)))
                .thenReturn(List.of(e1));

        UpdateTempCodeRequest req = UpdateTempCodeRequest.builder()
                .action("extend")
                .extensionSeconds(7200L)
                .build();

        List<TempCodeResponse> updated = service.updateBatch(batchId, req, ownerToken);
        assertEquals(1, updated.size());
        assertEquals(testClock.instant().plus(3, ChronoUnit.HOURS), e1.getExpiresAt());
        verify(repository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Batch delete removes all codes with matching batchId for owner")
    void testBatchDelete() {
        String ownerToken = "tok_test_owner";
        UUID batchId = UUID.randomUUID();

        service.deleteBatch(batchId, ownerToken);
        verify(repository, times(1)).deleteByOwnerTokenHashAndBatchId(anyString(), eq(batchId));
    }
}
