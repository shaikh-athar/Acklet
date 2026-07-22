package com.code.acklet.shared.security;

import com.code.acklet.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        // Initialize with default secret and short expiration times
        jwtTokenProvider = new JwtTokenProvider(
                "Mzg1OTM4OTVhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM=",
                60000,  // 1 minute access token
                3600000 // 1 hour refresh token
        );

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
