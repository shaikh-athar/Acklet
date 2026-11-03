package com.code.acklet.tool.tools.shortener.service;

import com.code.acklet.shared.security.RateLimitingService;
import com.code.acklet.tool.tools.shortener.config.ShortenerProperties;
import com.code.acklet.tool.tools.shortener.entity.ShortLinkEntity;
import com.code.acklet.tool.tools.shortener.repository.ShortLinkRepository;
import com.code.acklet.tool.tools.shortener.util.ShortenerHtmlRenderer;
import com.code.acklet.tool.tools.shortener.util.ShortenerSecurityHelper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShortRedirectService {

    private final ShortLinkRepository repository;
    private final com.code.acklet.tool.tools.shortener.repository.ShortLinkDailyClickRepository dailyClickRepository;
    private final ShortenerSecurityHelper securityHelper;
    private final ShortenerProperties properties;
    private final RateLimitingService rateLimitingService;

    private static final Set<String> PREVIEW_BOT_SIGNATURES = Set.of(
            "facebookexternalhit", "twitterbot", "telegrambot", "slackbot",
            "whatsapp", "linkedinbot", "discordbot", "googlebot", "bingbot",
            "applebot", "crawler", "spider", "preview"
    );

    /**
     * Executes the strict redirect decision order for GET /s/{code}.
     */
    @Transactional
    public ResponseEntity<?> resolveAndRedirect(String code, HttpServletRequest request) {
        String clientIp = extractClientIp(request);
        String pepperIp = securityHelper.pepperHash(clientIp);

        boolean isPreview = code != null && code.endsWith("+");
        String cleanCode = isPreview ? code.substring(0, code.length() - 1) : code;

        // 1. Rate limiting check
        if (!rateLimitingService.isAllowed("shortener:redirect:" + pepperIp, 120, 60)) {
            return buildHtmlResponse(HttpStatus.TOO_MANY_REQUESTS,
                    ShortenerHtmlRenderer.renderStatusPage("Too many requests", "Please wait a moment and try again.", 429));
        }

        // 2. Existence check (404)
        Optional<ShortLinkEntity> entityOpt = repository.findByCode(cleanCode);
        if (entityOpt.isEmpty()) {
            return buildHtmlResponse(HttpStatus.NOT_FOUND,
                    ShortenerHtmlRenderer.renderStatusPage("Link unavailable", "This link isn't available.", 404));
        }

        ShortLinkEntity entity = entityOpt.get();

        // 3. Deleted or deactivated check (410)
        if (entity.getDeletedAt() != null || Boolean.TRUE.equals(entity.getIsDeactivated())) {
            return buildHtmlResponse(HttpStatus.GONE,
                    ShortenerHtmlRenderer.renderStatusPage("Link unavailable", "This link isn't available.", 410));
        }

        Instant now = Instant.now();

        // 4. Scheduled start check (403)
        if (entity.getStartDate() != null && entity.getStartDate().isAfter(now)) {
            return buildHtmlResponse(HttpStatus.FORBIDDEN,
                    ShortenerHtmlRenderer.renderStatusPage("Not active yet", "This link isn't active yet. Please check back later.", 403));
        }

        // 5. Expiration check
        if (entity.getExpiresAt() != null && !entity.getExpiresAt().isAfter(now)) {
            if (entity.getFallbackUrl() != null && !entity.getFallbackUrl().isBlank()) {
                return buildRedirectResponse(entity.getFallbackUrl());
            }
            return buildHtmlResponse(HttpStatus.GONE,
                    ShortenerHtmlRenderer.renderStatusPage("Link expired", "This link has expired.", 410));
        }

        // 6. Click limit check
        if (Boolean.TRUE.equals(entity.getIsOneTime()) && entity.getClicks() != null && entity.getClicks() >= 1) {
            if (entity.getFallbackUrl() != null && !entity.getFallbackUrl().isBlank()) {
                return buildRedirectResponse(entity.getFallbackUrl());
            }
            return buildHtmlResponse(HttpStatus.GONE,
                    ShortenerHtmlRenderer.renderStatusPage("Visit limit reached", "This link has reached its visit limit.", 410));
        }

        if (entity.getMaxClicks() != null && entity.getClicks() != null && entity.getClicks() >= entity.getMaxClicks()) {
            if (entity.getFallbackUrl() != null && !entity.getFallbackUrl().isBlank()) {
                return buildRedirectResponse(entity.getFallbackUrl());
            }
            return buildHtmlResponse(HttpStatus.GONE,
                    ShortenerHtmlRenderer.renderStatusPage("Visit limit reached", "This link has reached its visit limit.", 410));
        }

        // 6.1 Safe Preview Mode (+ suffix): render destination domain & metadata without counting clicks
        if (isPreview) {
            return buildHtmlResponse(HttpStatus.OK, ShortenerHtmlRenderer.renderPreviewPage(
                    entity.getCode(),
                    entity.getTargetUrl(),
                    Boolean.TRUE.equals(entity.getHasPassword()),
                    entity.getClicks() != null ? entity.getClicks() : 0,
                    entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null,
                    entity.getExpiresAt() != null ? entity.getExpiresAt().toString() : null
            ));
        }

        // 7. Password protection check
        if (Boolean.TRUE.equals(entity.getHasPassword())) {
            String unlockCookie = extractCookie(request, "ack_unlocked_" + entity.getCode());
            if (!securityHelper.verifyUnlockToken(unlockCookie, entity.getCode())) {
                // Destination is NEVER disclosed; render accessible challenge page
                return buildHtmlResponse(HttpStatus.OK, ShortenerHtmlRenderer.renderUnlockPage(entity.getCode(), null));
            }
        }

        // 8. Head requests & Bot preview detection (do not count clicks, do not consume one-time)
        boolean isHead = HttpMethod.HEAD.matches(request.getMethod());
        boolean isBot = isPreviewBot(request.getHeader(HttpHeaders.USER_AGENT));

        if (isHead || isBot) {
            return buildRedirectResponse(entity.getTargetUrl());
        }

        // 9. Atomic click increment and one-time consumption
        if (Boolean.TRUE.equals(entity.getIsOneTime())) {
            int updated = repository.consumeOneTimeLink(entity.getId(), now);
            if (updated == 0) {
                if (entity.getFallbackUrl() != null && !entity.getFallbackUrl().isBlank()) {
                    return buildRedirectResponse(entity.getFallbackUrl());
                }
                return buildHtmlResponse(HttpStatus.GONE,
                        ShortenerHtmlRenderer.renderStatusPage("Visit limit reached", "This link has reached its visit limit.", 410));
            }
        } else if (entity.getMaxClicks() != null) {
            int updated = repository.incrementClicksWithLimit(entity.getId(), now);
            if (updated == 0) {
                if (entity.getFallbackUrl() != null && !entity.getFallbackUrl().isBlank()) {
                    return buildRedirectResponse(entity.getFallbackUrl());
                }
                return buildHtmlResponse(HttpStatus.GONE,
                        ShortenerHtmlRenderer.renderStatusPage("Visit limit reached", "This link has reached its visit limit.", 410));
            }
        } else {
            repository.incrementClicksStandard(entity.getId(), now);
        }

        // Record daily aggregated click trend
        try {
            java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneOffset.UTC);
            dailyClickRepository.upsertDailyClick(java.util.UUID.randomUUID(), entity.getId(), today);
        } catch (Exception e) {
            log.warn("[ShortRedirect] Failed to record daily click aggregate: {}", e.getMessage());
        }

        // 10. Perform secure 302 redirection (applying UTM params if configured)
        String finalRedirectUrl = applyUtmParams(entity.getTargetUrl(), entity.getUtmParams());
        return buildRedirectResponse(finalRedirectUrl);
    }

    private String applyUtmParams(String targetUrl, String utmParamsJson) {
        if (targetUrl == null || utmParamsJson == null || utmParamsJson.isBlank()) {
            return targetUrl;
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<String, String> utmMap = mapper.readValue(utmParamsJson, new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, String>>() {});
            if (utmMap == null || utmMap.isEmpty()) {
                return targetUrl;
            }
            URI uri = URI.create(targetUrl.trim());
            String query = uri.getQuery();
            java.util.Set<String> existingKeys = new java.util.HashSet<>();
            if (query != null && !query.isBlank()) {
                for (String param : query.split("&")) {
                    int eqIdx = param.indexOf('=');
                    String key = eqIdx > 0 ? param.substring(0, eqIdx) : param;
                    existingKeys.add(key.toLowerCase(Locale.ROOT));
                }
            }

            StringBuilder queryBuilder = new StringBuilder(query != null ? query : "");
            for (java.util.Map.Entry<String, String> entry : utmMap.entrySet()) {
                String key = entry.getKey();
                String val = entry.getValue();
                if (key != null && !key.isBlank() && val != null && !val.isBlank()) {
                    if (!existingKeys.contains(key.toLowerCase(Locale.ROOT))) {
                        if (!queryBuilder.isEmpty()) {
                            queryBuilder.append("&");
                        }
                        queryBuilder.append(java.net.URLEncoder.encode(key, java.nio.charset.StandardCharsets.UTF_8))
                                    .append("=")
                                    .append(java.net.URLEncoder.encode(val, java.nio.charset.StandardCharsets.UTF_8));
                    }
                }
            }

            URI finalUri = new URI(
                    uri.getScheme(),
                    uri.getAuthority(),
                    uri.getPath(),
                    queryBuilder.toString(),
                    uri.getFragment()
            );
            return finalUri.toASCIIString();
        } catch (Exception e) {
            log.debug("[ShortRedirect] Could not append UTM parameters: {}", e.getMessage());
            return targetUrl;
        }
    }

    /**
     * Processes password unlock submission from POST /s/{code}/unlock.
     */
    @Transactional
    public ResponseEntity<?> handleUnlockPost(String code, String password, HttpServletRequest request, HttpServletResponse response) {
        String clientIp = extractClientIp(request);
        String pepperIp = securityHelper.pepperHash(clientIp);
        String lockKey = "shortener:unlock:fail:" + code + ":" + pepperIp;

        // Check lockout
        if (!rateLimitingService.isAllowed(lockKey, properties.getRateLimit().getUnlockFailuresPer15Min(), properties.getRateLimit().getUnlockLockoutSeconds())) {
            return buildHtmlResponse(HttpStatus.TOO_MANY_REQUESTS,
                    ShortenerHtmlRenderer.renderUnlockPage(code, "Too many attempts. Please try again in 15 minutes."));
        }

        Optional<ShortLinkEntity> entityOpt = repository.findByCode(code);
        if (entityOpt.isEmpty() || entityOpt.get().getDeletedAt() != null) {
            return buildHtmlResponse(HttpStatus.NOT_FOUND,
                    ShortenerHtmlRenderer.renderStatusPage("Link unavailable", "This link isn't available.", 404));
        }

        ShortLinkEntity entity = entityOpt.get();
        if (!Boolean.TRUE.equals(entity.getHasPassword())) {
            return buildRedirectResponse("/s/" + code);
        }

        boolean isMatch = securityHelper.verifyPassword(password, entity.getPasswordHash(), entity.getPasswordScheme());
        if (!isMatch) {
            return buildHtmlResponse(HttpStatus.UNAUTHORIZED,
                    ShortenerHtmlRenderer.renderUnlockPage(code, "That password isn't correct. Try again."));
        }

        // If legacy PBKDF2 scheme was verified, transparently upgrade to BCrypt
        if ("PBKDF2_SHA256".equalsIgnoreCase(entity.getPasswordScheme()) ||
                (entity.getPasswordHash() != null && entity.getPasswordHash().startsWith("pbkdf2:100000:"))) {
            entity.setPasswordHash(securityHelper.hashPassword(password));
            entity.setPasswordScheme("BCRYPT");
            entity.setPasswordSalt(null);
            repository.save(entity);
            log.info("[ShortenerSecurity] Upgraded legacy PBKDF2 hash to BCrypt for code={}", code);
        }

        // Generate signed unlock token and set secure HttpOnly cookie
        String signedToken = securityHelper.generateUnlockToken(code);
        Cookie cookie = new Cookie("ack_unlocked_" + code, signedToken);
        cookie.setPath("/s/" + code);
        cookie.setHttpOnly(true);
        cookie.setMaxAge(properties.getSecurity().getUnlockSessionSeconds());
        if (request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"))) {
            cookie.setSecure(true);
        }
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);

        // Redirect back to GET /s/{code}
        return buildRedirectResponse("/s/" + code);
    }

    private ResponseEntity<?> buildRedirectResponse(String targetUrl) {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(targetUrl.trim()));
        headers.setCacheControl("no-cache, no-store, max-age=0, must-revalidate");
        headers.setPragma("no-cache");
        headers.set("Referrer-Policy", "no-referrer");
        headers.set("X-Robots-Tag", "noindex, nofollow");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Frame-Options", "DENY");
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    private ResponseEntity<String> buildHtmlResponse(HttpStatus status, String htmlBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "html", java.nio.charset.StandardCharsets.UTF_8));
        headers.setCacheControl("no-cache, no-store, max-age=0, must-revalidate");
        headers.setPragma("no-cache");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Frame-Options", "DENY");
        headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
        return new ResponseEntity<>(htmlBody, headers, status);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private boolean isPreviewBot(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return false;
        String lower = userAgent.toLowerCase(Locale.ROOT);
        return PREVIEW_BOT_SIGNATURES.stream().anyMatch(lower::contains);
    }
}
