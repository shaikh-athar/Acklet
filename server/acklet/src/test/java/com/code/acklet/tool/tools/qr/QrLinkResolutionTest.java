package com.code.acklet.tool.tools.qr;

import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.entity.QrLinkEntity;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.service.QrAnalyticsService;
import com.code.acklet.tool.tools.qr.service.QrLinkService;
import com.code.acklet.tool.tools.qr.service.QrResolutionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QrLinkResolutionTest {

    @Mock
    private QrCodeRepository qrCodeRepository;

    @Mock
    private QrAnalyticsService analyticsService;

    @Mock
    private QrLinkService qrLinkService;

    @Mock
    private HttpServletRequest servletRequest;

    private QrProperties qrProperties;
    private QrResolutionService resolutionService;

    @BeforeEach
    void setUp() {
        qrProperties = new QrProperties();
        resolutionService = new QrResolutionService(qrCodeRepository, analyticsService, qrProperties, qrLinkService);
    }

    @Test
    @DisplayName("Public resolver returns HTTP 302 Found for URL links")
    void testResolveUrlLinkReturns302() {
        QrLinkEntity link = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("link302")
                .type("URL")
                .payload("https://acklet.dev/tools/qr-generator")
                .status("ACTIVE")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        when(qrLinkService.findByCode("link302")).thenReturn(Optional.of(link));

        ResponseEntity<?> response = resolutionService.resolveShortlink("link302", servletRequest);

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(URI.create("https://acklet.dev/tools/qr-generator"), response.getHeaders().getLocation());
        assertEquals("no-cache, no-store, max-age=0, must-revalidate", response.getHeaders().getCacheControl());
        assertEquals("no-referrer", response.getHeaders().getFirst("Referrer-Policy"));
        assertEquals("noindex, nofollow", response.getHeaders().getFirst("X-Robots-Tag"));
        verify(qrLinkService).recordScanAsync("link302");
    }

    @Test
    @DisplayName("Public resolver returns mobile-first HTML with strict XSS escaping for TEXT")
    void testResolveTextLinkReturnsHtmlWithXssEscaping() {
        String unsafeText = "Meeting Notes:\n<script>alert('pwned')</script>\n<img src=x onerror=alert(1)>";
        QrLinkEntity link = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("textXss")
                .type("TEXT")
                .payload(unsafeText)
                .status("ACTIVE")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        when(qrLinkService.findByCode("textXss")).thenReturn(Optional.of(link));

        ResponseEntity<?> response = resolutionService.resolveShortlink("textXss", servletRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getHeaders().getContentType().toString().contains("text/html"));
        assertEquals("noindex, nofollow", response.getHeaders().getFirst("X-Robots-Tag"));
        assertEquals("no-referrer", response.getHeaders().getFirst("Referrer-Policy"));
        assertNotNull(response.getHeaders().getFirst("Content-Security-Policy"));

        String html = (String) response.getBody();
        assertNotNull(html);

        // Assert strictly escaped content in HTML (no unescaped scripts/images)
        assertFalse(html.contains("<script>alert('pwned')</script>"));
        assertTrue(html.contains("&lt;script&gt;alert"));
        assertFalse(html.contains("<img src=x onerror=alert(1)>"));
        assertTrue(html.contains("&lt;img src=x"));

        // Assert presence of mobile action buttons and hint
        assertTrue(html.contains("Copy"));
        assertTrue(html.contains("Share / Save to Notes"));
        assertTrue(html.contains("Download .txt"));
        assertTrue(html.contains("Hint: Tap"));
        assertTrue(html.contains("dir=\"auto\""));

        verify(qrLinkService).recordScanAsync("textXss");
    }

    @Test
    @DisplayName("Public resolver returns text/vcard Content-Type with inline header for VCARD")
    void testResolveVcardLink() {
        String vcard = "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD";
        QrLinkEntity link = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("vcard01")
                .type("VCARD")
                .payload(vcard)
                .status("ACTIVE")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        when(qrLinkService.findByCode("vcard01")).thenReturn(Optional.of(link));

        ResponseEntity<?> response = resolutionService.resolveShortlink("vcard01", servletRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getHeaders().getContentType().toString().contains("text/vcard"));
        assertEquals("inline; filename=\"contact.vcf\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
        assertEquals(vcard, response.getBody());
    }

    @Test
    @DisplayName("Public resolver returns friendly 410 HTML page when link is expired")
    void testResolveExpiredLink() {
        QrLinkEntity link = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("expired1")
                .type("URL")
                .payload("https://acklet.dev")
                .status("EXPIRED")
                .expiresAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .build();

        when(qrLinkService.findByCode("expired1")).thenReturn(Optional.of(link));

        ResponseEntity<?> response = resolutionService.resolveShortlink("expired1", servletRequest);

        assertEquals(HttpStatus.GONE, response.getStatusCode());
        assertEquals("noindex, nofollow", response.getHeaders().getFirst("X-Robots-Tag"));
        assertEquals("no-referrer", response.getHeaders().getFirst("Referrer-Policy"));
        String html = (String) response.getBody();
        assertNotNull(html);
        assertTrue(html.contains("Link Expired"));
        assertTrue(html.contains("HTTP 410"));
        verify(qrLinkService, never()).recordScanAsync(anyString());
    }

    @Test
    @DisplayName("Public resolver returns friendly 410 HTML page when link is deleted")
    void testResolveDeletedLink() {
        QrLinkEntity link = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("deleted1")
                .type("URL")
                .payload("https://acklet.dev")
                .status("DELETED")
                .expiresAt(Instant.now().plus(10, ChronoUnit.DAYS))
                .build();

        when(qrLinkService.findByCode("deleted1")).thenReturn(Optional.of(link));

        ResponseEntity<?> response = resolutionService.resolveShortlink("deleted1", servletRequest);

        assertEquals(HttpStatus.GONE, response.getStatusCode());
        assertEquals("noindex, nofollow", response.getHeaders().getFirst("X-Robots-Tag"));
        assertEquals("no-referrer", response.getHeaders().getFirst("Referrer-Policy"));
        String html = (String) response.getBody();
        assertNotNull(html);
        assertTrue(html.contains("Link Expired"));
        assertTrue(html.contains("HTTP 410"));
        verify(qrLinkService, never()).recordScanAsync(anyString());
    }

    @Test
    @DisplayName("Public resolver returns friendly 410 HTML page when link is disabled")
    void testResolveDisabledLink() {
        QrLinkEntity link = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("disabled1")
                .type("URL")
                .payload("https://acklet.dev")
                .status("DISABLED")
                .expiresAt(Instant.now().plus(10, ChronoUnit.DAYS))
                .build();

        when(qrLinkService.findByCode("disabled1")).thenReturn(Optional.of(link));

        ResponseEntity<?> response = resolutionService.resolveShortlink("disabled1", servletRequest);

        assertEquals(HttpStatus.GONE, response.getStatusCode());
        assertEquals("noindex, nofollow", response.getHeaders().getFirst("X-Robots-Tag"));
        assertEquals("no-referrer", response.getHeaders().getFirst("Referrer-Policy"));
        String html = (String) response.getBody();
        assertNotNull(html);
        assertTrue(html.contains("Link Disabled"));
        assertTrue(html.contains("HTTP 410"));
        verify(qrLinkService, never()).recordScanAsync(anyString());
    }

    @Test
    @DisplayName("Public resolver returns friendly 404 HTML page with security headers when code is not found")
    void testResolveNotFound() {
        when(qrLinkService.findByCode("missing")).thenReturn(Optional.empty());
        when(qrCodeRepository.findByCode("missing")).thenReturn(Optional.empty());

        ResponseEntity<?> response = resolutionService.resolveShortlink("missing", servletRequest);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("noindex, nofollow", response.getHeaders().getFirst("X-Robots-Tag"));
        assertEquals("no-referrer", response.getHeaders().getFirst("Referrer-Policy"));
        String html = (String) response.getBody();
        assertNotNull(html);
        assertTrue(html.contains("QR Code Not Found"));
        assertTrue(html.contains("HTTP 404"));
    }

    @Test
    @DisplayName("Invalid schemes (javascript:, data:, file:) in stored payload are rejected with 400")
    void testResolveInvalidSchemeRejected() {
        QrLinkEntity link = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("badScheme")
                .type("URL")
                .payload("javascript:alert(1)")
                .status("ACTIVE")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        when(qrLinkService.findByCode("badScheme")).thenReturn(Optional.of(link));

        ResponseEntity<?> response = resolutionService.resolveShortlink("badScheme", servletRequest);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        String html = (String) response.getBody();
        assertNotNull(html);
        assertTrue(html.contains("Invalid Destination"));
    }
}
