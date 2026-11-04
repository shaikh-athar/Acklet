package com.code.acklet.tool.tools.barcode.service;

import com.code.acklet.shared.security.RateLimitingService;
import com.code.acklet.tool.tools.barcode.config.TempCodeProperties;
import com.code.acklet.tool.tools.barcode.dto.*;
import com.code.acklet.tool.tools.barcode.entity.TempCodeEntity;
import com.code.acklet.tool.tools.barcode.entity.TempCodeReportEntity;
import com.code.acklet.tool.tools.barcode.repository.TempCodeReportRepository;
import com.code.acklet.tool.tools.barcode.repository.TempCodeRepository;
import com.code.acklet.tool.tools.barcode.security.TempCodeMessageCatalog;
import com.code.acklet.tool.tools.barcode.util.TempCodeSecurityHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TempCodeService {

    private final TempCodeRepository repository;
    private final TempCodeReportRepository reportRepository;
    private final TempCodeSecurityHelper securityHelper;
    private final TempCodeProperties properties;
    private final RateLimitingService rateLimitingService;
    private final Clock clock;

    /**
     * Creates a new temporary barcode with server-enforced expiration and ownership token.
     */
    @Transactional
    public TempCodeResponse createCode(CreateTempCodeRequest request, String rawOwnerToken, String clientIp) {
        checkRateLimit("temp_barcode:create:" + securityHelper.pepperHash(clientIp),
                properties.getRateLimit().getCreatePerHour(), 3600, "Code creation limit reached. Please try again later.");

        String returnedOwnerToken = null;
        String ownerTokenToUse = rawOwnerToken;
        if (ownerTokenToUse == null || ownerTokenToUse.isBlank()) {
            returnedOwnerToken = securityHelper.generateOwnerToken();
            ownerTokenToUse = returnedOwnerToken;
        }
        String ownerTokenHash = securityHelper.hashOwnerToken(ownerTokenToUse);

        Instant now = clock.instant();

        // Check maximum active codes limit per owner
        long activeCount = repository.countActiveByOwnerTokenHash(ownerTokenHash, now);
        if (activeCount >= properties.getMaxActiveCodesPerOwner()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    TempCodeMessageCatalog.getFriendlyMessage(TempCodeMessageCatalog.MAX_ACTIVE_REACHED));
        }

        // Calculate and validate expiresAt
        Instant expiresAt;
        if (request.getExpiresAt() != null) {
            expiresAt = request.getExpiresAt();
        } else if (request.getDurationSeconds() != null && request.getDurationSeconds() > 0) {
            expiresAt = now.plusSeconds(request.getDurationSeconds());
        } else {
            expiresAt = now.plus(24, ChronoUnit.HOURS);
        }

        Instant minExpires = now.plus(properties.getMinExpiryMinutes(), ChronoUnit.MINUTES);
        Instant maxExpires = now.plus(properties.getMaxExpiryDays(), ChronoUnit.DAYS);

        if (expiresAt.isBefore(minExpires)) {
            throw new IllegalArgumentException("Choose a time at least 1 minute from now.");
        }
        if (expiresAt.isAfter(maxExpires)) {
            throw new IllegalArgumentException("The maximum is 365 days.");
        }

        // Validate payload mode and content
        String payloadMode = request.getPayloadMode() != null ? request.getPayloadMode().trim().toUpperCase(Locale.ROOT) : "LINK";
        if (!"LINK".equals(payloadMode) && !"CODE".equals(payloadMode)) {
            payloadMode = "LINK";
        }

        String contentType = request.getContentType() != null ? request.getContentType().trim().toUpperCase(Locale.ROOT) : "MESSAGE";
        String contentToStore = null;

        if ("MESSAGE".equals(contentType)) {
            contentToStore = securityHelper.sanitizeMessage(request.getContent());
        } else if ("LINK".equals(contentType)) {
            contentToStore = securityHelper.validateAndNormalizeUrl(request.getContent());
        } else if ("REFERENCE_ONLY".equals(contentType)) {
            contentToStore = null;
        } else {
            throw new IllegalArgumentException("Invalid content type: " + request.getContentType());
        }

        String reference = securityHelper.sanitizeReference(request.getReference());

        // Generate cryptographically unique token (minimum 80 bits entropy)
        String token = null;
        String tokenHash = null;
        for (int i = 0; i < 10; i++) {
            String candidate = securityHelper.generateToken();
            String candidateHash = securityHelper.hashToken(candidate);
            if (repository.findByTokenHash(candidateHash).isEmpty()) {
                token = candidate;
                tokenHash = candidateHash;
                break;
            }
        }
        if (token == null) {
            throw new IllegalStateException("Failed to generate unique temporary code token");
        }

        String barcodeFormat = request.getBarcodeFormat() != null ? request.getBarcodeFormat().trim().toLowerCase(Locale.ROOT) : "qrcode";
        String verifyBase = properties.resolveVerifyBaseUrl(barcodeFormat);

        // Build encoded payload and validate format capacity
        String payload = "LINK".equals(payloadMode)
                ? verifyBase + "/v/" + token
                : token;

        securityHelper.validateFormatAndPayload(barcodeFormat, payload);

        String name = request.getName() != null && !request.getName().isBlank()
                ? request.getName().trim()
                : "Temporary 1";

        Instant purgeAt = expiresAt.plus(properties.getPurgeDays(), ChronoUnit.DAYS);

        TempCodeEntity entity = TempCodeEntity.builder()
                .id(UUID.randomUUID())
                .ownerTokenHash(ownerTokenHash)
                .name(name)
                .token(token)
                .tokenHash(tokenHash)
                .payloadMode(payloadMode)
                .contentType(contentType)
                .content(contentToStore)
                .reference(reference)
                .barcodeFormat(barcodeFormat)
                .showExpiryOnLabel(Boolean.TRUE.equals(request.getShowExpiryOnLabel()))
                .createdAt(now)
                .expiresAt(expiresAt)
                .status("ACTIVE")
                .checkCount(0L)
                .purgeAt(purgeAt)
                .build();

        repository.save(entity);
        log.info("[TempCode] Created temporary code id={}, format={}, expiresAt={}", entity.getId(), barcodeFormat, expiresAt);

        TempCodeResponse response = mapToResponse(entity, now);
        response.setOwnerToken(returnedOwnerToken);
        return response;
    }

    /**
     * Lists temporary codes owned by caller.
     */
    @Transactional(readOnly = true)
    public TempCodeListResponse listOwnerCodes(String rawOwnerToken, String search, String status, String sortOption, int page, int size) {
        if (rawOwnerToken == null || rawOwnerToken.isBlank()) {
            return TempCodeListResponse.builder().items(List.of()).total(0).page(page).size(size).build();
        }

        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        Instant now = clock.instant();

        Sort sort = "EXPIRING_SOON".equalsIgnoreCase(sortOption)
                ? Sort.by(Sort.Direction.ASC, "expiresAt")
                : Sort.by(Sort.Direction.DESC, "createdAt");

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), sort);

        Page<TempCodeEntity> pageResult = repository.findByOwnerWithFilters(
                ownerTokenHash,
                (search != null && !search.isBlank()) ? search.trim() : null,
                status != null ? status.trim().toUpperCase(Locale.ROOT) : "ALL",
                now,
                pageable
        );

        List<TempCodeResponse> items = pageResult.getContent().stream()
                .map(e -> mapToResponse(e, now))
                .collect(Collectors.toList());

        return TempCodeListResponse.builder()
                .items(items)
                .total(pageResult.getTotalElements())
                .page(page)
                .size(size)
                .build();
    }

    /**
     * Retrieves single temporary code owned by caller.
     */
    @Transactional(readOnly = true)
    public TempCodeResponse getOwnerCode(UUID id, String rawOwnerToken) {
        TempCodeEntity entity = verifyOwnerAndGet(id, rawOwnerToken);
        return mapToResponse(entity, clock.instant());
    }

    /**
     * Updates temporary code (extend, expireNow, rename).
     */
    @Transactional
    public TempCodeResponse updateCode(UUID id, UpdateTempCodeRequest request, String rawOwnerToken) {
        TempCodeEntity entity = verifyOwnerAndGet(id, rawOwnerToken);
        Instant now = clock.instant();
        String action = request.getAction() != null ? request.getAction().trim().toLowerCase(Locale.ROOT) : "";

        if ("extend".equals(action)) {
            Instant newExpiresAt;
            if (request.getNewExpiresAt() != null) {
                newExpiresAt = request.getNewExpiresAt();
            } else if (request.getExtensionSeconds() != null && request.getExtensionSeconds() > 0) {
                // If active: add to current expiry. If expired/deactivated: extend from now.
                Instant baseTime = ("ACTIVE".equals(entity.getStatus()) && entity.getExpiresAt().isAfter(now))
                        ? entity.getExpiresAt()
                        : now;
                newExpiresAt = baseTime.plusSeconds(request.getExtensionSeconds());
            } else {
                throw new IllegalArgumentException("Extension duration or until date must be provided");
            }

            Instant maxExpires = now.plus(properties.getMaxExpiryDays(), ChronoUnit.DAYS);
            if (newExpiresAt.isAfter(maxExpires)) {
                throw new IllegalArgumentException("The maximum is 365 days.");
            }
            if (newExpiresAt.isBefore(now.plus(1, ChronoUnit.MINUTES))) {
                throw new IllegalArgumentException("Choose a time at least 1 minute from now.");
            }

            entity.setExpiresAt(newExpiresAt);
            entity.setPurgeAt(newExpiresAt.plus(properties.getPurgeDays(), ChronoUnit.DAYS));
            entity.setStatus("ACTIVE");
            log.info("[TempCode] Extended code id={} to newExpiresAt={}", id, newExpiresAt);
        } else if ("expirenow".equals(action) || "expire_now".equals(action)) {
            entity.setStatus("DEACTIVATED");
            log.info("[TempCode] Deactivated code id={} via expireNow", id);
        } else if ("rename".equals(action)) {
            if (request.getName() == null || request.getName().isBlank()) {
                throw new IllegalArgumentException("Name cannot be empty");
            }
            entity.setName(request.getName().trim());
        } else {
            throw new IllegalArgumentException("Unsupported action: " + request.getAction());
        }

        repository.save(entity);
        return mapToResponse(entity, now);
    }

    /**
     * Immediately deletes code (later verification checks return Not found).
     */
    @Transactional
    public void deleteCode(UUID id, String rawOwnerToken) {
        TempCodeEntity entity = verifyOwnerAndGet(id, rawOwnerToken);
        repository.delete(entity);
        log.info("[TempCode] Deleted code id={}", id);
    }

    /**
     * Creates a batch of temporary codes atomically.
     */
    @Transactional
    public BatchTempCodeResponse createBatch(BatchCreateTempCodeRequest request, String rawOwnerToken, String clientIp) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Batch items cannot be empty");
        }
        int itemCount = request.getItems().size();
        if (itemCount > properties.getMaxBatchItems()) {
            throw new IllegalArgumentException("Batch size exceeds maximum limit of " + properties.getMaxBatchItems());
        }

        String returnedOwnerToken = null;
        String ownerTokenToUse = rawOwnerToken;
        if (ownerTokenToUse == null || ownerTokenToUse.isBlank()) {
            returnedOwnerToken = securityHelper.generateOwnerToken();
            ownerTokenToUse = returnedOwnerToken;
        }
        String ownerTokenHash = securityHelper.hashOwnerToken(ownerTokenToUse);

        // Idempotency: if duplicate submission with same idempotency key for this owner, return existing batch
        String idempotencyKey = request.getIdempotencyKey() != null ? request.getIdempotencyKey().trim() : null;
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            List<TempCodeEntity> existing = repository.findByOwnerTokenHashAndIdempotencyKey(ownerTokenHash, idempotencyKey);
            if (!existing.isEmpty()) {
                Instant now = clock.instant();
                List<TempCodeResponse> existingResponses = existing.stream()
                        .map(e -> mapToResponse(e, now))
                        .collect(Collectors.toList());
                return BatchTempCodeResponse.builder()
                        .batchId(existing.get(0).getBatchId())
                        .items(existingResponses)
                        .totalCount(existingResponses.size())
                        .expiresAt(existing.get(0).getExpiresAt())
                        .ownerToken(returnedOwnerToken)
                        .build();
            }
        }

        // Rate limit counts items
        checkRateLimitWithDelta("temp_barcode:create:" + securityHelper.pepperHash(clientIp),
                itemCount, properties.getRateLimit().getCreatePerHour(), 3600,
                "Code creation limit reached. Please try again later.");

        Instant now = clock.instant();

        // Check active count limit
        long activeCount = repository.countActiveByOwnerTokenHash(ownerTokenHash, now);
        if (activeCount + itemCount > properties.getMaxActiveCodesPerOwner()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    TempCodeMessageCatalog.getFriendlyMessage(TempCodeMessageCatalog.MAX_ACTIVE_REACHED));
        }

        // Calculate and validate expiresAt
        Instant expiresAt;
        if (request.getExpiresAt() != null) {
            expiresAt = request.getExpiresAt();
        } else if (request.getDurationSeconds() != null && request.getDurationSeconds() > 0) {
            expiresAt = now.plusSeconds(request.getDurationSeconds());
        } else {
            expiresAt = now.plus(24, ChronoUnit.HOURS);
        }

        Instant minExpires = now.plus(properties.getMinExpiryMinutes(), ChronoUnit.MINUTES);
        Instant maxExpires = now.plus(properties.getMaxExpiryDays(), ChronoUnit.DAYS);

        if (expiresAt.isBefore(minExpires)) {
            throw new IllegalArgumentException("Choose a time at least 1 minute from now.");
        }
        if (expiresAt.isAfter(maxExpires)) {
            throw new IllegalArgumentException("The maximum is 365 days.");
        }

        String payloadMode = request.getPayloadMode() != null ? request.getPayloadMode().trim().toUpperCase(Locale.ROOT) : "LINK";
        if (!"LINK".equals(payloadMode) && !"CODE".equals(payloadMode)) {
            payloadMode = "LINK";
        }

        String contentType = request.getContentType() != null ? request.getContentType().trim().toUpperCase(Locale.ROOT) : "MESSAGE";
        if (!"MESSAGE".equals(contentType) && !"REFERENCE_ONLY".equals(contentType)) {
            contentType = "MESSAGE";
        }

        String barcodeFormat = request.getBarcodeFormat() != null ? request.getBarcodeFormat().trim().toLowerCase(Locale.ROOT) : "qrcode";
        Instant purgeAt = expiresAt.plus(properties.getPurgeDays(), ChronoUnit.DAYS);
        UUID batchId = UUID.randomUUID();

        List<TempCodeEntity> entitiesToSave = new java.util.ArrayList<>(itemCount);

        for (int idx = 0; idx < itemCount; idx++) {
            BatchItemRequest item = request.getItems().get(idx);
            String contentToStore = null;
            if ("MESSAGE".equals(contentType)) {
                contentToStore = securityHelper.sanitizeMessage(item.getContent());
            }

            String reference = securityHelper.sanitizeReference(item.getReference());

            // Unique token
            String token = null;
            String tokenHash = null;
            for (int attempt = 0; attempt < 10; attempt++) {
                String candidate = securityHelper.generateToken();
                String candidateHash = securityHelper.hashToken(candidate);
                if (repository.findByTokenHash(candidateHash).isEmpty()) {
                    token = candidate;
                    tokenHash = candidateHash;
                    break;
                }
            }
            if (token == null) {
                throw new IllegalStateException("Failed to generate unique temporary code token");
            }

            String verifyBase = properties.resolveVerifyBaseUrl(barcodeFormat);
            String payload = "LINK".equals(payloadMode)
                    ? verifyBase + "/v/" + token
                    : token;

            securityHelper.validateFormatAndPayload(barcodeFormat, payload);

            String name = (item.getName() != null && !item.getName().isBlank())
                    ? item.getName().trim()
                    : "Temporary " + (idx + 1);

            TempCodeEntity entity = TempCodeEntity.builder()
                    .id(UUID.randomUUID())
                    .batchId(batchId)
                    .idempotencyKey(idempotencyKey)
                    .ownerTokenHash(ownerTokenHash)
                    .name(name)
                    .token(token)
                    .tokenHash(tokenHash)
                    .payloadMode(payloadMode)
                    .contentType(contentType)
                    .content(contentToStore)
                    .reference(reference)
                    .barcodeFormat(barcodeFormat)
                    .showExpiryOnLabel(Boolean.TRUE.equals(request.getShowExpiryOnLabel()))
                    .createdAt(now)
                    .expiresAt(expiresAt)
                    .status("ACTIVE")
                    .checkCount(0L)
                    .purgeAt(purgeAt)
                    .build();

            entitiesToSave.add(entity);
        }

        List<TempCodeEntity> saved = repository.saveAll(entitiesToSave);
        log.info("[TempCode] Created batch of {} temporary codes with batchId={}, expiresAt={}", saved.size(), batchId, expiresAt);

        List<TempCodeResponse> responses = saved.stream()
                .map(e -> mapToResponse(e, now))
                .collect(Collectors.toList());

        return BatchTempCodeResponse.builder()
                .batchId(batchId)
                .items(responses)
                .totalCount(responses.size())
                .expiresAt(expiresAt)
                .ownerToken(returnedOwnerToken)
                .build();
    }

    /**
     * Updates all temporary codes in a batch (extend, expireNow).
     */
    @Transactional
    public List<TempCodeResponse> updateBatch(UUID batchId, UpdateTempCodeRequest request, String rawOwnerToken) {
        if (rawOwnerToken == null || rawOwnerToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Owner token is required");
        }
        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        List<TempCodeEntity> entities = repository.findByOwnerTokenHashAndBatchId(ownerTokenHash, batchId);
        if (entities.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found or access denied");
        }

        Instant now = clock.instant();
        String action = request.getAction() != null ? request.getAction().trim().toLowerCase(Locale.ROOT) : "";

        if ("extend".equals(action)) {
            Instant newExpiresAt;
            if (request.getNewExpiresAt() != null) {
                newExpiresAt = request.getNewExpiresAt();
            } else if (request.getExtensionSeconds() != null && request.getExtensionSeconds() > 0) {
                Instant baseTime = now;
                for (TempCodeEntity e : entities) {
                    if ("ACTIVE".equals(e.getStatus()) && e.getExpiresAt().isAfter(baseTime)) {
                        baseTime = e.getExpiresAt();
                        break;
                    }
                }
                newExpiresAt = baseTime.plusSeconds(request.getExtensionSeconds());
            } else {
                throw new IllegalArgumentException("Extension duration or until date must be provided");
            }

            Instant maxExpires = now.plus(properties.getMaxExpiryDays(), ChronoUnit.DAYS);
            if (newExpiresAt.isAfter(maxExpires)) {
                throw new IllegalArgumentException("The maximum is 365 days.");
            }
            if (newExpiresAt.isBefore(now.plus(1, ChronoUnit.MINUTES))) {
                throw new IllegalArgumentException("Choose a time at least 1 minute from now.");
            }

            Instant purgeAt = newExpiresAt.plus(properties.getPurgeDays(), ChronoUnit.DAYS);
            for (TempCodeEntity entity : entities) {
                entity.setExpiresAt(newExpiresAt);
                entity.setPurgeAt(purgeAt);
                entity.setStatus("ACTIVE");
            }
            log.info("[TempCode] Extended batchId={} ({} items) to newExpiresAt={}", batchId, entities.size(), newExpiresAt);
        } else if ("expirenow".equals(action) || "expire_now".equals(action)) {
            for (TempCodeEntity entity : entities) {
                entity.setStatus("DEACTIVATED");
            }
            log.info("[TempCode] Deactivated batchId={} ({} items) via expireNow", batchId, entities.size());
        } else {
            throw new IllegalArgumentException("Unsupported batch action: " + request.getAction());
        }

        repository.saveAll(entities);
        return entities.stream().map(e -> mapToResponse(e, now)).collect(Collectors.toList());
    }

    /**
     * Deletes all temporary codes in a batch.
     */
    @Transactional
    public void deleteBatch(UUID batchId, String rawOwnerToken) {
        if (rawOwnerToken == null || rawOwnerToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Owner token is required");
        }
        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        int deleted = repository.deleteByOwnerTokenHashAndBatchId(ownerTokenHash, batchId);
        log.info("[TempCode] Deleted batchId={} ({} items)", batchId, deleted);
    }

    /**
     * Public verification endpoint. Rate limited by client IP.
     * Responses MUST use Cache-Control: no-store.
     * Content and message are NEVER returned after expiry or deactivation.
     */
    @Transactional
    public TempCodeVerifyResponse verifyCode(String token, String clientIp) {
        checkRateLimit("temp_barcode:verify:" + securityHelper.pepperHash(clientIp),
                properties.getRateLimit().getVerifyPerMinute(), 60, "Too many checks. Try again in a minute.");

        if (token == null || token.isBlank()) {
            return TempCodeVerifyResponse.builder().status("NOT_FOUND").build();
        }

        String tokenHash = securityHelper.hashToken(token);
        TempCodeEntity entity = repository.findByTokenHash(tokenHash)
                .filter(e -> e.getDeletedAt() == null)
                .orElse(null);

        if (entity == null) {
            return TempCodeVerifyResponse.builder().status("NOT_FOUND").build();
        }

        Instant now = clock.instant();
        entity.setCheckCount(entity.getCheckCount() + 1);
        entity.setLastCheckedAt(now);
        repository.save(entity);

        // Deactivated by owner
        if ("DEACTIVATED".equalsIgnoreCase(entity.getStatus())) {
            return TempCodeVerifyResponse.builder()
                    .status("DEACTIVATED")
                    .expiresAt(entity.getExpiresAt())
                    .remainingSeconds(0L)
                    .payloadMode(entity.getPayloadMode())
                    .barcodeFormat(entity.getBarcodeFormat())
                    .name(entity.getName())
                    .build();
        }

        // Expired by server clock
        if (now.isAfter(entity.getExpiresAt()) || "EXPIRED".equalsIgnoreCase(entity.getStatus())) {
            return TempCodeVerifyResponse.builder()
                    .status("EXPIRED")
                    .expiresAt(entity.getExpiresAt())
                    .remainingSeconds(0L)
                    .payloadMode(entity.getPayloadMode())
                    .barcodeFormat(entity.getBarcodeFormat())
                    .name(entity.getName())
                    .build();
        }

        // Valid
        long remaining = Math.max(0, Duration.between(now, entity.getExpiresAt()).toSeconds());
        return TempCodeVerifyResponse.builder()
                .status("VALID")
                .expiresAt(entity.getExpiresAt())
                .remainingSeconds(remaining)
                .payloadMode(entity.getPayloadMode())
                .contentType(entity.getContentType())
                .content(entity.getContent())
                .reference(entity.getReference())
                .barcodeFormat(entity.getBarcodeFormat())
                .name(entity.getName())
                .build();
    }

    /**
     * Reports code abuse. Rate-limited to 1 report per client IP per code per day.
     */
    @Transactional
    public void reportCode(String token, ReportTempCodeRequest request, String clientIp) {
        String tokenHash = securityHelper.hashToken(token);
        TempCodeEntity entity = repository.findByTokenHash(tokenHash)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Code not found"));

        String ipHash = securityHelper.pepperHash(clientIp);
        Instant oneDayAgo = clock.instant().minus(1, ChronoUnit.DAYS);

        if (reportRepository.existsByCodeIdAndReporterIpHashSince(entity.getId(), ipHash, oneDayAgo)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    TempCodeMessageCatalog.getFriendlyMessage(TempCodeMessageCatalog.ALREADY_REPORTED));
        }

        TempCodeReportEntity report = TempCodeReportEntity.builder()
                .id(UUID.randomUUID())
                .codeId(entity.getId())
                .reporterIpHash(ipHash)
                .reason(request.getReason() != null ? request.getReason().trim() : "Abuse")
                .comment(request.getComment() != null ? request.getComment().trim() : null)
                .createdAt(clock.instant())
                .build();

        reportRepository.save(report);
        log.warn("[TempCodeReport] Reported temporary code id={}, reason={}", entity.getId(), request.getReason());
    }

    /**
     * Purges expired records after configured retention period.
     */
    @Transactional
    public int purgeExpiredCodes() {
        Instant now = clock.instant();
        int count = repository.purgeExpiredOrDeletedBefore(now);
        log.info("[TempCodePurge] Purged {} expired temporary code records", count);
        return count;
    }

    private TempCodeEntity verifyOwnerAndGet(UUID id, String rawOwnerToken) {
        if (rawOwnerToken == null || rawOwnerToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Owner authorization required");
        }
        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        return repository.findByIdAndOwnerTokenHash(id, ownerTokenHash)
                .filter(e -> e.getDeletedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Code not found or access denied"));
    }

    private TempCodeResponse mapToResponse(TempCodeEntity entity, Instant now) {
        String computedStatus = computeStatus(entity, now);
        long remaining = Math.max(0, Duration.between(now, entity.getExpiresAt()).toSeconds());

        String verifyBase = properties.resolveVerifyBaseUrl(entity.getBarcodeFormat());
        String payload = "LINK".equals(entity.getPayloadMode())
                ? verifyBase + "/v/" + entity.getToken()
                : entity.getToken();

        return TempCodeResponse.builder()
                .id(entity.getId())
                .batchId(entity.getBatchId())
                .name(entity.getName())
                .token(entity.getToken())
                .tokenHash(entity.getTokenHash())
                .verifyUrl(verifyBase + "/v/" + entity.getToken())
                .payload(payload)
                .payloadMode(entity.getPayloadMode())
                .contentType(entity.getContentType())
                .content(entity.getContent())
                .reference(entity.getReference())
                .barcodeFormat(entity.getBarcodeFormat())
                .showExpiryOnLabel(entity.getShowExpiryOnLabel())
                .createdAt(entity.getCreatedAt())
                .expiresAt(entity.getExpiresAt())
                .status(computedStatus)
                .remainingSeconds(remaining)
                .checkCount(entity.getCheckCount())
                .lastCheckedAt(entity.getLastCheckedAt())
                .build();
    }

    public String computeStatus(TempCodeEntity entity, Instant now) {
        if ("DEACTIVATED".equalsIgnoreCase(entity.getStatus())) {
            return "DEACTIVATED";
        }
        if (now.isAfter(entity.getExpiresAt()) || "EXPIRED".equalsIgnoreCase(entity.getStatus())) {
            return "EXPIRED";
        }
        long remaining = Duration.between(now, entity.getExpiresAt()).toSeconds();
        long totalLifetime = Duration.between(entity.getCreatedAt(), entity.getExpiresAt()).toSeconds();
        long tenPercent = totalLifetime > 0 ? (totalLifetime / 10) : 0;

        // "Expiring soon: under 10% of lifetime or 1 hour, config"
        if (remaining <= properties.getExpiringSoonThresholdSeconds() || remaining <= tenPercent) {
            return "EXPIRING_SOON";
        }
        return "ACTIVE";
    }

    private void checkRateLimit(String key, int maxRequests, int windowSeconds, String errorMessage) {
        if (!rateLimitingService.isAllowed(key, maxRequests, windowSeconds)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, errorMessage);
        }
    }

    private void checkRateLimitWithDelta(String key, int delta, int maxRequests, int windowSeconds, String errorMessage) {
        if (!rateLimitingService.isAllowed(key, delta, maxRequests, windowSeconds)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, errorMessage);
        }
    }
}

