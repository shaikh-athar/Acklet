package com.code.acklet.shared.security;

import com.code.acklet.config.properties.AppProperties;
import com.code.acklet.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        AppProperties appProperties = new AppProperties();
        appProperties.getSecurity().getJwt().setSecret("Mzg1OTM4OTVhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM=");
        appProperties.getSecurity().getJwt().setAccessTokenExpirationMs(60000);
        appProperties.getSecurity().getJwt().setRefreshTokenExpirationMs(3600000);

        RsaKeyProvider rsaKeyProvider = new RsaKeyProvider();
        StringRedisTemplate redisTemplate = Mockito.mock(StringRedisTemplate.class);
        TokenBlacklistService tokenBlacklistService = new TokenBlacklistService(redisTemplate);

        jwtTokenProvider = new JwtTokenProvider(appProperties, rsaKeyProvider, tokenBlacklistService);

        userDetails = User.builder()
                .email("test@acklet.com")
                .role(User.Role.USER)
                .status(User.UserStatus.ACTIVE)
                .build();
    }

    @Test
    void testGenerateAndValidateAccessToken() {
        String token = jwtTokenProvider.generateAccessToken(userDetails);
        assertNotNull(token);

        String username = jwtTokenProvider.extractUsername(token);
        assertEquals("test@acklet.com", username);

        assertTrue(jwtTokenProvider.isTokenValid(token, userDetails));
    }

    @Test
    void testGenerateAndValidateRefreshToken() {
        String token = jwtTokenProvider.generateRefreshToken(userDetails);
        assertNotNull(token);

        String username = jwtTokenProvider.extractUsername(token);
        assertEquals("test@acklet.com", username);

        assertTrue(jwtTokenProvider.isTokenValid(token, userDetails));
    }

    @Test
    void testExtractExpiration() {
        String token = jwtTokenProvider.generateAccessToken(userDetails);
        Date expiration = jwtTokenProvider.extractExpiration(token);
        assertNotNull(expiration);
        assertTrue(expiration.after(new Date()));
    }

    @Test
    void testInvalidToken() {
        String invalidToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.invalid_signature";
        assertFalse(jwtTokenProvider.isTokenValid(invalidToken, userDetails));
    }
}
