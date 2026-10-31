package com.code.acklet.tool.tools.shortener;

import com.code.acklet.shared.security.RateLimitingService;
import com.code.acklet.tool.tools.shortener.config.ShortenerProperties;
import com.code.acklet.tool.tools.shortener.entity.ShortLinkEntity;
import com.code.acklet.tool.tools.shortener.repository.ShortLinkRepository;
import com.code.acklet.tool.tools.shortener.service.ShortRedirectService;
import com.code.acklet.tool.tools.shortener.util.ShortenerSecurityHelper;
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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShortRedirectTest {

    @Mock
    private ShortLinkRepository repository;

    @Mock
    private com.code.acklet.tool.tools.shortener.repository.ShortLinkDailyClickRepository dailyClickRepository;

    @Mock
    private RateLimitingService rateLimitingService;

    @Mock
    private HttpServletRequest servletRequest;

    private ShortenerProperties properties;
    private ShortenerSecurityHelper securityHelper;
    private ShortRedirectService redirectService;

    @BeforeEach
    void setUp() {
        properties = new ShortenerProperties();
        properties.getSecurity().setPepper("test_pepper");
        properties.getSecurity().setUnlockSigningSecret("test_signing_secret");

        securityHelper = new ShortenerSecurityHelper(properties, new BCryptPasswordEncoder());

        lenient().when(rateLimitingService.isAllowed(anyString(), anyInt(), anyInt())).thenReturn(true);
        lenient().when(servletRequest.getRemoteAddr()).thenReturn("192.0.2.1");
        lenient().when(servletRequest.getMethod()).thenReturn("GET");
        lenient().when(servletRequest.getHeader(anyString())).thenReturn(null);

        redirectService = new ShortRedirectService(repository, dailyClickRepository, securityHelper, properties, rateLimitingService);
    }

    @Test
    @DisplayName("1. Exists check: Nonexistent code returns 404 HTML status page")
    void testNonexistentCode() {
        when(repository.findByCode("unknown")).thenReturn(Optional.empty());

        ResponseEntity<?> res = redirectService.resolveAndRedirect("unknown", servletRequest);

        assertEquals(HttpStatus.NOT_FOUND, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("Link Not Found"));
    }

    @Test
    @DisplayName("2. Deactivated check: Deactivated or soft-deleted link returns 410 HTML")
    void testDeactivatedLink() {
        ShortLinkEntity deactivated = ShortLinkEntity.builder()
                .code("deact1")
                .targetUrl("https://example.com")
                .isDeactivated(true)
                .build();

        when(repository.findByCode("deact1")).thenReturn(Optional.of(deactivated));

        ResponseEntity<?> res = redirectService.resolveAndRedirect("deact1", servletRequest);
        assertEquals(HttpStatus.GONE, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("Link Deactivated"));
    }

    @Test
    @DisplayName("3. Scheduled start check: Link scheduled in future returns 403 HTML")
    void testScheduledLink() {
        ShortLinkEntity scheduled = ShortLinkEntity.builder()
                .code("sched1")
                .targetUrl("https://example.com")
                .isDeactivated(false)
                .startDate(Instant.now().plus(2, ChronoUnit.HOURS))
                .build();

        when(repository.findByCode("sched1")).thenReturn(Optional.of(scheduled));

        ResponseEntity<?> res = redirectService.resolveAndRedirect("sched1", servletRequest);
        assertEquals(HttpStatus.FORBIDDEN, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("Not Yet Active"));
    }

    @Test
    @DisplayName("4. Expiration check: Expired link without fallback returns 410 HTML")
    void testExpiredWithoutFallback() {
        ShortLinkEntity expired = ShortLinkEntity.builder()
                .code("exp1")
                .targetUrl("https://example.com")
                .isDeactivated(false)
                .expiresAt(Instant.now().minus(10, ChronoUnit.MINUTES))
                .build();

        when(repository.findByCode("exp1")).thenReturn(Optional.of(expired));

        ResponseEntity<?> res = redirectService.resolveAndRedirect("exp1", servletRequest);
        assertEquals(HttpStatus.GONE, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("Link Expired"));
    }

    @Test
    @DisplayName("5. Expiration check: Expired link with fallback returns 302 to fallback URL")
    void testExpiredWithFallback() {
        ShortLinkEntity expired = ShortLinkEntity.builder()
                .code("exp2")
                .targetUrl("https://example.com")
                .fallbackUrl("https://example.com/fallback")
                .isDeactivated(false)
                .expiresAt(Instant.now().minus(10, ChronoUnit.MINUTES))
                .build();

        when(repository.findByCode("exp2")).thenReturn(Optional.of(expired));

        ResponseEntity<?> res = redirectService.resolveAndRedirect("exp2", servletRequest);
        assertEquals(HttpStatus.FOUND, res.getStatusCode());
        assertEquals(URI.create("https://example.com/fallback"), res.getHeaders().getLocation());
    }

    @Test
    @DisplayName("6. Password check: Protected link serves unlock challenge without exposing target URL")
    void testPasswordProtectedChallenge() {
        ShortLinkEntity protectedLink = ShortLinkEntity.builder()
                .code("pwlink")
                .targetUrl("https://example.com/secret-destination")
                .hasPassword(true)
                .passwordHash("$2a$10$abcdef...")
                .build();

        when(repository.findByCode("pwlink")).thenReturn(Optional.of(protectedLink));

        ResponseEntity<?> res = redirectService.resolveAndRedirect("pwlink", servletRequest);
        assertEquals(HttpStatus.OK, res.getStatusCode());
        String body = res.getBody().toString();
        assertTrue(body.contains("Protected Link"));
        assertTrue(body.contains("/s/pwlink/unlock"));
        // Confirm secret target URL is NOT in response body or headers
        assertFalse(body.contains("secret-destination"));
        assertNull(res.getHeaders().getLocation());
    }

    @Test
    @DisplayName("7. Active link: Returns 302 with privacy headers and increments click count")
    void testActiveLinkRedirect() {
        UUID id = UUID.randomUUID();
        ShortLinkEntity active = ShortLinkEntity.builder()
                .id(id)
                .code("act1")
                .targetUrl("https://example.com/target")
                .isDeactivated(false)
                .clicks(0L)
                .build();

        when(repository.findByCode("act1")).thenReturn(Optional.of(active));

        ResponseEntity<?> res = redirectService.resolveAndRedirect("act1", servletRequest);

        assertEquals(HttpStatus.FOUND, res.getStatusCode());
        assertEquals(URI.create("https://example.com/target"), res.getHeaders().getLocation());
        assertEquals("no-referrer", res.getHeaders().getFirst("Referrer-Policy"));
        assertEquals("noindex, nofollow", res.getHeaders().getFirst("X-Robots-Tag"));
        verify(repository, times(1)).incrementClicksStandard(eq(id), any(Instant.class));
    }

    @Test
    @DisplayName("8. Bot & HEAD requests: Execute redirect without incrementing click count")
    void testBotDoesNotIncrementClicks() {
        UUID id = UUID.randomUUID();
        ShortLinkEntity active = ShortLinkEntity.builder()
                .id(id)
                .code("bot1")
                .targetUrl("https://example.com/target")
                .isDeactivated(false)
                .isOneTime(true)
                .clicks(0L)
                .build();

        when(repository.findByCode("bot1")).thenReturn(Optional.of(active));
        when(servletRequest.getHeader(HttpHeaders.USER_AGENT)).thenReturn("Twitterbot/1.0");

        ResponseEntity<?> res = redirectService.resolveAndRedirect("bot1", servletRequest);

        assertEquals(HttpStatus.FOUND, res.getStatusCode());
        verify(repository, never()).consumeOneTimeLink(any(), any());
        verify(repository, never()).incrementClicksStandard(any(), any());
    }

    @Test
    @DisplayName("9. One-time link: Consumes atomically and subsequent requests return Limit Reached")
    void testOneTimeLinkAtomicConsumption() {
        UUID id = UUID.randomUUID();
        ShortLinkEntity oneTime = ShortLinkEntity.builder()
                .id(id)
                .code("one1")
                .targetUrl("https://example.com/single-use")
                .isDeactivated(false)
                .isOneTime(true)
                .clicks(0L)
                .build();

        when(repository.findByCode("one1")).thenReturn(Optional.of(oneTime));
        // First request succeeds: consumeOneTimeLink returns 1 row affected
        when(repository.consumeOneTimeLink(eq(id), any(Instant.class))).thenReturn(1);

        ResponseEntity<?> res1 = redirectService.resolveAndRedirect("one1", servletRequest);
        assertEquals(HttpStatus.FOUND, res1.getStatusCode());

        // Concurrent/second request fails: consumeOneTimeLink returns 0 rows affected
        when(repository.consumeOneTimeLink(eq(id), any(Instant.class))).thenReturn(0);

        ResponseEntity<?> res2 = redirectService.resolveAndRedirect("one1", servletRequest);
        assertEquals(HttpStatus.GONE, res2.getStatusCode());
        assertTrue(res2.getBody().toString().contains("Limit Reached"));
    }

    @Test
    @DisplayName("10. Safe Preview (+ suffix): Strips plus and renders preview HTML without counting clicks")
    void testSafePreviewModeWithPlusSuffix() {
        ShortLinkEntity active = ShortLinkEntity.builder()
                .code("preview1")
                .targetUrl("https://example.com/target")
                .isDeactivated(false)
                .clicks(5L)
                .build();

        when(repository.findByCode("preview1")).thenReturn(Optional.of(active));

        ResponseEntity<?> res = redirectService.resolveAndRedirect("preview1+", servletRequest);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("Link Preview"));
        assertTrue(res.getBody().toString().contains("https://example.com/target"));
        verify(repository, never()).incrementClicksStandard(any(), any());
    }
}
