package com.code.acklet.tool.tools.shortener;

import com.code.acklet.shared.security.RateLimitingService;
import com.code.acklet.tool.tools.shortener.config.ShortenerProperties;
import com.code.acklet.tool.tools.shortener.dto.*;
import com.code.acklet.tool.tools.shortener.entity.ShortLinkEntity;
import com.code.acklet.tool.tools.shortener.repository.ShortLinkRepository;
import com.code.acklet.tool.tools.shortener.service.ShortLinkService;
import com.code.acklet.tool.tools.shortener.util.ShortenerSecurityHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShortLinkServiceTest {

    @Mock
    private ShortLinkRepository repository;

    @Mock
    private com.code.acklet.tool.tools.shortener.repository.ShortLinkDailyClickRepository dailyClickRepository;

    @Mock
    private com.code.acklet.tool.tools.shortener.repository.ShortLinkReportRepository reportRepository;

    @Mock
    private RateLimitingService rateLimitingService;

    private ShortenerProperties properties;
    private ShortenerSecurityHelper securityHelper;
    private ShortLinkService service;

    @BeforeEach
    void setUp() {
        properties = new ShortenerProperties();
        properties.setBaseUrl("http://localhost:8080/s");
        properties.setCodeLength(6);
        properties.getSecurity().setPepper("test_pepper");
        properties.getSecurity().setShortDomains(List.of("urlshortener.localhost", "localhost", "acklet.com"));
        properties.getValidation().setBlockPrivateTargets(true);

        securityHelper = new ShortenerSecurityHelper(properties, new BCryptPasswordEncoder());

        lenient().when(rateLimitingService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);

        service = new ShortLinkService(repository, dailyClickRepository, reportRepository, securityHelper, properties, rateLimitingService);
    }

    @Test
    @DisplayName("Should create short link with auto-generated code and owner token")
    void testCreateLinkAutoCode() {
        when(repository.existsByCode(anyString())).thenReturn(false);

        CreateShortLinkRequest req = CreateShortLinkRequest.builder()
                .targetUrl("https://example.com/target-page")
                .label("My Test Link")
                .isOneTime(true)
                .build();

        ShortLinkResponse res = service.createLink(req, null, "192.0.2.1");

        assertNotNull(res);
        assertNotNull(res.getCode());
        assertEquals("https://example.com/target-page", res.getTargetUrl());
        assertEquals("My Test Link", res.getLabel());
        assertTrue(res.getIsOneTime());
        assertNotNull(res.getOwnerToken());
        assertTrue(res.getOwnerToken().startsWith("tok_"));
        verify(repository, times(1)).save(any(ShortLinkEntity.class));
    }

    @Test
    @DisplayName("Should reject link creation if custom alias is already taken")
    void testCreateLinkDuplicateAlias() {
        when(repository.existsByCode("my-alias")).thenReturn(true);

        CreateShortLinkRequest req = CreateShortLinkRequest.builder()
                .targetUrl("https://example.com")
                .customAlias("my-alias")
                .build();

        assertThrows(ResponseStatusException.class, () ->
                service.createLink(req, null, "192.0.2.1"));
    }

    @Test
    @DisplayName("Should reject access to link details with invalid owner token")
    void testGetLinkUnauthorized() {
        String token = securityHelper.generateOwnerToken();
        String tokenHash = securityHelper.hashOwnerToken(token);

        ShortLinkEntity entity = ShortLinkEntity.builder()
                .code("abc123")
                .targetUrl("https://example.com")
                .ownerTokenHash(tokenHash)
                .build();

        when(repository.findByCode("abc123")).thenReturn(Optional.of(entity));

        // Missing token -> 401
        assertThrows(ResponseStatusException.class, () -> service.getLink("abc123", null));

        // Wrong token -> 403
        assertThrows(ResponseStatusException.class, () -> service.getLink("abc123", "tok_wrong_token"));

        // Correct token -> Success
        ShortLinkResponse res = service.getLink("abc123", token);
        assertEquals("abc123", res.getCode());
    }

    @Test
    @DisplayName("Should update link metadata and re-hash password")
    void testUpdateLink() {
        String token = securityHelper.generateOwnerToken();
        String tokenHash = securityHelper.hashOwnerToken(token);

        ShortLinkEntity entity = ShortLinkEntity.builder()
                .code("upd123")
                .targetUrl("https://example.com/old")
                .ownerTokenHash(tokenHash)
                .build();

        when(repository.findByCode("upd123")).thenReturn(Optional.of(entity));

        UpdateShortLinkRequest updateReq = UpdateShortLinkRequest.builder()
                .targetUrl("https://example.com/new")
                .label("Updated Label")
                .password("newSecretPass")
                .build();

        ShortLinkResponse updated = service.updateLink("upd123", updateReq, token);

        assertEquals("https://example.com/new", updated.getTargetUrl());
        assertEquals("Updated Label", updated.getLabel());
        assertTrue(updated.getHasPassword());
        verify(repository, atLeastOnce()).save(entity);
    }

    @Test
    @DisplayName("Should soft-delete and toggle deactivation")
    void testDeleteAndDeactivate() {
        String token = securityHelper.generateOwnerToken();
        String tokenHash = securityHelper.hashOwnerToken(token);

        ShortLinkEntity entity = ShortLinkEntity.builder()
                .code("del123")
                .targetUrl("https://example.com")
                .ownerTokenHash(tokenHash)
                .isDeactivated(false)
                .build();

        when(repository.findByCode("del123")).thenReturn(Optional.of(entity));

        service.deactivateLink("del123", token);
        assertTrue(entity.getIsDeactivated());

        service.reactivateLink("del123", token);
        assertFalse(entity.getIsDeactivated());

        service.deleteLink("del123", token);
        assertNotNull(entity.getDeletedAt());
    }

    @Test
    @DisplayName("Should migrate client links idempotently preserving PBKDF2 hash")
    void testMigrateLinks() {
        when(repository.existsByCode("mig1")).thenReturn(false);

        ShortLinkMigrateItem item = ShortLinkMigrateItem.builder()
                .code("mig1")
                .targetUrl("https://example.com/migrated")
                .label("Migrated Item")
                .hasPassword(true)
                .passwordHash("pbkdf2:100000:0123456789abcdef:fedcba9876543210")
                .clicks(5L)
                .build();

        ShortLinkMigrateRequest req = ShortLinkMigrateRequest.builder()
                .ownerToken("tok_migrated_owner")
                .items(List.of(item))
                .build();

        ShortLinkMigrateResponse res = service.migrateLinks(req, "192.0.2.1");

        assertEquals(1, res.getMigratedCount());
        assertEquals("mig1", res.getCodeMapping().get("mig1"));
        verify(repository, times(1)).save(any(ShortLinkEntity.class));
    }
}
