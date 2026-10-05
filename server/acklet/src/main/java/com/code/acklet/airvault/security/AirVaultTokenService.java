package com.code.acklet.airvault.security;

import com.code.acklet.airvault.service.AirVaultRedisTracker;
import com.code.acklet.config.properties.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class AirVaultTokenService {

    private final SecretKey secretKey;
    private final AirVaultRedisTracker redisTracker;
    private static final String ISSUER = "https://acklet.com/airvault";
    private static final String AUDIENCE = "airvault-client";
    private static final long DEFAULT_USER_TOKEN_EXPIRY_MS = 30L * 24 * 60 * 60 * 1000; // 30 days
    private static final long DEFAULT_GUEST_TOKEN_EXPIRY_MS = 7L * 24 * 60 * 60 * 1000; // 7 days

    public AirVaultTokenService(AppProperties appProperties, AirVaultRedisTracker redisTracker) {
        this.redisTracker = redisTracker;
        String secret = appProperties.getSecurity() != null && appProperties.getSecurity().getJwt() != null
                ? appProperties.getSecurity().getJwt().getSecret()
                : null;

        if (secret == null || secret.isBlank()) {
            secret = "airvault_production_secure_token_secret_fallback_key_32_bytes_min";
        }

        byte[] keyBytes;
        try {
            if (secret.contains("_") || secret.contains("-")) {
                keyBytes = Decoders.BASE64URL.decode(secret.trim());
            } else {
                keyBytes = Decoders.BASE64.decode(secret.trim());
            }
        } catch (Exception e) {
            keyBytes = secret.trim().getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, Math.min(keyBytes.length, 32));
            keyBytes = padded;
        }

        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generates a signed token for an authenticated AirVault user/device session.
     */
    public String generateUserToken(String username, String deviceId) {
        long nowMs = System.currentTimeMillis();
        Date now = new Date(nowMs);
        Date expiry = new Date(nowMs + DEFAULT_USER_TOKEN_EXPIRY_MS);
        String jti = UUID.randomUUID().toString();

        Map<String, Object> claims = new HashMap<>();
        claims.put("username", username);
        claims.put("deviceId", deviceId);
        claims.put("tokenType", "USER");

        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuer(ISSUER)
                .audience().add(AUDIENCE).and()
                .id(jti)
                .issuedAt(now)
                .notBefore(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Generates a guest token scoped strictly to ONE specific clipboard with the specified access mode.
     */
    public String generateGuestClipboardToken(String clipboardId, String accessMode, String deviceId) {
        long nowMs = System.currentTimeMillis();
        Date now = new Date(nowMs);
        Date expiry = new Date(nowMs + DEFAULT_GUEST_TOKEN_EXPIRY_MS);
        String jti = UUID.randomUUID().toString();

        String guestSubject = "guest:" + UUID.randomUUID().toString().substring(0, 8);
        String guestDeviceId = (deviceId != null && !deviceId.isBlank()) ? deviceId : "guest-dev-" + UUID.randomUUID().toString().substring(0, 8);

        Map<String, Object> claims = new HashMap<>();
        claims.put("username", guestSubject);
        claims.put("deviceId", guestDeviceId);
        claims.put("tokenType", "GUEST_CLIPBOARD");
        claims.put("scopedClipboardId", clipboardId);
        claims.put("guestAccessMode", accessMode != null ? accessMode.toLowerCase() : "read-only");

        return Jwts.builder()
                .claims(claims)
                .subject(guestSubject)
                .issuer(ISSUER)
                .audience().add(AUDIENCE).and()
                .id(jti)
                .issuedAt(now)
                .notBefore(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Parses and validates signed JWT token. Returns AirVaultPrincipal or null if invalid/expired.
     */
    public AirVaultPrincipal parseAndValidateToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .clockSkewSeconds(60)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            Date expiration = claims.getExpiration();
            if (expiration != null && expiration.before(new Date())) {
                log.debug("[AirVault Token] Token expired: {}", token);
                return null;
            }

            String username = claims.get("username", String.class);
            if (username == null) {
                username = claims.getSubject();
            }
            String deviceId = claims.get("deviceId", String.class);
            String tokenType = claims.get("tokenType", String.class);
            String scopedClipboardId = claims.get("scopedClipboardId", String.class);
            String guestAccessMode = claims.get("guestAccessMode", String.class);

            if (tokenType == null || tokenType.isBlank()) {
                tokenType = "USER";
            }

            // Check if token has been revoked / logged out in Redis
            if ("USER".equalsIgnoreCase(tokenType) && !redisTracker.validateDeviceSession(token)) {
                log.debug("[AirVault Token] Token was invalidated or not found in active Redis sessions: {}", token);
                return null;
            }

            return AirVaultPrincipal.builder()
                    .username(username)
                    .deviceId(deviceId)
                    .tokenType(tokenType)
                    .scopedClipboardId(scopedClipboardId)
                    .guestAccessMode(guestAccessMode)
                    .build();
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("[AirVault Token] Token parsing/validation failed: {}", e.getMessage());
            return null;
        }
    }
}
