package com.code.acklet.tool.tools.qr.service;

import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.tools.qr.config.QrLinkProperties;
import com.code.acklet.tool.tools.qr.dto.*;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.entity.QrLinkEntity;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.repository.QrLinkRepository;
import com.code.acklet.tool.tools.qr.util.Base62;
import com.code.acklet.tool.tools.qr.util.QrSecurityUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
@Slf4j
public class QrLinkService {

    private final QrLinkRepository qrLinkRepository;
    private final QrLinkProperties properties;
    private final QrCodeRepository qrCodeRepository;

    @Autowired
    public QrLinkService(
            QrLinkRepository qrLinkRepository,
            QrLinkProperties properties,
            @Autowired(required = false) QrCodeRepository qrCodeRepository) {
        this.qrLinkRepository = qrLinkRepository;
        this.properties = properties;
        this.qrCodeRepository = qrCodeRepository;
    }

    public QrLinkService(
            QrLinkRepository qrLinkRepository,
            QrLinkProperties properties) {
        this(qrLinkRepository, properties, null);
    }

    // Reserved path slugs blocked from dynamic link generation
    private static final Set<String> RESERVED_CODES = Set.of(
            "admin", "api", "app", "auth", "config", "dashboard", "docs", "help",
            "login", "logout", "manage", "notes", "oauth", "ping", "q", "qr",
            "root", "search", "share", "signin", "signup", "static", "status",
            "terms", "tool", "tools", "user", "v1", "v2", "view", "viewer"
    );

    // Sliding window IP rate limiter for link creation
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>> ipRateLimits = new ConcurrentHashMap<>();

    @Transactional
    public QrLinkResponse createLink(CreateQrLinkRequest request, String clientIp) {
        checkRateLimit(clientIp);

        String type = normalizeType(request.getType());
        String payload = validateAndNormalizePayload(type, request.getPayload());
        long bytes = payload.getBytes(StandardCharsets.UTF_8).length;

        String code = generateUniqueCode();
        String rawToken = "tok_" + UUID.randomUUID().toString().replace("-", "");
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.getDefaultTtlMonths() * 30L, ChronoUnit.DAYS);

        QrLinkEntity entity = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code(code)
                .type(type)
                .payload(payload)
                .mime(request.getMime() != null ? request.getMime() : defaultMimeForType(type))
                .contentBytes(bytes)
                .manageTokenHash(tokenHash)
                .status("ACTIVE")
                .scanCount(0L)
                .lastScanAt(null)
                .expiresAt(expiresAt)
                .createdAt(now)
                .updatedAt(now)
                .isDownloaded(false)
                .build();

        qrLinkRepository.save(entity);
        log.info("[QrLink] Created new dynamic QR link code={} type={} bytes={}", code, type, bytes);

