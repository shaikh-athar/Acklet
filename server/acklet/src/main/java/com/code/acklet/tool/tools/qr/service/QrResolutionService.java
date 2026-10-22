package com.code.acklet.tool.tools.qr.service;

import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class QrResolutionService {

    private final QrCodeRepository qrCodeRepository;
    private final QrAnalyticsService analyticsService;
    private final QrProperties properties;

    public ResponseEntity<Void> resolveShortlink(String code, HttpServletRequest request) {
        QrCodeEntity entity = qrCodeRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Short link not found: " + code));

        // 1. Check Expiration
        if (entity.getExpiresAt() != null && entity.getExpiresAt().isBefore(Instant.now())) {
            log.info("[QrResolution] QR {} has expired", code);
            String expiredUrl = buildLandingUrl(code, "expired=true");
            return redirect(expiredUrl, HttpStatus.TEMPORARY_REDIRECT);
        }

        // 2. Check Paused Status
        if ("PAUSED".equalsIgnoreCase(entity.getStatus())) {
            log.info("[QrResolution] QR {} is paused", code);
            String pausedUrl = buildLandingUrl(code, "paused=true");
            return redirect(pausedUrl, HttpStatus.TEMPORARY_REDIRECT);
        }

        // 3. Record Telemetry (Privacy-conscious, respects DNT/GPC)
        analyticsService.recordScan(entity, request);

        // 4. Check Password Protection
        if (Boolean.TRUE.equals(entity.getHasPassword())) {
            log.info("[QrResolution] QR {} requires password authentication", code);
            String authUrl = buildLandingUrl(code, "auth=required");
            return redirect(authUrl, HttpStatus.TEMPORARY_REDIRECT);
        }

        // 5. Route by Content Type
        String type = entity.getType() != null ? entity.getType().toUpperCase() : "DYNAMIC_URL";
        if (isLandingPageType(type)) {
            // Landing page types redirect to the client-side viewer
            String viewerUrl = buildLandingUrl(code, null);
            return redirect(viewerUrl, HttpStatus.TEMPORARY_REDIRECT);
        }

        // Direct URL / App redirect: HTTP 302 Found (never 301 to prevent permanent cache)
        String targetUrl = entity.getTargetUrl();
        if (targetUrl == null || targetUrl.isBlank()) {
            targetUrl = buildLandingUrl(code, null);
        }

        return redirect(targetUrl, HttpStatus.FOUND);
    }

    private boolean isLandingPageType(String type) {
        return "DYNAMIC_PDF".equals(type) ||
               "DYNAMIC_VCARD".equals(type) ||
               "DYNAMIC_MENU".equals(type) ||
               "DYNAMIC_COUPON".equals(type) ||
               "DYNAMIC_MULTI_URL".equals(type) ||
               "DYNAMIC_SOCIAL".equals(type);
    }

    private String buildLandingUrl(String code, String queryParam) {
        String base = properties.getClientLandingBaseUrl().replaceAll("/+$", "");
        String url = base + "/" + code;
        if (queryParam != null && !queryParam.isBlank()) {
            url += "?" + queryParam;
        }
        return url;
    }

    private ResponseEntity<Void> redirect(String destination, HttpStatus status) {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(destination));
        headers.setCacheControl("no-cache, no-store, max-age=0, must-revalidate");
        headers.setPragma("no-cache");
        return new ResponseEntity<>(headers, status);
    }
}
