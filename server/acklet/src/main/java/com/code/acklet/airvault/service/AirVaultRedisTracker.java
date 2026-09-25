package com.code.acklet.airvault.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultRedisTracker {

    private static final String CHUNKS_PREFIX = "airvault:upload:chunks:";
    private static final String STATUS_PREFIX = "airvault:upload:status:";
    private static final Duration DEFAULT_TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;

    public void recordChunkReceived(UUID sessionId, int chunkIndex, long chunkSize) {
        String key = CHUNKS_PREFIX + sessionId.toString();
        redisTemplate.opsForSet().add(key, String.valueOf(chunkIndex));
        redisTemplate.expire(key, DEFAULT_TTL);

        String statusKey = STATUS_PREFIX + sessionId.toString();
        redisTemplate.opsForValue().set(statusKey, "UPLOADING", DEFAULT_TTL);
    }

    public int getReceivedChunksCount(UUID sessionId) {
        String key = CHUNKS_PREFIX + sessionId.toString();
        Long size = redisTemplate.opsForSet().size(key);
        return size != null ? size.intValue() : 0;
    }

    public Set<Integer> getReceivedChunkIndices(UUID sessionId) {
        String key = CHUNKS_PREFIX + sessionId.toString();
        Set<String> raw = redisTemplate.opsForSet().members(key);
        if (raw == null || raw.isEmpty()) return Collections.emptySet();

        return raw.stream()
                .map(Integer::parseInt)
                .collect(Collectors.toSet());
    }

    public List<Integer> getMissingChunks(UUID sessionId, int totalChunks) {
        Set<Integer> received = getReceivedChunkIndices(sessionId);
        List<Integer> missing = new ArrayList<>();
        for (int i = 0; i < totalChunks; i++) {
            if (!received.contains(i)) {
                missing.add(i);
            }
        }
        return missing;
    }

    public boolean isUploadComplete(UUID sessionId, int totalChunks) {
        return getReceivedChunksCount(sessionId) >= totalChunks;
    }

    public void setSessionStatus(UUID sessionId, String status) {
        String statusKey = STATUS_PREFIX + sessionId.toString();
        redisTemplate.opsForValue().set(statusKey, status, DEFAULT_TTL);
    }

    public String getSessionStatus(UUID sessionId) {
        String statusKey = STATUS_PREFIX + sessionId.toString();
        return redisTemplate.opsForValue().get(statusKey);
    }

    public void clearSession(UUID sessionId) {
        redisTemplate.delete(CHUNKS_PREFIX + sessionId.toString());
        redisTemplate.delete(STATUS_PREFIX + sessionId.toString());
    }

    // ==========================================
    // AUTHENTICATION, RATE LIMITING & QR PAIRING
    // ==========================================

    private static final String AUTH_ATTEMPTS_PREFIX = "airvault:auth:attempts:";
    private static final String AUTH_IP_PREFIX = "airvault:auth:ip:";
    private static final String SESSION_TOKEN_PREFIX = "airvault:session:token:";
    private static final String USER_SESSIONS_PREFIX = "airvault:user:sessions:";
    private static final String QR_PAIRING_PREFIX = "airvault:qr:token:";

    public boolean checkAndIncrementAuthAttempts(String username, String ip) {
        String userKey = AUTH_ATTEMPTS_PREFIX + username.toLowerCase().trim();
        String ipKey = AUTH_IP_PREFIX + ip.trim();

        String userAttempts = redisTemplate.opsForValue().get(userKey);
        if (userAttempts != null && Integer.parseInt(userAttempts) >= 5) {
            return false; // Lockout: Max 5 failed attempts per username per 15 min
        }

        String ipAttempts = redisTemplate.opsForValue().get(ipKey);
        if (ipAttempts != null && Integer.parseInt(ipAttempts) >= 20) {
            return false; // Lockout: Max 20 failed attempts per IP per hour
        }

        return true;
    }

    public void recordFailedAuthAttempt(String username, String ip) {
        String userKey = AUTH_ATTEMPTS_PREFIX + username.toLowerCase().trim();
        String ipKey = AUTH_IP_PREFIX + ip.trim();

        Long uCount = redisTemplate.opsForValue().increment(userKey);
        if (uCount != null && uCount == 1) {
            redisTemplate.expire(userKey, Duration.ofMinutes(15));
        }

        Long ipCount = redisTemplate.opsForValue().increment(ipKey);
        if (ipCount != null && ipCount == 1) {
            redisTemplate.expire(ipKey, Duration.ofHours(1));
        }
    }

    public void clearAuthAttempts(String username) {
        redisTemplate.delete(AUTH_ATTEMPTS_PREFIX + username.toLowerCase().trim());
    }

    public void storeDeviceSession(String token, String username, String clientDeviceId, Duration ttl) {
        String tokenKey = SESSION_TOKEN_PREFIX + token;
        redisTemplate.opsForValue().set(tokenKey, username + ":" + clientDeviceId, ttl);

        String userSessionsKey = USER_SESSIONS_PREFIX + username.toLowerCase().trim();
        redisTemplate.opsForSet().add(userSessionsKey, token);
        redisTemplate.expire(userSessionsKey, ttl);
    }

    public boolean validateDeviceSession(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(SESSION_TOKEN_PREFIX + token));
    }

    public void invalidateAllUserSessions(String username) {
        String userSessionsKey = USER_SESSIONS_PREFIX + username.toLowerCase().trim();
        Set<String> tokens = redisTemplate.opsForSet().members(userSessionsKey);
        if (tokens != null && !tokens.isEmpty()) {
            for (String t : tokens) {
                redisTemplate.delete(SESSION_TOKEN_PREFIX + t);
            }
        }
        redisTemplate.delete(userSessionsKey);
    }

    public void createQrPairingToken(String qrToken, String username, String clientDeviceId, Duration ttl) {
        String key = QR_PAIRING_PREFIX + qrToken;
        redisTemplate.opsForValue().set(key, username + ":" + clientDeviceId, ttl);
    }

    public String consumeQrPairingToken(String qrToken) {
        String key = QR_PAIRING_PREFIX + qrToken;
        String val = redisTemplate.opsForValue().get(key);
        if (val != null) {
            redisTemplate.delete(key); // Single use
        }
        return val;
    }

    // ==========================================
    // DEVICE & SESSION PRESENCE (Online / Offline)
    // ==========================================

    /** TTL-based presence: session key expires 25s after last heartbeat. */
    private static final String PRESENCE_SESSION_PREFIX = "airvault:presence:session:";
    private static final String PRESENCE_DEVICE_SESSIONS_PREFIX = "airvault:presence:device_sessions:";
    private static final String PRESENCE_PREFIX = "airvault:presence:";
    private static final Duration SESSION_PRESENCE_TTL = Duration.ofSeconds(90);
    private static final Duration DEVICE_PRESENCE_TTL = Duration.ofSeconds(120);

    /**
     * Mark a WebSocket session as online with timestamp.
     * Also associates the session with the deviceId set in Redis.
     */
    public void recordSessionHeartbeat(String clientDeviceId, String sessionId) {
        try {
            long now = System.currentTimeMillis();
            String sessionKey = PRESENCE_SESSION_PREFIX + sessionId;
            redisTemplate.opsForValue().set(sessionKey, String.valueOf(now), SESSION_PRESENCE_TTL);

            String deviceSessionsKey = PRESENCE_DEVICE_SESSIONS_PREFIX + clientDeviceId;
            redisTemplate.opsForSet().add(deviceSessionsKey, sessionId);
            redisTemplate.expire(deviceSessionsKey, DEVICE_PRESENCE_TTL);

            // Maintain legacy/convenience device presence key
            String deviceKey = PRESENCE_PREFIX + clientDeviceId;
            redisTemplate.opsForValue().set(deviceKey, "online", DEVICE_PRESENCE_TTL);
        } catch (Exception e) {
            log.warn("[AirVault Redis] Failed to record session heartbeat for session {}: {}", sessionId, e.getMessage());
        }
    }

    /**
     * Removes a session from the device's active session set.
     */
    public void removeSessionPresence(String clientDeviceId, String sessionId) {
        try {
            redisTemplate.delete(PRESENCE_SESSION_PREFIX + sessionId);
            String deviceSessionsKey = PRESENCE_DEVICE_SESSIONS_PREFIX + clientDeviceId;
            redisTemplate.opsForSet().remove(deviceSessionsKey, sessionId);
        } catch (Exception e) {
            log.warn("[AirVault Redis] Failed to remove session presence for session {}: {}", sessionId, e.getMessage());
        }
    }

    /**
     * Mark a device as online (fallback/REST/initial).
     */
    public void recordDeviceOnline(String clientDeviceId) {
        try {
            String key = PRESENCE_PREFIX + clientDeviceId;
            redisTemplate.opsForValue().set(key, "online", DEVICE_PRESENCE_TTL);
        } catch (Exception e) {
            log.warn("[AirVault Redis] Failed to record device online for {}: {}", clientDeviceId, e.getMessage());
        }
    }

    /**
     * Explicitly mark a device offline (e.g. clean browser close via sendBeacon).
     */
    public void recordDeviceOffline(String clientDeviceId) {
        try {
            redisTemplate.delete(PRESENCE_PREFIX + clientDeviceId);
            redisTemplate.delete(PRESENCE_DEVICE_SESSIONS_PREFIX + clientDeviceId);
        } catch (Exception e) {
            log.warn("[AirVault Redis] Failed to record device offline for {}: {}", clientDeviceId, e.getMessage());
        }
    }

    /**
     * Returns true if the device has an active presence key or active session.
     */
    public boolean isDeviceOnline(String clientDeviceId) {
        try {
            String deviceSessionsKey = PRESENCE_DEVICE_SESSIONS_PREFIX + clientDeviceId;
            Set<String> sessions = redisTemplate.opsForSet().members(deviceSessionsKey);
            if (sessions != null && !sessions.isEmpty()) {
                for (String sId : sessions) {
                    if (Boolean.TRUE.equals(redisTemplate.hasKey(PRESENCE_SESSION_PREFIX + sId))) {
                        return true;
                    }
                }
            }
            return Boolean.TRUE.equals(redisTemplate.hasKey(PRESENCE_PREFIX + clientDeviceId));
        } catch (Exception e) {
            log.warn("[AirVault Redis] Failed checking device online status for {}: {}", clientDeviceId, e.getMessage());
            return false;
        }
    }

    // ==========================================
    // DAY-GROUPED HISTORY CACHE-ASIDE (Redis)
    // ==========================================

    private static final String HISTORY_CACHE_PREFIX = "history:";
    private static final Duration HISTORY_CACHE_TTL = Duration.ofHours(1);

    public String getCachedDayHistory(String type, String identityKey, String date) {
        String key = HISTORY_CACHE_PREFIX + type + ":" + identityKey + ":" + date;
        return redisTemplate.opsForValue().get(key);
    }

    public void setCachedDayHistory(String type, String identityKey, String date, String json) {
        String key = HISTORY_CACHE_PREFIX + type + ":" + identityKey + ":" + date;
        redisTemplate.opsForValue().set(key, json, HISTORY_CACHE_TTL);
    }

    public void invalidateHistoryCache(String type, String identityKey, Instant timestamp) {
        if (identityKey == null) return;
        String date = java.time.LocalDate.ofInstant(timestamp != null ? timestamp : Instant.now(), java.time.ZoneOffset.UTC).toString();
        String key = HISTORY_CACHE_PREFIX + type + ":" + identityKey + ":" + date;
        redisTemplate.delete(key);
        // Also invalidate generic today
        String todayKey = HISTORY_CACHE_PREFIX + type + ":" + identityKey + ":today";
        redisTemplate.delete(todayKey);
    }

    // ==========================================
    // BURN-AFTER-READ ATOMIC CHECK-AND-SET (Redis)
    // ==========================================
    private static final String VIEWED_ITEM_PREFIX = "airvault:item:viewed:";
    private static final Duration VIEWED_ITEM_TTL = Duration.ofDays(30);

    /**
     * Atomically records the first view of an item using Redis SETNX (setIfAbsent).
     * Returns true ONLY for the first viewer (CAS success). Subsequent calls return false (no-op).
     */
    public boolean recordItemViewedAtomic(String itemId, String viewerDeviceId) {
        if (itemId == null || itemId.isBlank()) return false;
        String key = VIEWED_ITEM_PREFIX + itemId.trim();
        String val = (viewerDeviceId != null ? viewerDeviceId : "unknown") + ":" + Instant.now().toEpochMilli();
        Boolean wasSet = redisTemplate.opsForValue().setIfAbsent(key, val, VIEWED_ITEM_TTL);
        return Boolean.TRUE.equals(wasSet);
    }

    /**
     * Clears the viewed status of an item in Redis so a resent burn-after-read item
     * can undergo a fresh first-view-then-burn cycle on destination.
     */
    public void resetItemViewed(String itemId) {
        if (itemId == null || itemId.isBlank()) return;
        String key = VIEWED_ITEM_PREFIX + itemId.trim();
        redisTemplate.delete(key);
    }
}
