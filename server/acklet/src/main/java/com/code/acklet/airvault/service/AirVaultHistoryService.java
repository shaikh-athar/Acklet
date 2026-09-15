package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultAuditEventDto;
import com.code.acklet.airvault.entity.AirVaultAuditEvent;
import com.code.acklet.airvault.entity.AirVaultIdentity;
import com.code.acklet.airvault.entity.ClipboardFile;
import com.code.acklet.airvault.repository.AirVaultAuditEventRepository;
import com.code.acklet.airvault.repository.AirVaultIdentityRepository;
import com.code.acklet.airvault.repository.ClipboardFileRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultHistoryService {

    private final AirVaultAuditEventRepository auditRepository;
    private final ClipboardFileRepository fileRepository;
    private final AirVaultIdentityRepository identityRepository;
    private final AirVaultRedisTracker redisTracker;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Cache-aside Day-Grouped History lookup for a given type ("audit", "resource", "text").
     * Returns a single day's records.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDayHistory(String type, String clientDeviceId, String username, String dateParam) {
        LocalDate targetDate;
        if ("today".equalsIgnoreCase(dateParam) || dateParam == null || dateParam.isBlank()) {
            targetDate = LocalDate.now(ZoneOffset.UTC);
        } else {
            try {
                targetDate = LocalDate.parse(dateParam);
            } catch (Exception e) {
                targetDate = LocalDate.now(ZoneOffset.UTC);
            }
        }
        String dateStr = targetDate.toString();

        // Resolve actor identity key
        UUID identityId = null;
        String actorUsername = username;
        if (username != null && !username.isBlank()) {
            Optional<AirVaultIdentity> ident = identityRepository.findByUsernameIgnoreCase(username.replace("@", "").trim());
            if (ident.isPresent()) {
                identityId = ident.get().getId();
                actorUsername = ident.get().getUsername();
            }
        }

        String identityKey = identityId != null ? identityId.toString() : (actorUsername != null ? actorUsername : clientDeviceId);
        if (identityKey == null || identityKey.isBlank()) {
            identityKey = "anonymous";
        }

        // 1. Check Redis cache
        String cachedJson = redisTracker.getCachedDayHistory(type, identityKey, dateStr);
        if (cachedJson != null && !cachedJson.isBlank()) {
            try {
                return objectMapper.readValue(cachedJson, new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception e) {
                log.warn("[AirVault History] Failed to parse cached JSON for {}: {}", identityKey, e.getMessage());
            }
        }

        // 2. Cache miss -> query Postgres
        Instant startOfDay = targetDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant endOfDay = targetDate.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        List<Map<String, Object>> results = new ArrayList<>();

        if ("audit".equalsIgnoreCase(type)) {
            List<AirVaultAuditEvent> events = auditRepository.findByActorAndDateRange(
                    identityId, actorUsername, clientDeviceId, startOfDay, endOfDay
            );
            if (events.isEmpty() && identityId == null && (actorUsername == null || actorUsername.isBlank())) {
                // If caller is querying generally for device
                events = auditRepository.findByDateRange(startOfDay, endOfDay);
            }
            for (AirVaultAuditEvent ev : events) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("event_id", ev.getEventId());
                map.put("timestamp_utc", ev.getTimestampUtc());
                map.put("event_type", ev.getEventType());
                map.put("actor_identity_id", ev.getActorIdentityId());
                map.put("actor_username", ev.getActorUsername());
                map.put("device_id", ev.getDeviceId());
                map.put("ip_address", ev.getIpAddress());
                map.put("target_resource_id", ev.getTargetResourceId());
                map.put("result", ev.getResult());
                map.put("before_value", ev.getBeforeValue());
                map.put("after_value", ev.getAfterValue());
                map.put("metadata", ev.getMetadata());
                results.add(map);
            }
        } else if ("resource".equalsIgnoreCase(type)) {
            List<ClipboardFile> files = fileRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startOfDay, endOfDay);
            for (ClipboardFile f : files) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("file_id", f.getFileId());
                map.put("file_name", f.getFileName());
                map.put("category", f.getCategory());
                map.put("byte_size", f.getByteSize());
                map.put("sender_device_id", f.getSenderDeviceId());
                map.put("sender_device_name", f.getSenderDeviceName());
                map.put("preview_url", f.getPreviewUrl());
                map.put("timestamp_utc", f.getCreatedAt());
                results.add(map);
            }
        } else if ("text".equalsIgnoreCase(type)) {
            // Filter audit events where event_type = item_pasted / item_created with text category
            List<AirVaultAuditEvent> textEvents = auditRepository.findByActorAndDateRange(
                    identityId, actorUsername, clientDeviceId, startOfDay, endOfDay
            ).stream().filter(e -> "item_created".equalsIgnoreCase(e.getEventType()) || "item_pasted".equalsIgnoreCase(e.getEventType())).toList();
            for (AirVaultAuditEvent ev : textEvents) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("item_id", ev.getTargetResourceId());
                map.put("snippet", ev.getAfterValue());
                map.put("actor_username", ev.getActorUsername());
                map.put("timestamp_utc", ev.getTimestampUtc());
                map.put("metadata", ev.getMetadata());
                results.add(map);
            }
        }

        // 3. Write to Redis with 1 hour TTL
        try {
            String jsonToCache = objectMapper.writeValueAsString(results);
            redisTracker.setCachedDayHistory(type, identityKey, dateStr, jsonToCache);
        } catch (Exception e) {
            log.warn("[AirVault History] Failed to cache day history in Redis: {}", e.getMessage());
        }

        return results;
    }

    /**
     * Unified Full-Text & Context-Aware Search across text/code clipboard entries and resource file names.
     * Supports word-boundary matching for short terms (<=2 chars) to avoid noisy mid-word hits,
     * and partial-word matching for longer terms (>=3 chars).
     */
    @Transactional(readOnly = true)
    public com.code.acklet.airvault.dto.AirVaultSearchDtos.SearchResponse searchUnifiedHistory(
            String query,
            String clientDeviceId,
            String username,
            Integer windowDays,
            Boolean fullRange) {

        if (query == null || query.trim().isBlank()) {
            return com.code.acklet.airvault.dto.AirVaultSearchDtos.SearchResponse.builder()
                    .query("")
                    .totalMatches(0)
                    .entryCount(0)
                    .windowDays(windowDays != null ? windowDays : 7)
                    .fullRange(Boolean.TRUE.equals(fullRange))
                    .results(new ArrayList<>())
                    .build();
        }

        String rawQuery = query.trim();
        int days = (windowDays != null && windowDays > 0) ? windowDays : 7;
        boolean isFull = Boolean.TRUE.equals(fullRange);
        Instant cutoff = isFull ? null : Instant.now().minus(days, java.time.temporal.ChronoUnit.DAYS);

        // 1. Compile word-aware / context-aware regex pattern
        java.util.regex.Pattern pattern;
        if (rawQuery.length() <= 2) {
            // For 1-2 char queries, require whole word boundary to prevent noisy substring hits (e.g., 'in' inside 'string')
            pattern = java.util.regex.Pattern.compile("(?i)\\b" + java.util.regex.Pattern.quote(rawQuery) + "\\b");
        } else {
            // For >= 3 char queries, match occurrences anywhere within terms/words
            pattern = java.util.regex.Pattern.compile("(?i)" + java.util.regex.Pattern.quote(rawQuery));
        }

        List<com.code.acklet.airvault.dto.AirVaultSearchDtos.MatchEntry> matchEntries = new ArrayList<>();
        int totalMatchesCounter = 0;

        // 2. Search Clipboard Files (file names, categories, device names)
        List<ClipboardFile> files = (cutoff != null)
                ? fileRepository.findByCreatedAtAfterOrderByCreatedAtDesc(cutoff)
                : fileRepository.findAllByOrderByCreatedAtDesc();

        for (ClipboardFile file : files) {
            String fileName = file.getFileName() != null ? file.getFileName() : "";
            String cat = file.getCategory() != null ? file.getCategory() : "";
            String devName = file.getSenderDeviceName() != null ? file.getSenderDeviceName() : "";

            List<com.code.acklet.airvault.dto.AirVaultSearchDtos.SnippetOffset> offsets = new ArrayList<>();
            extractOffsets(fileName, "title", pattern, offsets);
            extractOffsets(cat, "category", pattern, offsets);
            extractOffsets(devName, "actor", pattern, offsets);

            if (!offsets.isEmpty()) {
                totalMatchesCounter += offsets.size();
                String entryType = "FILE";
                if (cat.equalsIgnoreCase("image") || fileName.matches("(?i).*\\.(jpg|jpeg|png|webp|gif|svg)$")) {
                    entryType = "IMAGE";
                } else if (cat.equalsIgnoreCase("archive") || fileName.matches("(?i).*\\.(zip|tar|gz|rar|7z)$")) {
                    entryType = "ARCHIVE";
                }

                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("fileId", file.getFileId());
                meta.put("category", file.getCategory());
                meta.put("senderDeviceId", file.getSenderDeviceId());

                matchEntries.add(com.code.acklet.airvault.dto.AirVaultSearchDtos.MatchEntry.builder()
                        .entryId(file.getFileId())
                        .entryType(entryType)
                        .title(fileName)
                        .snippet(fileName)
                        .category(file.getCategory())
                        .actorUsername(devName)
                        .deviceName(devName)
                        .timestampUtc(file.getCreatedAt())
                        .byteSize(file.getByteSize())
                        .previewUrl(file.getPreviewUrl())
                        .metadata(meta)
                        .offsets(offsets)
                        .matchCount(offsets.size())
                        .build());
            }
        }

        // 3. Search Audit Events / Text Clipboard Items
        List<AirVaultAuditEvent> auditEvents = (cutoff != null)
                ? auditRepository.findByTimestampUtcAfterOrderByTimestampUtcDesc(cutoff)
                : auditRepository.findAllByOrderByTimestampUtcDesc();

        for (AirVaultAuditEvent ev : auditEvents) {
            String text = ev.getAfterValue() != null ? ev.getAfterValue() : (ev.getBeforeValue() != null ? ev.getBeforeValue() : "");
            String actor = ev.getActorUsername() != null ? ev.getActorUsername() : "";
            String resId = ev.getTargetResourceId() != null ? ev.getTargetResourceId() : "";
            String eventType = ev.getEventType() != null ? ev.getEventType() : "";

            List<com.code.acklet.airvault.dto.AirVaultSearchDtos.SnippetOffset> offsets = new ArrayList<>();
            extractOffsets(text, "snippet", pattern, offsets);
            extractOffsets(actor, "actor", pattern, offsets);
            extractOffsets(resId, "resourceId", pattern, offsets);
            extractOffsets(eventType, "eventType", pattern, offsets);

            if (!offsets.isEmpty()) {
                totalMatchesCounter += offsets.size();

                String entryType = "AUDIT";
                if ("item_created".equalsIgnoreCase(eventType) || "item_pasted".equalsIgnoreCase(eventType)) {
                    if (text.startsWith("http://") || text.startsWith("https://")) {
                        entryType = "URL";
                    } else if (text.startsWith("{") && text.endsWith("}")) {
                        entryType = "JSON";
                    } else {
                        entryType = "TEXT";
                    }
                }

                String title = text.isBlank() ? eventType : (text.lines().findFirst().orElse(eventType));
                if (title.length() > 80) {
                    title = title.substring(0, 80) + "…";
                }

                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("eventId", ev.getEventId());
                meta.put("eventType", ev.getEventType());
                meta.put("targetResourceId", ev.getTargetResourceId());
                meta.put("result", ev.getResult());
                meta.put("ipAddress", ev.getIpAddress());

                matchEntries.add(com.code.acklet.airvault.dto.AirVaultSearchDtos.MatchEntry.builder()
                        .entryId(ev.getEventId() != null ? ev.getEventId().toString() : java.util.UUID.randomUUID().toString())
                        .entryType(entryType)
                        .title(title)
                        .snippet(text.length() > 500 ? text.substring(0, 500) + "…" : text)
                        .category(entryType.toLowerCase())
                        .actorUsername(actor)
                        .deviceName(ev.getDeviceId())
                        .timestampUtc(ev.getTimestampUtc())
                        .metadata(meta)
                        .offsets(offsets)
                        .matchCount(offsets.size())
                        .build());
            }
        }

        // Sort by timestamp descending
        matchEntries.sort((a, b) -> {
            if (a.getTimestampUtc() == null && b.getTimestampUtc() == null) return 0;
            if (a.getTimestampUtc() == null) return 1;
            if (b.getTimestampUtc() == null) return -1;
            return b.getTimestampUtc().compareTo(a.getTimestampUtc());
        });

        return com.code.acklet.airvault.dto.AirVaultSearchDtos.SearchResponse.builder()
                .query(rawQuery)
                .totalMatches(totalMatchesCounter)
                .entryCount(matchEntries.size())
                .windowDays(days)
                .fullRange(isFull)
                .results(matchEntries)
                .build();
    }

    private void extractOffsets(String text, String field, java.util.regex.Pattern pattern,
                                List<com.code.acklet.airvault.dto.AirVaultSearchDtos.SnippetOffset> offsets) {
        if (text == null || text.isBlank()) return;
        java.util.regex.Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            offsets.add(com.code.acklet.airvault.dto.AirVaultSearchDtos.SnippetOffset.builder()
                    .start(matcher.start())
                    .end(matcher.end())
                    .matchText(matcher.group())
                    .field(field)
                    .build());
        }
    }
}
