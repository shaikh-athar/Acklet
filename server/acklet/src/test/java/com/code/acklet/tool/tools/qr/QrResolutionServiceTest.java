package com.code.acklet.tool.tools.qr;

import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.service.QrAnalyticsService;
import com.code.acklet.tool.tools.qr.service.QrResolutionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QrResolutionServiceTest {

    @Mock
    private QrCodeRepository qrCodeRepository;

    @Mock
    private QrAnalyticsService analyticsService;

    @Mock
    private HttpServletRequest request;

    private QrProperties properties;
    private QrResolutionService resolutionService;

    @BeforeEach
    void setUp() {
        properties = new QrProperties();
        properties.setClientLandingBaseUrl("https://acklet.dev/tools/qr-generator/view");
        resolutionService = new QrResolutionService(qrCodeRepository, analyticsService, properties);
    }

    @Test
    void testDirectUrlResolvesTo302() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("abc123")
                .type("DYNAMIC_URL")
                .targetUrl("https://destination.example.com")
                .status("ACTIVE")
                .hasPassword(false)
                .build();

        when(qrCodeRepository.findByCode("abc123")).thenReturn(Optional.of(entity));

        ResponseEntity<?> response = resolutionService.resolveShortlink("abc123", request);

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(URI.create("https://destination.example.com"), response.getHeaders().getLocation());
        verify(analyticsService).recordScan(eq(entity), any(HttpServletRequest.class));
    }

    @Test
    void testLandingPageTypeResolvesTo307() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("menu99")
                .type("DYNAMIC_MENU")
                .status("ACTIVE")
                .hasPassword(false)
                .build();

        when(qrCodeRepository.findByCode("menu99")).thenReturn(Optional.of(entity));

        ResponseEntity<?> response = resolutionService.resolveShortlink("menu99", request);

        assertEquals(HttpStatus.TEMPORARY_REDIRECT, response.getStatusCode());
        assertEquals(URI.create("https://acklet.dev/tools/qr-generator/view/menu99"), response.getHeaders().getLocation());
        verify(analyticsService).recordScan(eq(entity), any(HttpServletRequest.class));
    }

    @Test
    void testPausedLinkRedirectsToPausedNotice() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("paused1")
                .type("DYNAMIC_URL")
                .status("PAUSED")
                .build();

        when(qrCodeRepository.findByCode("paused1")).thenReturn(Optional.of(entity));

        ResponseEntity<?> response = resolutionService.resolveShortlink("paused1", request);

        assertEquals(HttpStatus.TEMPORARY_REDIRECT, response.getStatusCode());
        assertEquals(URI.create("https://acklet.dev/tools/qr-generator/view/paused1?paused=true"), response.getHeaders().getLocation());
        verifyNoInteractions(analyticsService);
    }

    @Test
    void testExpiredLinkRedirectsToExpiredNotice() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("exp123")
                .type("DYNAMIC_URL")
                .status("ACTIVE")
                .expiresAt(Instant.now().minusSeconds(3600))
                .build();

        when(qrCodeRepository.findByCode("exp123")).thenReturn(Optional.of(entity));

        ResponseEntity<?> response = resolutionService.resolveShortlink("exp123", request);

        assertEquals(HttpStatus.TEMPORARY_REDIRECT, response.getStatusCode());
        assertEquals(URI.create("https://acklet.dev/tools/qr-generator/view/exp123?expired=true"), response.getHeaders().getLocation());
        verifyNoInteractions(analyticsService);
    }

    @Test
    void testPasswordProtectedRedirectsToAuthRequired() {
        QrCodeEntity entity = QrCodeEntity.builder()
                .code("gate77")
                .type("DYNAMIC_PDF")
                .status("ACTIVE")
                .hasPassword(true)
                .build();

        when(qrCodeRepository.findByCode("gate77")).thenReturn(Optional.of(entity));

        ResponseEntity<?> response = resolutionService.resolveShortlink("gate77", request);

        assertEquals(HttpStatus.TEMPORARY_REDIRECT, response.getStatusCode());
        assertEquals(URI.create("https://acklet.dev/tools/qr-generator/view/gate77?auth=required"), response.getHeaders().getLocation());
        verify(analyticsService).recordScan(eq(entity), any(HttpServletRequest.class));
    }
}

