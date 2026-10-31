package com.code.acklet.tool.tools.shortener.service;

import com.code.acklet.shared.security.RateLimitingService;
import com.code.acklet.tool.tools.shortener.config.ShortenerProperties;
import com.code.acklet.tool.tools.shortener.dto.*;
import com.code.acklet.tool.tools.shortener.entity.ShortLinkEntity;
import com.code.acklet.tool.tools.shortener.repository.ShortLinkRepository;
import com.code.acklet.tool.tools.shortener.util.ShortenerSecurityHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShortLinkService {

    private final ShortLinkRepository repository;
    private final com.code.acklet.tool.tools.shortener.repository.ShortLinkDailyClickRepository dailyClickRepository;
    private final com.code.acklet.tool.tools.shortener.repository.ShortLinkReportRepository reportRepository;
    private final ShortenerSecurityHelper securityHelper;
    private final ShortenerProperties properties;
    private final RateLimitingService rateLimitingService;

    /**
     * Creates a new short link with server-enforced rules and ownership token.
     */
    @Transactional
    public ShortLinkResponse createLink(CreateShortLinkRequest request, String rawOwnerToken, String clientIp) {
        checkRateLimit("shortener:create:" + securityHelper.pepperHash(clientIp),
                properties.getRateLimit().getCreatePerHour(), 3600, "Link creation limit reached. Please try again later.");

        String cleanTargetUrl = securityHelper.validateAndNormalizeUrl(request.getTargetUrl(), true);
        String cleanFallbackUrl = securityHelper.validateAndNormalizeUrl(request.getFallbackUrl(), false);

        String code;
        if (request.getCustomAlias() != null && !request.getCustomAlias().isBlank()) {
            String alias = request.getCustomAlias().trim();
            securityHelper.validateCustomAlias(alias);
            if (repository.existsByCode(alias)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "That alias is already taken. Try another.");
            }
            code = alias;
        } else {
            code = generateUniqueCode();
        }

        String returnedToken = null;
        String ownerTokenToUse = rawOwnerToken;
        if (ownerTokenToUse == null || ownerTokenToUse.isBlank()) {
            returnedToken = securityHelper.generateOwnerToken();
            ownerTokenToUse = returnedToken;
        }
        String ownerTokenHash = securityHelper.hashOwnerToken(ownerTokenToUse);

        Instant now = Instant.now();
        Instant expiresAt = request.getExpiresAt();
        if (expiresAt == null) {
            expiresAt = now.plus(properties.getDefaultExpiryDays(), ChronoUnit.DAYS);
        } else if (expiresAt.isAfter(now.plus(properties.getMaxExpiryDays(), ChronoUnit.DAYS))) {
            expiresAt = now.plus(properties.getMaxExpiryDays(), ChronoUnit.DAYS);
        }

        boolean hasPassword = request.getPassword() != null && !request.getPassword().isBlank();
        String passwordHash = null;
        String passwordScheme = null;
        if (hasPassword) {
            passwordHash = securityHelper.hashPassword(request.getPassword());
            passwordScheme = "BCRYPT";
        }

        String sanitizedTags = sanitizeTags(request.getTags());
        String utmJson = serializeUtmParams(request.getUtmParams());

        ShortLinkEntity entity = ShortLinkEntity.builder()
                .id(UUID.randomUUID())
                .code(code)
                .targetUrl(cleanTargetUrl)
                .fallbackUrl(cleanFallbackUrl)
                .ownerTokenHash(ownerTokenHash)
                .label(request.getLabel() != null ? request.getLabel().trim() : null)
                .tags(sanitizedTags)
                .utmParams(utmJson)
                .createdAt(now)
                .startDate(request.getStartDate())
                .expiresAt(expiresAt)
                .clicks(0L)
                .maxClicks(request.getMaxClicks() != null && request.getMaxClicks() > 0 ? request.getMaxClicks() : null)
                .isOneTime(Boolean.TRUE.equals(request.getIsOneTime()))
                .isDeactivated(false)
                .hasPassword(hasPassword)
                .passwordHash(passwordHash)
                .passwordScheme(passwordScheme)
                .reportCount(0)
                .flagged(false)
                .build();

        repository.save(entity);
        log.info("[ShortLink] Created link code={} hasPassword={} oneTime={}", code, hasPassword, entity.getIsOneTime());

        return toResponse(entity, returnedToken);
    }

    /**
     * Retrieves link metadata for owner.
     */
    @Transactional(readOnly = true)
    public ShortLinkResponse getLink(String code, String rawOwnerToken) {
        ShortLinkEntity entity = verifyOwnerAndGet(code, rawOwnerToken);
        return toResponse(entity, null);
    }

    /**
     * Updates an existing short link.
     */
    @Transactional
    public ShortLinkResponse updateLink(String code, UpdateShortLinkRequest request, String rawOwnerToken) {
        ShortLinkEntity entity = verifyOwnerAndGet(code, rawOwnerToken);

        if (request.getTargetUrl() != null && !request.getTargetUrl().isBlank()) {
            entity.setTargetUrl(securityHelper.validateAndNormalizeUrl(request.getTargetUrl(), true));
        }

        if (request.getFallbackUrl() != null) {
            entity.setFallbackUrl(securityHelper.validateAndNormalizeUrl(request.getFallbackUrl(), false));
        }

        if (request.getLabel() != null) {
            entity.setLabel(request.getLabel().trim().isEmpty() ? null : request.getLabel().trim());
        }

        if (request.getTags() != null) {
            entity.setTags(sanitizeTags(request.getTags()));
        }

        if (request.getMaxClicks() != null) {
            entity.setMaxClicks(request.getMaxClicks() > 0 ? request.getMaxClicks() : null);
        }

        if (request.getExpiresAt() != null) {
            entity.setExpiresAt(request.getExpiresAt());
        }

        if (request.getStartDate() != null) {
            entity.setStartDate(request.getStartDate());
        }

        if (request.getIsDeactivated() != null) {
            entity.setIsDeactivated(request.getIsDeactivated());
        }

        if (request.getUtmParams() != null) {
            entity.setUtmParams(serializeUtmParams(request.getUtmParams()));
        }

        if (request.getPassword() != null) {
            if ("__REMOVE__".equals(request.getPassword()) || request.getPassword().isBlank()) {
                entity.setHasPassword(false);
                entity.setPasswordHash(null);
                entity.setPasswordScheme(null);
                entity.setPasswordSalt(null);
            } else {
                entity.setHasPassword(true);
                entity.setPasswordHash(securityHelper.hashPassword(request.getPassword()));
                entity.setPasswordScheme("BCRYPT");
                entity.setPasswordSalt(null);
            }
        }

        repository.save(entity);
        log.info("[ShortLink] Updated link code={}", code);
        return toResponse(entity, null);
    }

    /**
     * Soft deletes link.
     */
    @Transactional
    public void deleteLink(String code, String rawOwnerToken) {
        ShortLinkEntity entity = verifyOwnerAndGet(code, rawOwnerToken);
        entity.setDeletedAt(Instant.now());
        repository.save(entity);
        log.info("[ShortLink] Soft-deleted link code={}", code);
    }

    /**
     * Reports link abuse. Rate-limited to 1 report per client IP per link per day.
     */
    @Transactional
    public void reportLink(String code, com.code.acklet.tool.tools.shortener.dto.ReportLinkRequest request, String clientIp) {
        ShortLinkEntity entity = repository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link not found"));

        String ipHash = securityHelper.pepperHash(clientIp);
        Instant oneDayAgo = Instant.now().minus(1, ChronoUnit.DAYS);

        if (reportRepository.existsByLinkIdAndReporterIpHashSince(entity.getId(), ipHash, oneDayAgo)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "You have already submitted a report for this link today.");
        }

        com.code.acklet.tool.tools.shortener.entity.ShortLinkReportEntity report = com.code.acklet.tool.tools.shortener.entity.ShortLinkReportEntity.builder()
                .id(UUID.randomUUID())
                .linkId(entity.getId())
                .reporterIpHash(ipHash)
                .reason(request.getReason())
                .comment(request.getComment() != null ? request.getComment().trim() : null)
                .createdAt(Instant.now())
                .build();
        reportRepository.save(report);

        entity.setReportCount((entity.getReportCount() != null ? entity.getReportCount() : 0) + 1);
        if (entity.getReportCount() >= properties.getValidation().getReportThresholdToFlag()) {
            entity.setFlagged(true);
        }
        repository.save(entity);
        log.warn("[ShortLinkReport] Link code={} reported for reason={}. Total reports={}", code, request.getReason(), entity.getReportCount());
    }

    /**
     * Retrieves aggregated click statistics (last 7d, last 30d, daily sparkline) for the link owner.
     */
    @Transactional(readOnly = true)
    public com.code.acklet.tool.tools.shortener.dto.ShortLinkStatsResponse getLinkStats(String code, String rawOwnerToken) {
        ShortLinkEntity entity = verifyOwnerAndGet(code, rawOwnerToken);
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneOffset.UTC);
        java.time.LocalDate thirtyDaysAgo = today.minusDays(29);
        java.time.LocalDate sevenDaysAgo = today.minusDays(6);
        java.time.LocalDate fourteenDaysAgo = today.minusDays(13);

        List<com.code.acklet.tool.tools.shortener.entity.ShortLinkDailyClickEntity> records =
                dailyClickRepository.findByLinkIdAndClickDateGreaterThanEqualOrderByClickDateAsc(entity.getId(), thirtyDaysAgo);

        java.util.Map<java.time.LocalDate, Long> clicksByDate = records.stream()
                .collect(Collectors.toMap(
                        com.code.acklet.tool.tools.shortener.entity.ShortLinkDailyClickEntity::getClickDate,
                        com.code.acklet.tool.tools.shortener.entity.ShortLinkDailyClickEntity::getClicks,
                        (a, b) -> a
                ));

        long last7DaysClicks = 0;
        long prev7DaysClicks = 0;
        long last30DaysClicks = 0;

        List<com.code.acklet.tool.tools.shortener.dto.ShortLinkStatsResponse.DailyClickData> dailyList = new java.util.ArrayList<>();
        for (int i = 0; i < 30; i++) {
            java.time.LocalDate d = thirtyDaysAgo.plusDays(i);
            long c = clicksByDate.getOrDefault(d, 0L);
            last30DaysClicks += c;
            if (!d.isBefore(sevenDaysAgo)) {
                last7DaysClicks += c;
            } else if (!d.isBefore(fourteenDaysAgo)) {
                prev7DaysClicks += c;
            }
            dailyList.add(new com.code.acklet.tool.tools.shortener.dto.ShortLinkStatsResponse.DailyClickData(d, c));
        }

        Double trendRatio = null;
        if (prev7DaysClicks > 0) {
            trendRatio = (double) last7DaysClicks / prev7DaysClicks;
        } else if (last7DaysClicks > 0) {
            trendRatio = 2.0; // Trending up from zero
        }

        return com.code.acklet.tool.tools.shortener.dto.ShortLinkStatsResponse.builder()
                .code(entity.getCode())
                .totalClicks(entity.getClicks() != null ? entity.getClicks() : 0L)
                .last7DaysClicks(last7DaysClicks)
                .last30DaysClicks(last30DaysClicks)
                .trendRatio(trendRatio)
                .dailyClicks(dailyList)
                .build();
    }

    /**
     * Bulk deactivates links owned by caller.
     */
    @Transactional
    public int bulkDeactivate(List<String> codes, String rawOwnerToken) {
        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        List<ShortLinkEntity> entities = repository.findByCodeIn(codes).stream()
                .filter(e -> MessageDigest.isEqual(e.getOwnerTokenHash().getBytes(StandardCharsets.UTF_8), ownerTokenHash.getBytes(StandardCharsets.UTF_8)))
                .toList();
        for (ShortLinkEntity entity : entities) {
            entity.setIsDeactivated(true);
        }
        repository.saveAll(entities);
        return entities.size();
    }

    /**
     * Bulk reactivates links owned by caller.
     */
    @Transactional
    public int bulkReactivate(List<String> codes, String rawOwnerToken) {
        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        List<ShortLinkEntity> entities = repository.findByCodeIn(codes).stream()
                .filter(e -> MessageDigest.isEqual(e.getOwnerTokenHash().getBytes(StandardCharsets.UTF_8), ownerTokenHash.getBytes(StandardCharsets.UTF_8)))
                .toList();
        for (ShortLinkEntity entity : entities) {
            entity.setIsDeactivated(false);
        }
        repository.saveAll(entities);
        return entities.size();
    }

    /**
     * Bulk soft-deletes links owned by caller.
     */
    @Transactional
    public int bulkDelete(List<String> codes, String rawOwnerToken) {
        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        Instant now = Instant.now();
        List<ShortLinkEntity> entities = repository.findByCodeIn(codes).stream()
                .filter(e -> MessageDigest.isEqual(e.getOwnerTokenHash().getBytes(StandardCharsets.UTF_8), ownerTokenHash.getBytes(StandardCharsets.UTF_8)))
                .toList();
        for (ShortLinkEntity entity : entities) {
            entity.setDeletedAt(now);
            entity.setIsDeactivated(true);
        }
        repository.saveAll(entities);
        return entities.size();
    }

    /**
     * Restores (undeletes) links owned by caller, e.g. when importing a recovery file.
     */
    @Transactional
    public int bulkRestore(List<String> codes, String rawOwnerToken) {
        if (codes == null || codes.isEmpty() || rawOwnerToken == null || rawOwnerToken.isBlank()) {
            return 0;
        }
        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        List<ShortLinkEntity> entities = repository.findByCodeIn(codes).stream()
                .filter(e -> MessageDigest.isEqual(e.getOwnerTokenHash().getBytes(StandardCharsets.UTF_8), ownerTokenHash.getBytes(StandardCharsets.UTF_8)))
                .toList();
        for (ShortLinkEntity entity : entities) {
            entity.setDeletedAt(null);
            // Revert deactivation if link was only deactivated because of deletion
            entity.setIsDeactivated(false);
        }
        repository.saveAll(entities);
        return entities.size();
    }

    /**
     * Deactivates link.
     */
    @Transactional
    public ShortLinkResponse deactivateLink(String code, String rawOwnerToken) {
        ShortLinkEntity entity = verifyOwnerAndGet(code, rawOwnerToken);
        entity.setIsDeactivated(true);
        repository.save(entity);
        return toResponse(entity, null);
    }

    /**
     * Reactivates link.
     */
    @Transactional
    public ShortLinkResponse reactivateLink(String code, String rawOwnerToken) {
        ShortLinkEntity entity = verifyOwnerAndGet(code, rawOwnerToken);
        entity.setIsDeactivated(false);
        repository.save(entity);
        return toResponse(entity, null);
    }

    /**
     * Lists active links for an owner token with search and pagination.
     */
    @Transactional(readOnly = true)
    public ShortLinkListResponse listOwnerLinks(String rawOwnerToken, String search, String status, int page, int size) {
        if (rawOwnerToken == null || rawOwnerToken.isBlank()) {
            return ShortLinkListResponse.builder().items(List.of()).total(0).page(page).size(size).build();
        }

        String ownerTokenHash = securityHelper.hashOwnerToken(rawOwnerToken);
        int effectiveSize = Math.min(Math.max(1, size), 100);
        Pageable pageable = PageRequest.of(Math.max(0, page), effectiveSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ShortLinkEntity> entityPage = repository.findByOwnerTokenHashAndDeletedAtIsNull(ownerTokenHash, pageable);

        String lowerSearch = search != null ? search.trim().toLowerCase(Locale.ROOT) : null;
        String upperStatus = status != null ? status.trim().toUpperCase(Locale.ROOT) : null;

        // In-memory decryption and filtering bounded by the page size cap (max 100 per request)
        List<ShortLinkItemDto> items = entityPage.getContent().stream()
                .map(this::toItemDto)
                .filter(item -> {
                    if (lowerSearch != null && !lowerSearch.isEmpty()) {
                        boolean matchCode = item.getCode().toLowerCase(Locale.ROOT).contains(lowerSearch);
                        boolean matchTarget = item.getTargetUrl() != null && item.getTargetUrl().toLowerCase(Locale.ROOT).contains(lowerSearch);
                        boolean matchLabel = item.getLabel() != null && item.getLabel().toLowerCase(Locale.ROOT).contains(lowerSearch);
                        if (!matchCode && !matchTarget && !matchLabel) return false;
                    }
                    if (upperStatus != null && !upperStatus.isEmpty() && !"ALL".equals(upperStatus)) {
                        return upperStatus.equalsIgnoreCase(item.getStatus());
                    }
                    return true;
                })
                .collect(Collectors.toList());

        return ShortLinkListResponse.builder()
                .items(items)
                .total(entityPage.getTotalElements())
                .page(page)
                .size(size)
                .build();
    }

    /**
     * Checks if a custom alias is available.
     */
    @Transactional(readOnly = true)
    public ShortLinkAvailabilityResponse checkAvailability(String rawCode, String clientIp) {
        checkRateLimit("shortener:avail:" + securityHelper.pepperHash(clientIp),
                properties.getRateLimit().getAvailabilityPerMinute(), 60, "Rate limit reached for availability checks.");

        if (rawCode == null || rawCode.isBlank()) {
            return ShortLinkAvailabilityResponse.builder().code("").available(false).reason("Alias cannot be empty").build();
        }
        String clean = rawCode.trim();
        try {
            securityHelper.validateCustomAlias(clean);
        } catch (IllegalArgumentException e) {
            return ShortLinkAvailabilityResponse.builder().code(clean).available(false).reason(e.getMessage()).build();
        }

        boolean exists = repository.existsByCode(clean);
        return ShortLinkAvailabilityResponse.builder()
                .code(clean)
                .available(!exists)
                .reason(exists ? "Alias is already in use" : "Available")
                .build();
    }

    /**
     * Batch lookup endpoint for hydrating client "My Links".
     */
    @Transactional(readOnly = true)
    public List<ShortLinkItemDto> lookupLinks(ShortLinkLookupRequest request, String clientIp) {
        checkRateLimit("shortener:lookup:" + securityHelper.pepperHash(clientIp),
                properties.getRateLimit().getLookupPerMinute(), 60, "Rate limit reached for link lookup.");

        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            return List.of();
        }

        Map<String, String> tokenMap = request.getItems().stream()
                .filter(i -> i.getCode() != null && i.getOwnerToken() != null)
                .collect(Collectors.toMap(ShortLinkLookupItem::getCode, ShortLinkLookupItem::getOwnerToken, (a, b) -> a));

        if (tokenMap.isEmpty()) return List.of();

        List<ShortLinkEntity> entities = repository.findByCodeIn(tokenMap.keySet());
        List<ShortLinkItemDto> results = new ArrayList<>();

        for (ShortLinkEntity entity : entities) {
            if (entity.getDeletedAt() != null) continue;
            String providedToken = tokenMap.get(entity.getCode());
            boolean isOwner = securityHelper.verifyOwnerToken(providedToken, entity.getOwnerTokenHash());
            if (isOwner) {
                results.add(toItemDto(entity));
            }
        }

        return results;
    }

    /**
     * Idempotent migration of client-side links to server database.
     */
    @Transactional
    public ShortLinkMigrateResponse migrateLinks(ShortLinkMigrateRequest request, String clientIp) {
        checkRateLimit("shortener:migrate:" + securityHelper.pepperHash(clientIp), 30, 3600, "Too many migration requests.");

        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            return ShortLinkMigrateResponse.builder()
                    .migratedCount(0)
                    .codeMapping(Map.of())
                    .migratedLinks(List.of())
                    .build();
        }

        String rawToken = request.getOwnerToken();
        if (rawToken == null || rawToken.isBlank()) {
            rawToken = securityHelper.generateOwnerToken();
        }
        String ownerTokenHash = securityHelper.hashOwnerToken(rawToken);

        Map<String, String> codeMapping = new HashMap<>();
        List<ShortLinkItemDto> migratedList = new ArrayList<>();

        for (ShortLinkMigrateItem item : request.getItems()) {
            if (item.getTargetUrl() == null || item.getTargetUrl().isBlank()) continue;

            String targetCode = item.getCode();
            boolean needNewCode = targetCode == null || targetCode.isBlank()
                    || securityHelper.isReservedSlug(targetCode)
                    || repository.existsByCode(targetCode);

            if (needNewCode) {
                targetCode = generateUniqueCode();
            }
            if (item.getCode() != null) {
                codeMapping.put(item.getCode(), targetCode);
            }

            Instant createdAt = item.getCreatedAt() != null ? Instant.ofEpochMilli(item.getCreatedAt()) : Instant.now();
            Instant expiresAt = item.getExpiresAt() != null ? Instant.ofEpochMilli(item.getExpiresAt()) : null;
            Instant startDate = item.getStartDate() != null ? Instant.ofEpochMilli(item.getStartDate()) : null;

            boolean hasPassword = Boolean.TRUE.equals(item.getHasPassword()) && item.getPasswordHash() != null && !item.getPasswordHash().isBlank();
            String passwordScheme = hasPassword ? "PBKDF2_SHA256" : null;

            ShortLinkEntity entity = ShortLinkEntity.builder()
                    .id(UUID.randomUUID())
                    .code(targetCode)
                    .targetUrl(item.getTargetUrl())
                    .ownerTokenHash(ownerTokenHash)
                    .label(item.getLabel())
                    .createdAt(createdAt)
                    .startDate(startDate)
                    .expiresAt(expiresAt)
                    .clicks(item.getClicks() != null ? item.getClicks() : 0L)
                    .maxClicks(item.getMaxClicks())
                    .isOneTime(Boolean.TRUE.equals(item.getIsOneTime()))
                    .isDeactivated(Boolean.TRUE.equals(item.getIsDeactivated()))
                    .hasPassword(hasPassword)
                    .passwordHash(hasPassword ? item.getPasswordHash() : null)
                    .passwordScheme(passwordScheme)
                    .reportCount(0)
                    .flagged(false)
                    .build();

            repository.save(entity);
            migratedList.add(toItemDto(entity));
        }

        log.info("[ShortLinkMigration] Successfully migrated {} links", migratedList.size());
        return ShortLinkMigrateResponse.builder()
                .migratedCount(migratedList.size())
                .codeMapping(codeMapping)
                .migratedLinks(migratedList)
                .build();
    }

    /**
     * Preview metadata for safe preview page (domain only; never discloses protected links).
     */
    @Transactional(readOnly = true)
    public ShortLinkPreviewResponse getPreview(String code, String clientIp) {
        checkRateLimit("shortener:preview:" + securityHelper.pepperHash(clientIp),
                properties.getRateLimit().getPreviewPerMinute(), 60, "Rate limit reached for previews.");

        ShortLinkEntity entity = repository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link not found"));

        if (entity.getDeletedAt() != null || Boolean.TRUE.equals(entity.getIsDeactivated())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Link is deactivated or removed");
        }

        String domain = null;
        String scheme = null;
        if (!Boolean.TRUE.equals(entity.getHasPassword())) {
            try {
                URI uri = URI.create(entity.getTargetUrl());
                domain = uri.getHost();
                scheme = uri.getScheme();
            } catch (Exception ignored) {}
        }

        return ShortLinkPreviewResponse.builder()
                .code(entity.getCode())
                .domain(domain)
                .scheme(scheme)
                .createdAt(entity.getCreatedAt())
                .status(securityHelper.computeStatus(entity))
                .hasPassword(entity.getHasPassword())
                .build();
    }

    /**
     * Hourly retention cleanup job.
     */
    @Scheduled(fixedDelay = 3600000)
    @Transactional
    public void cleanupRetention() {
        Instant cutoff = Instant.now().minus(properties.getPurgeDays(), ChronoUnit.DAYS);
        log.info("[ShortLinkCleanup] Running retention purge for records older than {} days (cutoff={})", properties.getPurgeDays(), cutoff);

        int deleted = repository.purgeDeletedLinks(cutoff);
        int expired = repository.purgeExpiredLinks(cutoff);
        int limits = repository.purgeLimitReachedLinks(cutoff);

        if (deleted + expired + limits > 0) {
            log.info("[ShortLinkCleanup] Purged: {} deleted, {} expired, {} limit-reached links", deleted, expired, limits);
        }
    }

    private ShortLinkEntity verifyOwnerAndGet(String code, String rawOwnerToken) {
        if (rawOwnerToken == null || rawOwnerToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Owner token is missing in request headers");
        }

        ShortLinkEntity entity = repository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Short link not found: " + code));

        if (!securityHelper.verifyOwnerToken(rawOwnerToken.trim(), entity.getOwnerTokenHash())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid owner token for link: " + code);
        }

        return entity;
    }

    private String generateUniqueCode() {
        for (int i = 0; i < properties.getMaxCollisionRetries(); i++) {
            String candidate = securityHelper.generateRandomSlug(properties.getCodeLength());
            if (!securityHelper.isReservedSlug(candidate) && !repository.existsByCode(candidate)) {
                return candidate;
            }
        }
        return UUID.randomUUID().toString().replace("-", "").substring(0, properties.getCodeLength() + 2);
    }

    private String sanitizeTags(List<String> rawTags) {
        if (rawTags == null || rawTags.isEmpty()) return null;
        return rawTags.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(t -> !t.isEmpty())
                .map(t -> t.toLowerCase(Locale.ROOT))
                .limit(5)
                .map(t -> t.length() > 24 ? t.substring(0, 24) : t)
                .collect(Collectors.joining(","));
    }

    private List<String> parseTags(String tags) {
        if (tags == null || tags.isBlank()) return List.of();
        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(t -> !t.isEmpty())
                .collect(Collectors.toList());
    }

    private ShortLinkResponse toResponse(ShortLinkEntity entity, String ownerToken) {
        String base = properties.getBaseUrl().replaceAll("/+$", "");
        String shortUrl = base + "/" + entity.getCode();
        String previewUrl = shortUrl + "+";

        return ShortLinkResponse.builder()
                .code(entity.getCode())
                .shortUrl(shortUrl)
                .previewUrl(previewUrl)
                .targetUrl(entity.getTargetUrl())
                .fallbackUrl(entity.getFallbackUrl())
                .ownerToken(ownerToken)
                .label(entity.getLabel())
                .tags(parseTags(entity.getTags()))
                .createdAt(entity.getCreatedAt())
                .startDate(entity.getStartDate())
                .expiresAt(entity.getExpiresAt())
                .clicks(entity.getClicks())
                .maxClicks(entity.getMaxClicks())
                .isOneTime(entity.getIsOneTime())
                .isDeactivated(entity.getIsDeactivated())
                .hasPassword(entity.getHasPassword())
                .lastOpenedAt(entity.getLastOpenedAt())
                .status(securityHelper.computeStatus(entity))
                .utmParams(parseUtmParams(entity.getUtmParams()))
                .build();
    }

    private ShortLinkItemDto toItemDto(ShortLinkEntity entity) {
        String base = properties.getBaseUrl().replaceAll("/+$", "");
        String shortUrl = base + "/" + entity.getCode();
        String previewUrl = shortUrl + "+";

        String domain = null;
        try {
            domain = URI.create(entity.getTargetUrl()).getHost();
        } catch (Exception ignored) {}

        return ShortLinkItemDto.builder()
                .code(entity.getCode())
                .shortUrl(shortUrl)
                .previewUrl(previewUrl)
                .targetUrl(entity.getTargetUrl())
                .domain(domain)
                .fallbackUrl(entity.getFallbackUrl())
                .label(entity.getLabel())
                .tags(parseTags(entity.getTags()))
                .createdAt(entity.getCreatedAt())
                .startDate(entity.getStartDate())
                .expiresAt(entity.getExpiresAt())
                .clicks(entity.getClicks())
                .maxClicks(entity.getMaxClicks())
                .isOneTime(entity.getIsOneTime())
                .isDeactivated(entity.getIsDeactivated())
                .hasPassword(entity.getHasPassword())
                .lastOpenedAt(entity.getLastOpenedAt())
                .status(securityHelper.computeStatus(entity))
                .flagged(entity.getFlagged())
                .reportCount(entity.getReportCount())
                .utmParams(parseUtmParams(entity.getUtmParams()))
                .isOwner(true)
                .build();
    }

    private String serializeUtmParams(java.util.Map<String, String> map) {
        if (map == null || map.isEmpty()) return null;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.writeValueAsString(map);
        } catch (Exception e) {
            return null;
        }
    }

    private java.util.Map<String, String> parseUtmParams(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, String>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    private void checkRateLimit(String key, int maxRequests, int windowSeconds, String errorMessage) {
        if (!rateLimitingService.isAllowed(key, maxRequests, windowSeconds)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, errorMessage);
        }
    }
}
