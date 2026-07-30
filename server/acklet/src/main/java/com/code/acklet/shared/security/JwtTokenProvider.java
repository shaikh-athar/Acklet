package com.code.acklet.shared.security;

import com.code.acklet.config.properties.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final RsaKeyProvider rsaKeyProvider;
    private final TokenBlacklistService tokenBlacklistService;
    private final AppProperties appProperties;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;
    private static final String ISSUER = "https://acklet.com";
    private static final String AUDIENCE = "acklet-client";
    private static final long CLOCK_SKEW_MS = 60000; // 60 seconds clock skew allowance

    public JwtTokenProvider(AppProperties appProperties, RsaKeyProvider rsaKeyProvider, TokenBlacklistService tokenBlacklistService) {
        this.appProperties = appProperties;
        this.rsaKeyProvider = rsaKeyProvider;
        this.tokenBlacklistService = tokenBlacklistService;

        AppProperties.JwtProperties jwt = appProperties.getSecurity().getJwt();
        String secret = jwt.getSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("JWT Secret is not configured in app.security.jwt.secret!");
        }
        byte[] keyBytes;
        try {
            if (secret.contains("_") || secret.contains("-")) {
                keyBytes = Decoders.BASE64URL.decode(secret.trim());
            } else {
                keyBytes = Decoders.BASE64.decode(secret.trim());
            }
        } catch (Exception e) {
            keyBytes = secret.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, Math.min(keyBytes.length, 32));
            keyBytes = padded;
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenExpirationMs = jwt.getAccessTokenExpirationMs();
        this.refreshTokenExpirationMs = jwt.getRefreshTokenExpirationMs();
    }

    public String generateAccessToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails.getUsername(), accessTokenExpirationMs);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails.getUsername(), refreshTokenExpirationMs);
    }

    private String generateToken(Map<String, Object> extraClaims, String subject, long expirationMs) {
        boolean useRs256 = appProperties.getSecurity().getFeatures().isRs256Jwt();
        long nowMs = System.currentTimeMillis();
        Date now = new Date(nowMs);
        Date expiry = new Date(nowMs + expirationMs);
        String jti = UUID.randomUUID().toString();

        if (useRs256 && rsaKeyProvider.getPrivateKey() != null) {
            return Jwts.builder()
                    .header().keyId(rsaKeyProvider.getKeyId()).and()
                    .claims(extraClaims)
                    .subject(subject)
                    .issuer(ISSUER)
                    .audience().add(AUDIENCE).and()
                    .id(jti)
                    .issuedAt(now)
                    .notBefore(now)
                    .expiration(expiry)
                    .signWith(rsaKeyProvider.getPrivateKey(), Jwts.SIG.RS256)
                    .compact();
        } else {
            return Jwts.builder()
                    .claims(extraClaims)
                    .subject(subject)
                    .issuer(ISSUER)
                    .audience().add(AUDIENCE).and()
                    .id(jti)
                    .issuedAt(now)
                    .notBefore(now)
                    .expiration(expiry)
                    .signWith(secretKey)
                    .compact();
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractJti(String token) {
        return extractClaim(token, Claims::getId);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        boolean useRs256 = appProperties.getSecurity().getFeatures().isRs256Jwt();
        if (useRs256 && rsaKeyProvider.getPublicKey() != null) {
            try {
                return Jwts.parser()
                        .verifyWith(rsaKeyProvider.getPublicKey())
                        .clockSkewSeconds(CLOCK_SKEW_MS / 1000)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            } catch (Exception e) {
                // Fallback attempt with HMAC secret in case of legacy token transition
                return Jwts.parser()
                        .verifyWith(secretKey)
                        .clockSkewSeconds(CLOCK_SKEW_MS / 1000)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            }
        } else {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .clockSkewSeconds(CLOCK_SKEW_MS / 1000)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        }
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            final String jti = extractJti(token);

            if (appProperties.getSecurity().getFeatures().isRedisTokenBlacklist() && tokenBlacklistService.isBlacklisted(jti)) {
                log.warn("Attempted use of blacklisted JWT token jti: {}", jti);
                return false;
            }

            return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT token validation failed: {}", e.getMessage());
            return false;
        }
    }

    public boolean isTokenValid(String token) {
        try {
            final String jti = extractJti(token);
            if (appProperties.getSecurity().getFeatures().isRedisTokenBlacklist() && tokenBlacklistService.isBlacklisted(jti)) {
                return false;
            }
            extractAllClaims(token);
            return !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date(System.currentTimeMillis() - CLOCK_SKEW_MS));
    }
}
