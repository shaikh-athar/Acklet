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
import java.util.function.Function;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtTokenProvider(AppProperties appProperties) {
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
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT token validation failed: {}", e.getMessage());
            return false;
        }
    }

    public boolean isTokenValid(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
}
