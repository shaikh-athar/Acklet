package com.code.acklet.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class BruteForceProtectionService {

    private final StringRedisTemplate redisTemplate;
    private static final String FAILURE_PREFIX = "brute_force:failures:";
    private static final String LOCKOUT_PREFIX = "brute_force:lockout:";
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;

    public void recordFailedAttempt(String key) {
        if (key == null || key.isBlank()) return;
        String failKey = FAILURE_PREFIX + key;
        try {
            Long failures = redisTemplate.opsForValue().increment(failKey);
            if (failures != null && failures == 1) {
                redisTemplate.expire(failKey, Duration.ofMinutes(15));
            }
            if (failures != null && failures >= MAX_FAILED_ATTEMPTS) {
                redisTemplate.opsForValue().set(LOCKOUT_PREFIX + key, "locked", Duration.ofMinutes(LOCKOUT_DURATION_MINUTES));
                log.warn("[BruteForce] Account/IP {} locked out for {} minutes after {} failed attempts", key, LOCKOUT_DURATION_MINUTES, failures);
            }
        } catch (Exception e) {
            log.warn("[BruteForce] Redis error recording failure for {}: {}", key, e.getMessage());
        }
    }

    public boolean isLockedOut(String key) {
        if (key == null || key.isBlank()) return false;
        try {
            Boolean locked = redisTemplate.hasKey(LOCKOUT_PREFIX + key);
            return Boolean.TRUE.equals(locked);
        } catch (Exception e) {
            return false;
        }
    }

    public void resetFailures(String key) {
        if (key == null || key.isBlank()) return;
        try {
            redisTemplate.delete(FAILURE_PREFIX + key);
            redisTemplate.delete(LOCKOUT_PREFIX + key);
        } catch (Exception e) {
            log.warn("[BruteForce] Redis error resetting failures for {}: {}", key, e.getMessage());
        }
    }
}
