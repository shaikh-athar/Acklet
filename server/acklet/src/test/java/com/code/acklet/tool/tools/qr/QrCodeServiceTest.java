package com.code.acklet.tool.tools.qr;

import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ConflictException;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.dto.CreateDynamicQrRequest;
import com.code.acklet.tool.tools.qr.dto.DynamicQrResponse;
import com.code.acklet.tool.tools.qr.dto.QrPublicInfoDto;
import com.code.acklet.tool.tools.qr.dto.UpdateDynamicQrRequest;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.repository.QrAssetRepository;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.service.QrCodeService;
import com.code.acklet.tool.tools.qr.storage.QrStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QrCodeServiceTest {

    @Mock
    private QrCodeRepository qrCodeRepository;

    @Mock
    private QrAssetRepository qrAssetRepository;

    @Mock
    private QrStorageService storageService;

    @Mock
    private PasswordEncoder passwordEncoder;

    private QrProperties properties;
    private QrCodeService qrCodeService;

    @BeforeEach
    void setUp() {
        properties = new QrProperties();
        properties.setShortlinkBaseUrl("https://acklet.dev/q");
        qrCodeService = new QrCodeService(qrCodeRepository, qrAssetRepository, storageService, properties, passwordEncoder);
    }

    @Test
    void testCreateDynamicQrSuccess() {
        when(qrCodeRepository.existsByCode(anyString())).thenReturn(false);
        when(qrCodeRepository.save(any(QrCodeEntity.class))).thenAnswer(invocation -> {
            QrCodeEntity e = invocation.getArgument(0);
            e.setAssets(new ArrayList<>());
            return e;
        });

        CreateDynamicQrRequest request = CreateDynamicQrRequest.builder()
                .type("DYNAMIC_URL")
                .title("My Campaign")
                .targetUrl("https://acklet.dev/promo")
                .build();

        DynamicQrResponse response = qrCodeService.createDynamicQr(request);

        assertNotNull(response);
        assertNotNull(response.getCode());
        assertNotNull(response.getManageKey());
        assertTrue(response.getShortUrl().startsWith("https://acklet.dev/q/"));
        assertEquals("DYNAMIC_URL", response.getType());
        assertEquals("ACTIVE", response.getStatus());
        verify(qrCodeRepository).save(any(QrCodeEntity.class));
    }

    @Test
    void testCustomSlugCollisionThrowsConflict() {
        when(qrCodeRepository.existsByCode("my-brand")).thenReturn(true);

        CreateDynamicQrRequest request = CreateDynamicQrRequest.builder()
                .customSlug("my-brand")
                .targetUrl("https://acklet.dev")
                .build();

        assertThrows(ConflictException.class, () -> qrCodeService.createDynamicQr(request));
    }

    @Test
    void testInvalidTargetUrlThrowsBadRequest() {
        CreateDynamicQrRequest request = CreateDynamicQrRequest.builder()
                .targetUrl("javascript:alert(1)")
                .build();

        assertThrows(BadRequestException.class, () -> qrCodeService.createDynamicQr(request));
    }

    @Test
    void testPauseAndResume() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("k8s9x2")
                .status("ACTIVE")
                .manageKeyHash("dummyHash")
                .assets(new ArrayList<>())
                .build();

        when(qrCodeRepository.findByManageKeyHash(anyString())).thenReturn(Optional.of(entity));
        when(qrCodeRepository.save(any(QrCodeEntity.class))).thenAnswer(i -> i.getArgument(0));

        DynamicQrResponse paused = qrCodeService.setStatus("mySecretKey", "PAUSED");
        assertEquals("PAUSED", paused.getStatus());

        DynamicQrResponse resumed = qrCodeService.setStatus("mySecretKey", "ACTIVE");
        assertEquals("ACTIVE", resumed.getStatus());
    }

    @Test
    void testPublicInfoMasksPasswordProtectedData() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("secret123")
                .type("DYNAMIC_URL")
                .title("Confidential Document")
                .targetUrl("https://internal.acklet.dev/doc")
                .contentJson("{\"secret\":true}")
                .hasPassword(true)
                .passwordHash("hashedPass")
                .status("ACTIVE")
                .assets(new ArrayList<>())
                .build();

        when(qrCodeRepository.findByCode("secret123")).thenReturn(Optional.of(entity));

        QrPublicInfoDto publicInfo = qrCodeService.getPublicInfo("secret123");

        assertTrue(publicInfo.isHasPassword());
        assertNull(publicInfo.getTargetUrl(), "Target URL should be masked when password protected");
        assertNull(publicInfo.getContentJson(), "Content JSON should be masked when password protected");
    }

    @Test
    void testSlugCollisionAutoRetries() {
        // First 2 slugs collide, 3rd is unique
        when(qrCodeRepository.existsByCode(anyString()))
                .thenReturn(true)
                .thenReturn(true)
                .thenReturn(false);

        when(qrCodeRepository.save(any(QrCodeEntity.class))).thenAnswer(i -> {
            QrCodeEntity e = i.getArgument(0);
            e.setAssets(new ArrayList<>());
            return e;
        });

        CreateDynamicQrRequest request = CreateDynamicQrRequest.builder()
                .type("DYNAMIC_URL")
                .targetUrl("https://acklet.dev/retry")
                .build();

        DynamicQrResponse response = qrCodeService.createDynamicQr(request);
        assertNotNull(response);
        assertNotNull(response.getCode());
        verify(qrCodeRepository, atLeast(3)).existsByCode(anyString());
    }

    @Test
    void testCreateAllDynamicTypes() {
        String[] types = new String[] {
                "DYNAMIC_PDF", "DYNAMIC_MENU", "DYNAMIC_COUPON", "DYNAMIC_VCARD", "DYNAMIC_MULTI_URL"
        };

        when(qrCodeRepository.existsByCode(anyString())).thenReturn(false);
        when(qrCodeRepository.save(any(QrCodeEntity.class))).thenAnswer(i -> {
            QrCodeEntity e = i.getArgument(0);
            e.setAssets(new ArrayList<>());
            return e;
        });

        for (String type : types) {
            CreateDynamicQrRequest request = CreateDynamicQrRequest.builder()
                    .type(type)
                    .title("Test " + type)
                    .contentJson("{\"type\":\"" + type + "\"}")
                    .build();

            DynamicQrResponse response = qrCodeService.createDynamicQr(request);
            assertEquals(type, response.getType());
            assertEquals("Test " + type, response.getTitle());
            assertNotNull(response.getShortUrl());
        }
    }

    @Test
    void testVerifyPasswordSuccessAndFailure() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("locked99")
                .type("DYNAMIC_PDF")
                .hasPassword(true)
                .passwordHash("encodedHash")
                .targetUrl("https://acklet.dev/secret.pdf")
                .contentJson("{\"doc\":\"secret\"}")
                .assets(new ArrayList<>())
                .status("ACTIVE")
                .build();

        when(qrCodeRepository.findByCode("locked99")).thenReturn(Optional.of(entity));
        when(passwordEncoder.matches("correct123", "encodedHash")).thenReturn(true);
        when(passwordEncoder.matches("wrongPass", "encodedHash")).thenReturn(false);

        // Success
        QrPublicInfoDto verified = qrCodeService.verifyPasswordAndGetInfo("locked99", "correct123");
        assertNotNull(verified);
        assertEquals("https://acklet.dev/secret.pdf", verified.getTargetUrl());
        assertEquals("{\"doc\":\"secret\"}", verified.getContentJson());

        // Failure
        assertThrows(ForbiddenException.class, () ->
                qrCodeService.verifyPasswordAndGetInfo("locked99", "wrongPass")
        );
    }

    @Test
    void testUpdateDynamicQrDetailsAndRemovePassword() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("upd123")
                .type("DYNAMIC_URL")
                .title("Original Title")
                .targetUrl("https://acklet.dev/old")
                .manageKeyHash("dummyHash")
                .hasPassword(true)
                .passwordHash("oldPass")
                .status("ACTIVE")
                .assets(new ArrayList<>())
                .build();

        when(qrCodeRepository.findByManageKeyHash(anyString())).thenReturn(Optional.of(entity));
        when(qrCodeRepository.save(any(QrCodeEntity.class))).thenAnswer(i -> i.getArgument(0));

        UpdateDynamicQrRequest update = UpdateDynamicQrRequest.builder()
                .title("New Title")
                .targetUrl("https://acklet.dev/new")
                .contentJson("{\"updated\":true}")
                .removePassword(true)
                .build();

        DynamicQrResponse updated = qrCodeService.updateByManageKey("myKey", update);
        assertEquals("New Title", updated.getTitle());
        assertEquals("https://acklet.dev/new", updated.getTargetUrl());
        assertEquals("{\"updated\":true}", updated.getContentJson());
        assertFalse(updated.isHasPassword());
    }
}

