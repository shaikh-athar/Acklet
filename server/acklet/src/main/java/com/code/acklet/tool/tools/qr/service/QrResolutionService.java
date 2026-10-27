package com.code.acklet.tool.tools.qr.service;

import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.entity.QrLinkEntity;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.util.QrHtmlRenderer;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

@Service
@Slf4j
public class QrResolutionService {

    private final QrCodeRepository qrCodeRepository;
    private final QrAnalyticsService analyticsService;
    private final QrProperties properties;
    private final QrLinkService qrLinkService;

    @Autowired
    public QrResolutionService(
            QrCodeRepository qrCodeRepository,
            QrAnalyticsService analyticsService,
            QrProperties properties,
            @Autowired(required = false) QrLinkService qrLinkService) {
        this.qrCodeRepository = qrCodeRepository;
        this.analyticsService = analyticsService;
        this.properties = properties;
        this.qrLinkService = qrLinkService;
    }

    public QrResolutionService(
            QrCodeRepository qrCodeRepository,
            QrAnalyticsService analyticsService,
            QrProperties properties) {
        this(qrCodeRepository, analyticsService, properties, null);
    }

    public ResponseEntity<?> resolveShortlink(String code, HttpServletRequest request) {
        // 1. Check dynamic QR links (new engine)
        if (qrLinkService != null) {
            Optional<QrLinkEntity> linkOpt = qrLinkService.findByCode(code);
            if (linkOpt.isPresent()) {
                return resolveQrLink(linkOpt.get());
            }
        }

        // 2. Fallback to legacy QR codes (qr_codes table)
        Optional<QrCodeEntity> legacyOpt = qrCodeRepository.findByCode(code);
        if (legacyOpt.isPresent()) {
            return resolveLegacyQrCode(legacyOpt.get(), request);
        }

        // 3. Not found anywhere -> Friendly 404 HTML Page
        log.info("[QrResolution] QR code not found: {}", code);
        return buildHtmlResponse(HttpStatus.NOT_FOUND,
                QrHtmlRenderer.renderStatusPage("QR Code Not Found", "The QR code link you scanned does not exist or has been removed.", 404));
    }

