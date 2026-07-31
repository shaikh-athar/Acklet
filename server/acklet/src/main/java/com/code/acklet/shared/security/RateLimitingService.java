package com.code.acklet.shared.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitingService {

    private final StringRedisTemplate redisTemplate;
    private static final String RATE_LIMIT_PREFIX = "rate_limit:";

    public boolean isAllowed(String key, int maxRequests, int windowSeconds) {
        if (key == null || key.isBlank()) return true;
        String redisKey = RATE_LIMIT_PREFIX + key;
        try {
            Long count = redisTemplate.opsForValue().increment(redisKey);
            if (count != null && count == 1) {
                redisTemplate.expire(redisKey, Duration.ofSeconds(windowSeconds));
            }
            return count != null && count <= maxRequests;
        } catch (Exception e) {
            log.warn("[RateLimit] Redis error checking key {}: {}. Bypassing limit.", key, e.getMessage());
            return true; // Resilient fallback
        }
    }

    public long getRetryAfterSeconds(String key, int windowSeconds) {
        String redisKey = RATE_LIMIT_PREFIX + key;
        try {
            Long ttl = redisTemplate.getExpire(redisKey);
            return (ttl != null && ttl > 0) ? ttl : windowSeconds;
        } catch (Exception e) {
            return windowSeconds;
        }
    }
}