        return QrLinkResponse.builder()
                .code(code)
                .shortUrl(buildShortUrl(code))
                .manageToken(rawToken)
                .expiresAt(expiresAt)
                .status(entity.getStatus())
                .type(entity.getType())
                .contentBytes(bytes)
                .build();
    }

    @Transactional
    public QrLinkResponse updateLink(String code, UpdateQrLinkRequest request, String rawToken) {
        QrLinkEntity entity = verifyOwnerAndGet(code, rawToken);

        String type = request.getType() != null && !request.getType().isBlank()
                ? normalizeType(request.getType())
                : entity.getType();

        String payload = validateAndNormalizePayload(type, request.getPayload());
        long bytes = payload.getBytes(StandardCharsets.UTF_8).length;

        entity.setType(type);
        entity.setPayload(payload);
        if (request.getMime() != null && !request.getMime().isBlank()) {
            entity.setMime(request.getMime());
        }
        entity.setContentBytes(bytes);
        entity.setUpdatedAt(Instant.now());

        qrLinkRepository.save(entity);

        // Keep legacy qr_codes record in sync if present
        if (qrCodeRepository != null) {
            qrCodeRepository.findByCode(code).ifPresent(legacy -> {
                legacy.setTargetUrl(payload);
                legacy.setUpdatedAt(Instant.now());
                qrCodeRepository.save(legacy);
            });
        }

        log.info("[QrLink] Updated dynamic QR link code={} type={} bytes={}", code, type, bytes);

        return QrLinkResponse.builder()
                .code(code)
                .shortUrl(buildShortUrl(code))
                .expiresAt(entity.getExpiresAt())
                .status(entity.getStatus())
                .type(entity.getType())
                .contentBytes(bytes)
                .build();
    }

    @Transactional
    public QrLinkStatsDto getStats(String code, String rawToken) {
        QrLinkEntity entity = verifyOwnerAndGet(code, rawToken);
        String preview = buildPreview(entity.getPayload());

        return QrLinkStatsDto.builder()
                .code(entity.getCode())
                .scanCount(entity.getScanCount())
                .lastScanAt(entity.getLastScanAt())
                .status(entity.getStatus())
                .expiresAt(entity.getExpiresAt())
                .preview(preview)
                .payload(entity.getPayload())
                .type(entity.getType())
                .contentBytes(entity.getContentBytes())
                .build();
    }

    @Transactional
    public QrLinkResponse setStatus(String code, String status, String rawToken) {
        QrLinkEntity entity = verifyOwnerAndGet(code, rawToken);
        entity.setStatus(status);
        entity.setUpdatedAt(Instant.now());
        qrLinkRepository.save(entity);

        if (qrCodeRepository != null) {
            qrCodeRepository.findByCode(code).ifPresent(legacy -> {
                legacy.setStatus(status);
                legacy.setUpdatedAt(Instant.now());
                qrCodeRepository.save(legacy);
            });
        }

        log.info("[QrLink] Changed status for code={} to {}", code, status);

        return QrLinkResponse.builder()
                .code(code)
                .shortUrl(buildShortUrl(code))
                .expiresAt(entity.getExpiresAt())
                .status(entity.getStatus())
                .type(entity.getType())
                .contentBytes(entity.getContentBytes())
                .build();
    }

    @Transactional
    public QrLinkResponse extendExpiry(String code, String rawToken) {
        QrLinkEntity entity = verifyOwnerAndGet(code, rawToken);
        Instant newExpiry = Instant.now().plus(properties.getDefaultTtlMonths() * 30L, ChronoUnit.DAYS);
        entity.setExpiresAt(newExpiry);
        entity.setUpdatedAt(Instant.now());
        qrLinkRepository.save(entity);

        if (qrCodeRepository != null) {
            qrCodeRepository.findByCode(code).ifPresent(legacy -> {
                legacy.setExpiresAt(newExpiry);
                legacy.setUpdatedAt(Instant.now());
                qrCodeRepository.save(legacy);
            });
        }

        log.info("[QrLink] Extended expiry for code={} to {}", code, newExpiry);

        return QrLinkResponse.builder()
                .code(code)
                .shortUrl(buildShortUrl(code))
                .expiresAt(newExpiry)
                .status(entity.getStatus())
                .type(entity.getType())
                .contentBytes(entity.getContentBytes())
                .build();
    }

    @Transactional
    public void markDownloaded(String code) {
        qrLinkRepository.findByCode(code).ifPresentOrElse(entity -> {
            if (!Boolean.TRUE.equals(entity.getIsDownloaded())) {
                entity.setIsDownloaded(true);
                entity.setUpdatedAt(Instant.now());
                qrLinkRepository.save(entity);
                log.info("[QrLink] Marked code={} as downloaded (rescued from orphan TTL)", code);
            }
        }, () -> {
            if (qrCodeRepository != null) {
                qrCodeRepository.findByCode(code).ifPresent(legacy -> {
                    QrLinkEntity migrated = mapLegacyToQrLink(legacy);
                    migrated.setIsDownloaded(true);
                    qrLinkRepository.save(migrated);
                    log.info("[QrLink] Migrated and marked code={} as downloaded", code);
                });
            }
        });
    }

    @Transactional
    public void deleteLink(String code, String rawToken) {
        QrLinkEntity entity = verifyOwnerAndGet(code, rawToken);
        qrLinkRepository.delete(entity);

        if (qrCodeRepository != null) {
            qrCodeRepository.findByCode(code).ifPresent(legacy -> {
                qrCodeRepository.delete(legacy);
                log.info("[QrLink] Also deleted legacy qr_codes record for code={}", code);
            });
        }

        log.info("[QrLink] Deleted link code={}", code);
    }

    @Transactional
    public List<QrLinkSummaryDto> lookupSummaries(QrLinkLookupRequest request) {
        if (request == null || request.getLinks() == null || request.getLinks().isEmpty()) {
            return Collections.emptyList();
        }

        List<QrLinkLookupItem> items = request.getLinks().stream()
                .filter(item -> item.getCode() != null && item.getToken() != null)
                .limit(100)
                .toList();

        List<String> codes = items.stream().map(QrLinkLookupItem::getCode).toList();
        List<QrLinkEntity> entities = qrLinkRepository.findByCodeIn(codes);
        Map<String, QrLinkEntity> entityMap = new HashMap<>();
        for (QrLinkEntity e : entities) {
            entityMap.put(e.getCode(), e);
        }

        List<QrLinkSummaryDto> summaries = new ArrayList<>();
        for (QrLinkLookupItem item : items) {
            QrLinkEntity entity = entityMap.get(item.getCode());
            if (entity != null) {
                String providedHash = QrSecurityUtil.sha256(item.getToken().trim());
                if (providedHash.equalsIgnoreCase(entity.getManageTokenHash())) {
                    summaries.add(toSummaryDto(entity));
                }
            } else if (qrCodeRepository != null) {
                Optional<QrCodeEntity> legacyOpt = qrCodeRepository.findByCode(item.getCode());
                if (legacyOpt.isPresent()) {
                    QrCodeEntity legacy = legacyOpt.get();
                    String providedHash = QrSecurityUtil.sha256(item.getToken().trim());
                    if (providedHash.equalsIgnoreCase(legacy.getManageKeyHash())) {
                        QrLinkEntity migrated = mapLegacyToQrLink(legacy);
                        qrLinkRepository.save(migrated);
                        entityMap.put(migrated.getCode(), migrated);
                        summaries.add(toSummaryDto(migrated));
                        log.info("[QrLink] Discovered and auto-migrated legacy QR link code={} to QrLinkEntity", item.getCode());
                    }
                }
            }
        }

        return summaries;
    }

    @Async
    @Transactional
    public void recordScanAsync(String code) {
        try {
            qrLinkRepository.findByCode(code).ifPresentOrElse(entity -> {
                Instant now = Instant.now();
                entity.setScanCount(entity.getScanCount() + 1);
                entity.setLastScanAt(now);
                // Rolling TTL extension
                entity.setExpiresAt(now.plus(properties.getDefaultTtlMonths() * 30L, ChronoUnit.DAYS));
                qrLinkRepository.save(entity);
            }, () -> {
                if (qrCodeRepository != null) {
                    qrCodeRepository.findByCode(code).ifPresent(legacy -> {
                        legacy.setScanCount((legacy.getScanCount() != null ? legacy.getScanCount() : 0L) + 1);
                        qrCodeRepository.save(legacy);
                    });
                }
            });
        } catch (Exception e) {
            log.warn("[QrLink] Failed to record asynchronous scan telemetry for code={}: {}", code, e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 3600000) // Hourly background cleanup
    @Transactional
    public void cleanupExpiredAndOrphanLinks() {
        Instant now = Instant.now();
        log.info("[QrLinkCleanup] Running scheduled cleanup for expired and orphan links...");

        // 1. Clean up expired links (expiresAt < now or status == 'EXPIRED')
        int deletedExpired = qrLinkRepository.deleteExpiredLinks(now, "EXPIRED");
        if (deletedExpired > 0) {
            log.info("[QrLinkCleanup] Deleted {} expired QR links", deletedExpired);
        }

        // 2. Clean up orphan links (never scanned, never marked downloaded, created > 24 hours ago)
        Instant orphanCutoff = now.minus(properties.getOrphanTtlHours(), ChronoUnit.HOURS);
        int deletedOrphans = qrLinkRepository.deleteOrphanLinks(orphanCutoff);
        if (deletedOrphans > 0) {
            log.info("[QrLinkCleanup] Deleted {} orphan un-downloaded QR links", deletedOrphans);
        }
    }

    public Optional<QrLinkEntity> findByCode(String code) {
        if (code == null) return Optional.empty();
        String trimmed = code.trim();
        Optional<QrLinkEntity> entityOpt = qrLinkRepository.findByCode(trimmed)
                .filter(entity -> entity.getCode().equals(trimmed));
        if (entityOpt.isPresent()) {
            return entityOpt;
        }

        if (qrCodeRepository != null) {
            Optional<QrCodeEntity> legacyOpt = qrCodeRepository.findByCode(trimmed);
            if (legacyOpt.isPresent()) {
                QrLinkEntity migrated = mapLegacyToQrLink(legacyOpt.get());
                qrLinkRepository.save(migrated);
                return Optional.of(migrated);
            }
        }

        return Optional.empty();
    }

    private QrLinkEntity verifyOwnerAndGet(String code, String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Manage token is missing in request headers");
        }

        Optional<QrLinkEntity> entityOpt = qrLinkRepository.findByCode(code);
        if (entityOpt.isPresent()) {
            QrLinkEntity entity = entityOpt.get();
            String computedHash = QrSecurityUtil.sha256(rawToken.trim());
            if (!computedHash.equalsIgnoreCase(entity.getManageTokenHash())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid management token for link " + code);
            }
            return entity;
        }

        if (qrCodeRepository != null) {
            Optional<QrCodeEntity> legacyOpt = qrCodeRepository.findByCode(code);
            if (legacyOpt.isPresent()) {
                QrCodeEntity legacy = legacyOpt.get();
                String computedHash = QrSecurityUtil.sha256(rawToken.trim());
                if (!computedHash.equalsIgnoreCase(legacy.getManageKeyHash())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid management token for link " + code);
                }
                QrLinkEntity migrated = mapLegacyToQrLink(legacy);
                qrLinkRepository.save(migrated);
                log.info("[QrLink] Auto-migrated legacy QR code code={} to QrLinkEntity", code);
                return migrated;
            }
        }

        throw new ResourceNotFoundException("QR link not found: " + code);
    }

    private QrLinkSummaryDto toSummaryDto(QrLinkEntity entity) {
        return QrLinkSummaryDto.builder()
                .code(entity.getCode())
                .shortUrl(buildShortUrl(entity.getCode()))
                .type(entity.getType())
                .preview(buildPreview(entity.getPayload()))
                .scanCount(entity.getScanCount())
                .createdAt(entity.getCreatedAt())
                .expiresAt(entity.getExpiresAt())
                .lastScanAt(entity.getLastScanAt())
                .status(entity.getStatus())
                .contentBytes(entity.getContentBytes())
                .mime(entity.getMime())
                .build();
    }

    private QrLinkEntity mapLegacyToQrLink(QrCodeEntity legacy) {
        String type = normalizeType(legacy.getType());
        String payload = legacy.getTargetUrl() != null && !legacy.getTargetUrl().isBlank()
                ? legacy.getTargetUrl()
                : (legacy.getContentJson() != null ? legacy.getContentJson() : "");
        long bytes = payload.getBytes(StandardCharsets.UTF_8).length;
        Instant now = Instant.now();
        Instant expiresAt = legacy.getExpiresAt() != null
                ? legacy.getExpiresAt()
                : now.plus(properties.getDefaultTtlMonths() * 30L, ChronoUnit.DAYS);

        Optional<QrLinkEntity> existingOpt = qrLinkRepository.findByCode(legacy.getCode());
        UUID id = existingOpt.map(QrLinkEntity::getId).orElseGet(UUID::randomUUID);

        return QrLinkEntity.builder()
                .id(id)
                .code(legacy.getCode())
                .type(type)
                .payload(payload)
                .mime(defaultMimeForType(type))
                .contentBytes(bytes)
                .manageTokenHash(legacy.getManageKeyHash())
                .status(legacy.getStatus() != null ? legacy.getStatus() : "ACTIVE")
                .scanCount(legacy.getScanCount() != null ? legacy.getScanCount() : 0L)
                .lastScanAt(null)
                .expiresAt(expiresAt)
                .createdAt(legacy.getCreatedAt() != null ? legacy.getCreatedAt() : now)
                .updatedAt(legacy.getUpdatedAt() != null ? legacy.getUpdatedAt() : now)
                .isDownloaded(true)
                .build();
    }

    private String validateAndNormalizePayload(String type, String rawPayload) {
        if (rawPayload == null || rawPayload.isBlank()) {
            throw new IllegalArgumentException("Payload cannot be empty");
        }

        String payload = QrSecurityUtil.normalizeNfc(rawPayload);
        long bytes = payload.getBytes(StandardCharsets.UTF_8).length;

        switch (type) {
            case "URL" -> {
                if (payload.length() > properties.getMaxUrlChars()) {
                    throw new IllegalArgumentException("URL length (" + payload.length() + ") exceeds maximum limit of " + properties.getMaxUrlChars() + " characters");
                }
                QrSecurityUtil.validateTargetUrl(payload, properties.isBlockPrivateTargets());
            }
            case "TEXT" -> {
                if (payload.length() > properties.getMaxTextChars()) {
                    throw new IllegalArgumentException("Text length (" + payload.length() + ") exceeds maximum limit of " + properties.getMaxTextChars() + " characters");
                }
            }
            default -> {
                if (bytes > properties.getMaxOtherBytes()) {
                    throw new IllegalArgumentException("Payload size (" + bytes + " bytes) exceeds maximum limit of " + properties.getMaxOtherBytes() + " bytes");
                }
            }
        }

        return payload;
    }

    private String normalizeType(String type) {
        if (type == null || type.isBlank()) return "URL";
        String upper = type.trim().toUpperCase(Locale.ROOT);
        return switch (upper) {
            case "URL", "DYNAMIC_URL" -> "URL";
            case "TEXT", "PLAIN_TEXT" -> "TEXT";
            case "VCARD", "DYNAMIC_VCARD" -> "VCARD";
            default -> "OTHER";
        };
    }

    private String defaultMimeForType(String type) {
        return switch (type) {
            case "URL" -> "text/uri-list";
            case "TEXT" -> "text/plain";
            case "VCARD" -> "text/vcard";
            default -> "application/octet-stream";
        };
    }

    private String generateUniqueCode() {
        for (int i = 0; i < 50; i++) {
            String candidate = Base62.randomSlug(7);
            if (!RESERVED_CODES.contains(candidate.toLowerCase(Locale.ROOT))
                    && !qrLinkRepository.existsByCode(candidate)
                    && (qrCodeRepository == null || !qrCodeRepository.existsByCode(candidate))) {
                return candidate;
            }
        }
        return UUID.randomUUID().toString().replace("-", "").substring(0, 7);
    }

    private String buildShortUrl(String code) {
        String base = properties.getShortlinkBaseUrl().replaceAll("/+$", "");
        return base + "/" + code;
    }

    private String buildPreview(String payload) {
        if (payload == null) return "";
        String trimmed = payload.strip().replaceAll("\\s+", " ");
        if (trimmed.length() <= 60) return trimmed;
        return trimmed.substring(0, 60) + "...";
    }

    private void checkRateLimit(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) return;
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L; // 1-minute window

        ConcurrentLinkedDeque<Long> timestamps = ipRateLimits.computeIfAbsent(clientIp, k -> new ConcurrentLinkedDeque<>());
        // Evict expired entries
        while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= properties.getCreateRateLimitPerMinute()) {
            log.warn("[QrLinkRateLimit] IP {} exceeded create rate limit ({} requests/min)", clientIp, properties.getCreateRateLimitPerMinute());
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Link creation rate limit reached. Please wait a moment before trying again.");
        }

        timestamps.addLast(now);
    }
}