    private ResponseEntity<?> resolveQrLink(QrLinkEntity entity) {
        log.info("[QrResolution] Resolving dynamic link code={} type={}", entity.getCode(), entity.getType());
        // Expiration or deletion check
        if ((entity.getExpiresAt() != null && entity.getExpiresAt().isBefore(Instant.now()))
                || "EXPIRED".equalsIgnoreCase(entity.getStatus())
                || "DELETED".equalsIgnoreCase(entity.getStatus())) {
            log.info("[QrResolution] Dynamic link {} is expired or deleted", entity.getCode());
            return buildHtmlResponse(HttpStatus.GONE,
                    QrHtmlRenderer.renderStatusPage("Link Expired", "This QR code link has expired and is no longer accessible.", 410));
        }

        // Disabled check
        if ("DISABLED".equalsIgnoreCase(entity.getStatus())) {
            log.info("[QrResolution] Dynamic link {} is disabled", entity.getCode());
            return buildHtmlResponse(HttpStatus.GONE,
                    QrHtmlRenderer.renderStatusPage("Link Disabled", "This QR code link has been disabled by its owner.", 410));
        }

        // Asynchronously record scan and extend rolling TTL
        if (qrLinkService != null) {
            qrLinkService.recordScanAsync(entity.getCode());
        }

        String type = entity.getType() != null ? entity.getType().toUpperCase(Locale.ROOT) : "URL";
        return switch (type) {
            case "URL" -> {
                String targetUrl = entity.getPayload();
                try {
                    URI targetUri = URI.create(targetUrl.trim());
                    String scheme = targetUri.getScheme();
                    if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                        yield buildHtmlResponse(HttpStatus.BAD_REQUEST,
                                QrHtmlRenderer.renderStatusPage("Invalid Destination", "The destination URL has an unsupported or invalid scheme.", 400));
                    }
                } catch (Exception e) {
                    yield buildHtmlResponse(HttpStatus.BAD_REQUEST,
                            QrHtmlRenderer.renderStatusPage("Invalid Destination", "The destination URL is malformed.", 400));
                }
                HttpHeaders headers = new HttpHeaders();
                headers.setLocation(URI.create(targetUrl.trim()));
                headers.setCacheControl("no-cache, no-store, max-age=0, must-revalidate");
                headers.setPragma("no-cache");
                headers.set("Referrer-Policy", "no-referrer");
                headers.set("X-Robots-Tag", "noindex, nofollow");
                yield new ResponseEntity<>(headers, HttpStatus.FOUND);
            }
            case "TEXT" -> {
                String html = QrHtmlRenderer.renderTextViewer(entity.getPayload(), entity.getCode());
                yield buildHtmlResponse(HttpStatus.OK, html);
            }
            case "VCARD" -> {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.parseMediaType("text/vcard; charset=utf-8"));
                headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"contact.vcf\"");
                headers.set("X-Robots-Tag", "noindex, nofollow");
                headers.set("Referrer-Policy", "no-referrer");
                yield new ResponseEntity<>(entity.getPayload(), headers, HttpStatus.OK);
            }
            default -> {
                String mime = entity.getMime() != null ? entity.getMime() : "text/plain; charset=utf-8";
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.parseMediaType(mime));
                headers.set("X-Robots-Tag", "noindex, nofollow");
                headers.set("Referrer-Policy", "no-referrer");
                yield new ResponseEntity<>(entity.getPayload(), headers, HttpStatus.OK);
            }
        };
    }

    private ResponseEntity<String> buildHtmlResponse(HttpStatus status, String htmlBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/html; charset=UTF-8"));
        headers.set("X-Robots-Tag", "noindex, nofollow");
        headers.set("Referrer-Policy", "no-referrer");
        headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;");
        headers.setCacheControl("no-cache, no-store, max-age=0, must-revalidate");
        headers.setPragma("no-cache");
        return new ResponseEntity<>(htmlBody, headers, status);
    }

    private ResponseEntity<?> resolveLegacyQrCode(QrCodeEntity entity, HttpServletRequest request) {
        // 1. Check Expiration
        if (entity.getExpiresAt() != null && entity.getExpiresAt().isBefore(Instant.now())) {
            log.info("[QrResolution] Legacy QR {} has expired", entity.getCode());
            String expiredUrl = buildLandingUrl(entity.getCode(), "expired=true");
            return redirect(expiredUrl, HttpStatus.TEMPORARY_REDIRECT);
        }

        // 2. Check Paused Status
        if ("PAUSED".equalsIgnoreCase(entity.getStatus())) {
            log.info("[QrResolution] Legacy QR {} is paused", entity.getCode());
            String pausedUrl = buildLandingUrl(entity.getCode(), "paused=true");
            return redirect(pausedUrl, HttpStatus.TEMPORARY_REDIRECT);
        }

        // 3. Record Telemetry (Privacy-conscious, respects DNT/GPC)
        analyticsService.recordScan(entity, request);

        // 4. Check Password Protection
        if (Boolean.TRUE.equals(entity.getHasPassword())) {
            log.info("[QrResolution] Legacy QR {} requires password authentication", entity.getCode());
            String authUrl = buildLandingUrl(entity.getCode(), "auth=required");
            return redirect(authUrl, HttpStatus.TEMPORARY_REDIRECT);
        }

        // 5. Route by Content Type
        String type = entity.getType() != null ? entity.getType().toUpperCase(Locale.ROOT) : "DYNAMIC_URL";
        if (isLandingPageType(type)) {
            String viewerUrl = buildLandingUrl(entity.getCode(), null);
            return redirect(viewerUrl, HttpStatus.TEMPORARY_REDIRECT);
        }

        // Direct URL: HTTP 302 Found
        String targetUrl = entity.getTargetUrl();
        if (targetUrl == null || targetUrl.isBlank()) {
            targetUrl = buildLandingUrl(entity.getCode(), null);
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
