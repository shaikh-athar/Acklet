package com.code.acklet.shared.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final StringRedisTemplate redisTemplate;
    private static final String BLACKLIST_PREFIX = "token:blacklist:";

    public void blacklistToken(String jti, long remainingMs) {
        if (jti == null || jti.isBlank() || remainingMs <= 0) return;
        try {
            redisTemplate.opsForValue().set(BLACKLIST_PREFIX + jti, "revoked", Duration.ofMillis(remainingMs));
            log.info("[TokenBlacklist] Blacklisted JWT jti: {} in Redis for {} ms", jti, remainingMs);
        } catch (Exception e) {
            log.warn("[TokenBlacklist] Redis connection warning when blacklisting jti {}: {}", jti, e.getMessage());
        }
    }

    public boolean isBlacklisted(String jti) {
        if (jti == null || jti.isBlank()) return false;
        try {
            Boolean exists = redisTemplate.hasKey(BLACKLIST_PREFIX + jti);
            return Boolean.TRUE.equals(exists);
        } catch (Exception e) {
            log.warn("[TokenBlacklist] Redis GET failed for jti {}: {}. Bypassing blacklist check.", jti, e.getMessage());
            return false;
        }
    }
}
