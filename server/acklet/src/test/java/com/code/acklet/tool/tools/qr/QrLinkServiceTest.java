package com.code.acklet.tool.tools.qr;

import com.code.acklet.tool.tools.qr.config.QrLinkProperties;
import com.code.acklet.tool.tools.qr.dto.*;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.entity.QrLinkEntity;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.repository.QrLinkRepository;
import com.code.acklet.tool.tools.qr.service.QrLinkService;
import com.code.acklet.tool.tools.qr.util.QrSecurityUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QrLinkServiceTest {

    @Mock
    private QrLinkRepository qrLinkRepository;

    @Mock
    private QrCodeRepository qrCodeRepository;

    private QrLinkProperties properties;
    private QrLinkService qrLinkService;

    @BeforeEach
    void setUp() {
        properties = new QrLinkProperties();
        properties.setShortlinkBaseUrl("https://acklet.dev/q");
        properties.setMaxTextChars(20000);
        properties.setMaxUrlChars(4000);
        properties.setMaxOtherBytes(10000);
        properties.setDefaultTtlMonths(12);
        properties.setOrphanTtlHours(24);
        properties.setCreateRateLimitPerMinute(60);
        properties.setBlockPrivateTargets(true);

        qrLinkService = new QrLinkService(qrLinkRepository, properties, qrCodeRepository);
    }

    @Test
    @DisplayName("Create valid URL link with 7-char code and manage token")
    void testCreateValidUrlLink() {
        when(qrLinkRepository.existsByCode(anyString())).thenReturn(false);

        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("URL")
                .payload("https://acklet.dev/features?utm_source=qr")
                .build();

        QrLinkResponse response = qrLinkService.createLink(request, "127.0.0.1");

        assertNotNull(response.getCode());
        assertEquals(7, response.getCode().length());
        assertTrue(response.getShortUrl().startsWith("https://acklet.dev/q/"));
        assertNotNull(response.getManageToken());
        assertTrue(response.getManageToken().startsWith("tok_"));
        assertEquals("ACTIVE", response.getStatus());
        assertEquals("URL", response.getType());

        ArgumentCaptor<QrLinkEntity> captor = ArgumentCaptor.forClass(QrLinkEntity.class);
        verify(qrLinkRepository).save(captor.capture());
        QrLinkEntity saved = captor.getValue();
        assertEquals(response.getCode(), saved.getCode());
        assertEquals(QrSecurityUtil.sha256(response.getManageToken()), saved.getManageTokenHash());
    }

    @Test
    @DisplayName("Validate URL scheme reject javascript and file schemes")
    void testRejectInvalidUrlSchemes() {
        CreateQrLinkRequest jsRequest = CreateQrLinkRequest.builder()
                .type("URL")
                .payload("javascript:alert(1)")
                .build();

        assertThrows(IllegalArgumentException.class, () -> qrLinkService.createLink(jsRequest, "10.0.0.1"));

        CreateQrLinkRequest fileRequest = CreateQrLinkRequest.builder()
                .type("URL")
                .payload("file:///etc/passwd")
                .build();

        assertThrows(IllegalArgumentException.class, () -> qrLinkService.createLink(fileRequest, "10.0.0.1"));
    }

    @Test
    @DisplayName("Validate private IP targets blocked in production mode")
    void testRejectPrivateTargetUrls() {
        CreateQrLinkRequest localRequest = CreateQrLinkRequest.builder()
                .type("URL")
                .payload("http://localhost:3000/internal")
                .build();

        assertThrows(IllegalArgumentException.class, () -> qrLinkService.createLink(localRequest, "10.0.0.1"));

        CreateQrLinkRequest loopbackRequest = CreateQrLinkRequest.builder()
                .type("URL")
                .payload("http://127.0.0.1/admin")
                .build();

        assertThrows(IllegalArgumentException.class, () -> qrLinkService.createLink(loopbackRequest, "10.0.0.1"));
    }

    @Test
    @DisplayName("Enforce character limits on Plain Text (max 20,000 characters)")
    void testTextCharacterLimit() {
        when(qrLinkRepository.existsByCode(anyString())).thenReturn(false);
        String validText = "A".repeat(20000);
        CreateQrLinkRequest validReq = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(validText)
                .build();
        assertNotNull(qrLinkService.createLink(validReq, "1.2.3.4"));

        String oversized = "A".repeat(20001);
        CreateQrLinkRequest invalidReq = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(oversized)
                .build();
        assertThrows(IllegalArgumentException.class, () -> qrLinkService.createLink(invalidReq, "1.2.3.4"));
    }

    @Test
    @DisplayName("Enforce byte limits on OTHER / vCard (max 10,000 bytes)")
    void testOtherPayloadByteLimit() {
        byte[] largeBytes = new byte[10001];
        java.util.Arrays.fill(largeBytes, (byte) 'x');
        String largePayload = new String(largeBytes);

        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("VCARD")
                .payload(largePayload)
                .build();

        assertThrows(IllegalArgumentException.class, () -> qrLinkService.createLink(request, "1.2.3.4"));
    }

    @Test
    @DisplayName("Update payload succeeds with correct manage token, fails with invalid token")
    void testUpdateLinkPermissions() {
        String rawToken = "tok_secret_manage_token_123";
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        QrLinkEntity entity = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("test1234")
                .type("TEXT")
                .payload("Initial text")
                .manageTokenHash(tokenHash)
                .status("ACTIVE")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        when(qrLinkRepository.findByCode("test1234")).thenReturn(Optional.of(entity));

        UpdateQrLinkRequest updateRequest = UpdateQrLinkRequest.builder()
                .type("TEXT")
                .payload("Updated text content with Hindi नमस्कार and emoji 🎉")
                .build();

        // Fail with wrong token
        assertThrows(ResponseStatusException.class, () ->
                qrLinkService.updateLink("test1234", updateRequest, "tok_wrong_token"));

        // Succeed with correct token
        QrLinkResponse updated = qrLinkService.updateLink("test1234", updateRequest, rawToken);
        assertEquals("test1234", updated.getCode());
        verify(qrLinkRepository).save(entity);
        assertEquals("Updated text content with Hindi नमस्कार and emoji 🎉", entity.getPayload());
    }

    @Test
    @DisplayName("Disable and enable link status with manage token")
    void testDisableAndEnable() {
        String rawToken = "tok_status_toggle";
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        QrLinkEntity entity = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("status1")
                .manageTokenHash(tokenHash)
                .status("ACTIVE")
                .expiresAt(Instant.now().plus(10, ChronoUnit.DAYS))
                .build();

        when(qrLinkRepository.findByCode("status1")).thenReturn(Optional.of(entity));

        qrLinkService.setStatus("status1", "DISABLED", rawToken);
        assertEquals("DISABLED", entity.getStatus());

        qrLinkService.setStatus("status1", "ACTIVE", rawToken);
        assertEquals("ACTIVE", entity.getStatus());
    }

    @Test
    @DisplayName("Extend expiry extends rolling retention by 12 months")
    void testExtendExpiry() {
        String rawToken = "tok_extend_ttl";
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        Instant oldExpiry = Instant.now().plus(1, ChronoUnit.DAYS);
        QrLinkEntity entity = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("extend1")
                .manageTokenHash(tokenHash)
                .expiresAt(oldExpiry)
                .build();

        when(qrLinkRepository.findByCode("extend1")).thenReturn(Optional.of(entity));

        qrLinkService.extendExpiry("extend1", rawToken);
        assertTrue(entity.getExpiresAt().isAfter(Instant.now().plus(300, ChronoUnit.DAYS)));
    }

    @Test
    @DisplayName("Mark downloaded protects link from orphan cleanup")
    void testMarkDownloaded() {
        QrLinkEntity entity = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("download1")
                .isDownloaded(false)
                .build();

        when(qrLinkRepository.findByCode("download1")).thenReturn(Optional.of(entity));

        qrLinkService.markDownloaded("download1");
        assertTrue(entity.getIsDownloaded());
        verify(qrLinkRepository).save(entity);
    }

    @Test
    @DisplayName("Lookup summaries matches tokens and returns summaries for Dynamic Links tab")
    void testLookupSummaries() {
        String token1 = "tok_user1";
        String token2 = "tok_user2";

        QrLinkEntity link1 = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("code1")
                .type("TEXT")
                .payload("Short preview of text")
                .manageTokenHash(QrSecurityUtil.sha256(token1))
                .status("ACTIVE")
                .scanCount(42L)
                .createdAt(Instant.now().minus(5, ChronoUnit.DAYS))
                .expiresAt(Instant.now().plus(300, ChronoUnit.DAYS))
                .build();

        when(qrLinkRepository.findByCodeIn(List.of("code1", "code2"))).thenReturn(List.of(link1));

        QrLinkLookupRequest lookup = QrLinkLookupRequest.builder()
                .links(List.of(
                        new QrLinkLookupItem("code1", token1),
                        new QrLinkLookupItem("code2", token2)
                ))
                .build();

        List<QrLinkSummaryDto> results = qrLinkService.lookupSummaries(lookup);
        assertEquals(1, results.size());
        assertEquals("code1", results.get(0).getCode());
        assertEquals("Short preview of text", results.get(0).getPreview());
        assertEquals(42L, results.get(0).getScanCount());
    }

    @Test
    @DisplayName("Scheduled cleanup triggers deletion of expired and orphan links")
    void testScheduledCleanup() {
        when(qrLinkRepository.deleteExpiredLinks(any(Instant.class), eq("EXPIRED"))).thenReturn(5);
        when(qrLinkRepository.deleteOrphanLinks(any(Instant.class))).thenReturn(3);

        qrLinkService.cleanupExpiredAndOrphanLinks();

        verify(qrLinkRepository).deleteExpiredLinks(any(Instant.class), eq("EXPIRED"));
        verify(qrLinkRepository).deleteOrphanLinks(any(Instant.class));
    }

    @Test
    @DisplayName("Case-sensitive lookup distinguishes between codes differing only by case (e.g. aB3 vs Ab3)")
    void testCaseSensitiveLookup() {
        QrLinkEntity lowerCaseEntity = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("aB3")
                .type("URL")
                .payload("https://acklet.dev/lower")
                .status("ACTIVE")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        QrLinkEntity upperCaseEntity = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("Ab3")
                .type("URL")
                .payload("https://acklet.dev/upper")
                .status("ACTIVE")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        // When queried for "aB3", repository returns lowerCaseEntity
        when(qrLinkRepository.findByCode("aB3")).thenReturn(Optional.of(lowerCaseEntity));
        Optional<QrLinkEntity> foundLower = qrLinkService.findByCode("aB3");
        assertTrue(foundLower.isPresent());
        assertEquals("aB3", foundLower.get().getCode());
        assertEquals("https://acklet.dev/lower", foundLower.get().getPayload());

        // When queried for "Ab3", repository returns upperCaseEntity
        when(qrLinkRepository.findByCode("Ab3")).thenReturn(Optional.of(upperCaseEntity));
        Optional<QrLinkEntity> foundUpper = qrLinkService.findByCode("Ab3");
        assertTrue(foundUpper.isPresent());
        assertEquals("Ab3", foundUpper.get().getCode());
        assertEquals("https://acklet.dev/upper", foundUpper.get().getPayload());

        // If a case-insensitive database returns upperCaseEntity when searching for "ab3",
        // findByCode's exact filter safely drops the mismatched entity
        when(qrLinkRepository.findByCode("ab3")).thenReturn(Optional.of(upperCaseEntity));
        Optional<QrLinkEntity> mismatched = qrLinkService.findByCode("ab3");
        assertFalse(mismatched.isPresent(), "Mismatched case entity must be filtered out");
    }

    @Test
    @DisplayName("Hindi and emoji payloads round trip cleanly with NFC normalization")
    void testHindiAndEmojiPayloadRoundTrip() {
        when(qrLinkRepository.existsByCode(anyString())).thenReturn(false);

        String multilingualText = "नमस्ते दुनिया! Acklet QR 🚀✨🎉 नमस्ते भारत";
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(multilingualText)
                .build();

        QrLinkResponse response = qrLinkService.createLink(request, "127.0.0.1");

        assertNotNull(response);
        assertEquals("TEXT", response.getType());
        assertTrue(response.getContentBytes() > multilingualText.length());

        ArgumentCaptor<QrLinkEntity> captor = ArgumentCaptor.forClass(QrLinkEntity.class);
        verify(qrLinkRepository).save(captor.capture());
        QrLinkEntity saved = captor.getValue();
        assertEquals(multilingualText, saved.getPayload());
    }

    @Test
    @DisplayName("Oversized payload exceeding maxTextChars (20000) is rejected")
    void testOversizedPayloadRejected() {
        String oversized = "A".repeat(20001);
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(oversized)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                qrLinkService.createLink(request, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("exceeds maximum limit"));
    }

    @Test
    @DisplayName("Forbidden schemes (javascript:, data:, file:) are rejected upon creation")
    void testInvalidTargetSchemesRejected() {
        CreateQrLinkRequest jsRequest = CreateQrLinkRequest.builder()
                .type("URL")
                .payload("javascript:void(0)")
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                qrLinkService.createLink(jsRequest, "127.0.0.1")
        );

        CreateQrLinkRequest dataRequest = CreateQrLinkRequest.builder()
                .type("URL")
                .payload("data:text/html,<script>alert(1)</script>")
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                qrLinkService.createLink(dataRequest, "127.0.0.1")
        );

        CreateQrLinkRequest fileRequest = CreateQrLinkRequest.builder()
                .type("URL")
                .payload("file:///etc/passwd")
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                qrLinkService.createLink(fileRequest, "127.0.0.1")
        );
    }

    @Test
    @DisplayName("Legacy qr_codes record is auto-migrated and previewable via getStats (Fix for 5LirxQ bug)")
    void testLegacyQrCodeStatsAndAutoMigration() {
        String code = "5LirxQ";
        String rawToken = "mySecretManageKey123";
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        QrCodeEntity legacy = QrCodeEntity.builder()
                .code(code)
                .type("DYNAMIC_URL")
                .title("head")
                .targetUrl("https://claude.ai/chat/219f2744-dd58-44c2-93d3-ec994b39fd59")
                .manageKeyHash(tokenHash)
                .scanCount(0L)
                .status("ACTIVE")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(qrLinkRepository.findByCode(code)).thenReturn(Optional.empty());
        when(qrCodeRepository.findByCode(code)).thenReturn(Optional.of(legacy));

        QrLinkStatsDto stats = qrLinkService.getStats(code, rawToken);

        assertNotNull(stats);
        assertEquals(code, stats.getCode());
        assertEquals("URL", stats.getType());
        assertEquals("https://claude.ai/chat/219f2744-dd58-44c2-93d3-ec994b39fd59", stats.getPayload());
        assertEquals("ACTIVE", stats.getStatus());

        // Verify it was migrated and saved into qrLinkRepository
        verify(qrLinkRepository).save(argThat(entity ->
                entity.getCode().equals(code) &&
                entity.getType().equals("URL") &&
                entity.getPayload().equals("https://claude.ai/chat/219f2744-dd58-44c2-93d3-ec994b39fd59") &&
                entity.getManageTokenHash().equals(tokenHash) &&
                Boolean.TRUE.equals(entity.getIsDownloaded())
        ));
    }

    @Test
    @DisplayName("Updating a legacy QR code updates both QrLinkEntity and legacy qr_codes table")
    void testLegacyQrCodeUpdateSyncsBothTables() {
        String code = "5LirxQ";
        String rawToken = "mySecretManageKey123";
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        QrCodeEntity legacy = QrCodeEntity.builder()
                .code(code)
                .type("DYNAMIC_URL")
                .title("head")
                .targetUrl("https://old-url.com")
                .manageKeyHash(tokenHash)
                .status("ACTIVE")
                .build();

        when(qrLinkRepository.findByCode(code)).thenReturn(Optional.empty());
        when(qrCodeRepository.findByCode(code)).thenReturn(Optional.of(legacy));

        UpdateQrLinkRequest updateReq = UpdateQrLinkRequest.builder()
                .payload("https://new-url.com/destination")
                .type("URL")
                .build();

        QrLinkResponse response = qrLinkService.updateLink(code, updateReq, rawToken);

        assertNotNull(response);
        assertEquals(code, response.getCode());

        // Verify legacy record had its targetUrl updated
        assertEquals("https://new-url.com/destination", legacy.getTargetUrl());
        verify(qrCodeRepository).save(legacy);
    }

    @Test
    @DisplayName("Deleting a legacy QR code deletes from both qr_links and qr_codes")
    void testLegacyQrCodeDeleteRemovesBoth() {
        String code = "5LirxQ";
        String rawToken = "mySecretManageKey123";
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        QrCodeEntity legacy = QrCodeEntity.builder()
                .code(code)
                .type("DYNAMIC_URL")
                .manageKeyHash(tokenHash)
                .build();

        when(qrLinkRepository.findByCode(code)).thenReturn(Optional.empty());
        when(qrCodeRepository.findByCode(code)).thenReturn(Optional.of(legacy));

        qrLinkService.deleteLink(code, rawToken);

        verify(qrCodeRepository).delete(legacy);
        verify(qrLinkRepository).delete(any(QrLinkEntity.class));
    }

    @Test
    @DisplayName("lookupSummaries auto-migrates and returns legacy records when token matches")
    void testLegacyLookupSummariesAutoMigrates() {
        String code = "5LirxQ";
        String rawToken = "mySecretManageKey123";
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        QrCodeEntity legacy = QrCodeEntity.builder()
                .code(code)
                .type("DYNAMIC_URL")
                .targetUrl("https://claude.ai/chat/219f2744-dd58-44c2-93d3-ec994b39fd59")
                .manageKeyHash(tokenHash)
                .scanCount(5L)
                .status("ACTIVE")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(qrLinkRepository.findByCodeIn(List.of(code))).thenReturn(List.of());
        when(qrCodeRepository.findByCode(code)).thenReturn(Optional.of(legacy));

        QrLinkLookupRequest req = QrLinkLookupRequest.builder()
                .links(List.of(new QrLinkLookupItem(code, rawToken)))
                .build();

        List<QrLinkSummaryDto> summaries = qrLinkService.lookupSummaries(req);

        assertEquals(1, summaries.size());
        assertEquals(code, summaries.get(0).getCode());
        assertEquals("URL", summaries.get(0).getType());
        assertEquals(5L, summaries.get(0).getScanCount());

        verify(qrLinkRepository).save(any(QrLinkEntity.class));
    }

    @Test
    @DisplayName("Legacy record with invalid token throws 403 Forbidden")
    void testLegacyQrCodeInvalidTokenThrowsForbidden() {
        String code = "5LirxQ";
        String correctToken = "mySecretManageKey123";
        String wrongToken = "badToken";

        QrCodeEntity legacy = QrCodeEntity.builder()
                .code(code)
                .type("DYNAMIC_URL")
                .targetUrl("https://claude.ai")
                .manageKeyHash(QrSecurityUtil.sha256(correctToken))
                .build();

        when(qrLinkRepository.findByCode(code)).thenReturn(Optional.empty());
        when(qrCodeRepository.findByCode(code)).thenReturn(Optional.of(legacy));

        assertThrows(ResponseStatusException.class, () ->
                qrLinkService.getStats(code, wrongToken)
        );
    }
}
