package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultClipboardDtos.*;
import com.code.acklet.airvault.entity.AirVaultClipboardItem;
import com.code.acklet.airvault.entity.AirVaultIdentity;
import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import com.code.acklet.airvault.repository.AirVaultClipboardItemRepository;
import com.code.acklet.airvault.repository.AirVaultIdentityRepository;
import com.code.acklet.airvault.repository.AirVaultSharedClipboardRepository;
import com.code.acklet.airvault.security.AirVaultAuthorizationService;
import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.code.acklet.airvault.security.AirVaultTokenService;
import com.code.acklet.airvault.websocket.AirVaultWebSocketHandler;
import com.code.acklet.airvault.websocket.dto.AirVaultWsMessage;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultSharedClipboardService {

    private final AirVaultSharedClipboardRepository clipboardRepository;
    private final AirVaultClipboardItemRepository itemRepository;
    private final AirVaultIdentityRepository identityRepository;
    private final AirVaultAuthorizationService authorizationService;
    private final AirVaultTokenService tokenService;
    private final AirVaultWebSocketHandler webSocketHandler;
    private final AirVaultSyncRelayService syncRelayService;
    private final ObjectMapper objectMapper;
    private final AirVaultAuditService auditService;
    private final com.code.acklet.airvault.config.AirVaultLimitsProperties limitsProperties;

    private static final String ID_LETTERS = "bcdfghjkmnpqrstvwxyz";
    private static final String ID_DIGITS = "0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateMemorableId() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 3; i++) {
            sb.append(ID_LETTERS.charAt(RANDOM.nextInt(ID_LETTERS.length())));
        }
        for (int i = 0; i < 5; i++) {
            sb.append(ID_DIGITS.charAt(RANDOM.nextInt(ID_DIGITS.length())));
        }
        return sb.toString();
    }

    public static String generateUnguessableId() {
        return generateMemorableId();
    }

    /**
     * Resolves clipboard with server-side authorization check and issues a guest token if anonymous.
     */
    @Transactional(readOnly = true)
    public ClipboardResponseDto getClipboard(String clipboardId, AirVaultPrincipal principal) {
        AirVaultSharedClipboard clipboard = clipboardRepository.findByIdAndDeletedAtIsNull(clipboardId)
                .orElse(null);

        if (clipboard == null) {
            return null;
        }

        boolean isExpired = clipboard.getExpiresAt() != null && clipboard.getExpiresAt().isBefore(Instant.now());
        if (isExpired) {
            return null;
        }

        AirVaultAuthorizationService.AccessLevel accessLevel = authorizationService.checkAccess(principal, clipboardId);
        boolean isOwner = (accessLevel == AirVaultAuthorizationService.AccessLevel.OWNER);
        boolean isCollaborator = !isOwner && principal != null && principal.isUser();
        boolean canEdit = (accessLevel == AirVaultAuthorizationService.AccessLevel.READ_WRITE || isOwner);

        // Fetch relational item rows ordered newest first for response DTO
        List<AirVaultClipboardItem> rowItems = itemRepository.findByClipboardIdAndDeletedAtIsNullOrderBySeqAsc(clipboardId);
        List<Map<String, Object>> items = new ArrayList<>();

        if (!rowItems.isEmpty()) {
            for (int i = rowItems.size() - 1; i >= 0; i--) {
                AirVaultClipboardItem row = rowItems.get(i);
                try {
                    Map<String, Object> map = objectMapper.readValue(row.getPayload(), new TypeReference<>() {});
                    map.put("seq", row.getSeq());
                    map.put("opId", row.getOpId());
                    map.put("itemId", row.getId().toString());
                    items.add(map);
                } catch (Exception e) {
                    Map<String, Object> fallback = new HashMap<>();
                    fallback.put("id", row.getOpId());
                    fallback.put("text", row.getPayload());
                    fallback.put("seq", row.getSeq());
                    items.add(fallback);
                }
            }
        } else if (clipboard.getItemsJson() != null && !clipboard.getItemsJson().isBlank()) {
            try {
                items = objectMapper.readValue(clipboard.getItemsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        // Issue guest token if anonymous or requested
        String guestToken = null;
        if (principal == null || principal.isGuest()) {
            guestToken = tokenService.generateGuestClipboardToken(
                    clipboard.getId(),
                    clipboard.getAccessMode(),
                    principal != null ? principal.getDeviceId() : null
            );
        }

        return ClipboardResponseDto.builder()
                .id(clipboard.getId())
                .ownerUsername(clipboard.getOwnerUsername())
                .ownerDeviceId(clipboard.getOwnerDeviceId())
                .title(clipboard.getTitle())
                .accessMode(clipboard.getAccessMode())
                .items(items)
                .createdAt(clipboard.getCreatedAt())
                .expiresAt(clipboard.getExpiresAt())
                .isExpired(isExpired)
                .isOwner(isOwner)
                .isCollaborator(isCollaborator)
                .collaboratorAccessLevel(accessLevel.name())
                .canEdit(canEdit)
                .guestToken(guestToken)
                .currentSeq(clipboard.getNextSeq() - 1)
                .isPersonal(Boolean.TRUE.equals(clipboard.getIsPersonal()))
                .build();
    }

    /**
     * Creates or updates clipboard state. Reads owner identity strictly from authenticated principal.
     */
    @Transactional
    public ClipboardResponseDto syncClipboard(SyncClipboardRequest req, AirVaultPrincipal principal) {
        if (principal == null || principal.isGuest()) {
            throw new SecurityException("Authenticated user identity required to create or sync clipboard");
        }

        String id = req.getId();
        if (id == null || id.isBlank()) {
            id = generateUnguessableId();
        }

        AirVaultSharedClipboard clipboard = clipboardRepository.findById(id).orElse(null);
        Instant now = Instant.now();
        int retentionDays = req.getRetentionDays() != null && req.getRetentionDays() > 0 ? req.getRetentionDays() : 7;
        Instant expiresAt = now.plus(Duration.ofDays(retentionDays));

        if (clipboard == null) {
            clipboard = AirVaultSharedClipboard.builder()
                    .id(id)
                    .ownerUsername(principal.getUsername())
                    .ownerDeviceId(principal.getDeviceId())
                    .title(req.getTitle() != null && !req.getTitle().isBlank() ? req.getTitle() : "Shared Clipboard")
                    .accessMode(req.getAccessMode() != null ? req.getAccessMode() : "read-only")
                    .nextSeq(1L)
                    .itemsJson("[]")
                    .createdAt(now)
                    .updatedAt(now)
                    .expiresAt(expiresAt)
                    .build();
            clipboard = clipboardRepository.save(clipboard);
        } else {
            // Only owner can update clipboard metadata
            if (!authorizationService.isOwner(principal, id)) {
                throw new SecurityException("Only clipboard owner can update clipboard settings");
            }
            if (req.getTitle() != null && !req.getTitle().isBlank()) {
                clipboard.setTitle(req.getTitle());
            }
            if (req.getAccessMode() != null && !req.getAccessMode().isBlank()) {
                clipboard.setAccessMode(req.getAccessMode());
            }
            clipboard.setUpdatedAt(now);
            clipboard.setExpiresAt(expiresAt);
            clipboard = clipboardRepository.save(clipboard);
        }

        log.info("[AirVault Clipboard] 📋 Saved/Synced clipboard={}, owner={}", id, principal.getUsername());
        return getClipboard(id, principal);
    }

    /**
     * Adds an item to a shared clipboard as a relational row with atomic sequence and opId idempotency.
     */
    @Transactional
    public ClipboardResponseDto addItem(String clipboardId, AddClipboardItemRequest req, AirVaultPrincipal principal) {
        if (principal == null) {
            throw new SecurityException("Authentication token required to add items");
        }

        // Single source of truth authorization check
        if (!authorizationService.canWrite(principal, clipboardId)) {
            throw new SecurityException("Write access denied. Clipboard is read-only or unauthorized.");
        }

        // Lock clipboard row for atomic next_seq assignment
        AirVaultSharedClipboard clipboard = clipboardRepository.findByIdForUpdate(clipboardId)
                .orElseThrow(() -> new IllegalArgumentException("Clipboard not found: " + clipboardId));

        if (clipboard.getExpiresAt() != null && clipboard.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("Clipboard link has expired");
        }

        Map<String, Object> itemMap = req.getItem() != null ? new HashMap<>(req.getItem()) : new HashMap<>();
        String opId = req.getOpId();
        if (opId == null || opId.isBlank()) {
            opId = itemMap.get("id") != null ? itemMap.get("id").toString() : UUID.randomUUID().toString();
        }

        // Idempotency check: if item with (clipboardId, opId) exists, return without duplicate insert
        Optional<AirVaultClipboardItem> existingItemOpt = itemRepository.findByClipboardIdAndOpId(clipboardId, opId);
        if (existingItemOpt.isPresent()) {
            log.info("[AirVault Clipboard] 🔁 Idempotent add: opId={} already exists for clipboard={}. Returning existing.", opId, clipboardId);
            return getClipboard(clipboardId, principal);
        }

        boolean isOwner = authorizationService.isOwner(principal, clipboardId);
        String authorType = isOwner ? "owner" : (principal.isGuest() ? "guest" : "collaborator");
        String authorName = principal.getUsername() != null ? principal.getUsername() : (principal.isGuest() ? "Guest Visitor" : "Collaborator");
        String authorColor = isOwner ? "#2196F3" : (principal.isGuest() ? "#38BDF8" : "#10B981");

        itemMap.put("opId", opId);
        itemMap.put("id", opId);
        itemMap.put("senderDeviceName", authorName);
        itemMap.put("senderDeviceType", authorType);
        itemMap.put("senderDeviceAccent", authorColor);

        // Assign sequence atomically
        long assignedSeq = clipboard.getNextSeq() != null ? clipboard.getNextSeq() : 1L;
        clipboard.setNextSeq(assignedSeq + 1L);
        clipboard.setUpdatedAt(Instant.now());
        clipboardRepository.save(clipboard);

        itemMap.put("seq", assignedSeq);

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(itemMap);
        } catch (Exception e) {
            payloadJson = itemMap.toString();
        }

        String authorId = principal.getUsername() != null ? principal.getUsername() : (principal.getDeviceId() != null ? principal.getDeviceId() : "guest");

        AirVaultClipboardItem newItemRow = AirVaultClipboardItem.builder()
                .clipboardId(clipboardId)
                .seq(assignedSeq)
                .lastChangeSeq(assignedSeq)
                .opId(opId)
                .authorId(authorId)
                .authorType(authorType)
                .authorName(authorName)
                .authorColor(authorColor)
                .payload(payloadJson)
                .createdAt(Instant.now())
                .build();

        itemRepository.save(newItemRow);

        // Emit room-scoped WebSocket event AFTER transaction commits
        final String finalClipboardId = clipboardId;
        final Map<String, Object> finalItemMap = itemMap;
        final Long finalSeq = assignedSeq;

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    emitItemAddedEvent(finalClipboardId, finalItemMap, finalSeq);
                }
            });
        } else {
            emitItemAddedEvent(finalClipboardId, finalItemMap, finalSeq);
        }

        log.info("[AirVault Clipboard] ➕ Added item row: clipboard={}, seq={}, opId={}, author={}",
                clipboardId, assignedSeq, opId, authorName);

        return getClipboard(clipboardId, principal);
    }

    /**
     * Soft-deletes a clipboard item row and notifies room subscribers.
     */
    @Transactional
    public void deleteItem(String clipboardId, UUID itemId, AirVaultPrincipal principal) {
        if (principal == null) {
            throw new SecurityException("Authentication token required to delete items");
        }

        if (!authorizationService.canWrite(principal, clipboardId)) {
            throw new SecurityException("Write access denied. Clipboard is read-only or unauthorized.");
        }

        AirVaultSharedClipboard clipboard = clipboardRepository.findByIdForUpdate(clipboardId)
                .orElseThrow(() -> new IllegalArgumentException("Clipboard not found: " + clipboardId));

        AirVaultClipboardItem item = itemRepository.findByIdAndClipboardIdAndDeletedAtIsNull(itemId, clipboardId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + itemId));

        if (!authorizationService.canDeleteItem(principal, clipboardId, item)) {
            log.warn("[AirVault Authz] 🚫 Delete forbidden: principal={} is not owner and not author of item={} (author={})",
                    principal.getName(), itemId, item.getAuthorId());
            throw new SecurityException("Permission denied. Only clipboard owners and item authors can delete items.");
        }

        long changeSeq = clipboard.getNextSeq() != null ? clipboard.getNextSeq() : 1L;
        clipboard.setNextSeq(changeSeq + 1L);
        clipboard.setUpdatedAt(Instant.now());
        clipboardRepository.save(clipboard);

        item.setLastChangeSeq(changeSeq);
        item.setDeletedAt(Instant.now());
        itemRepository.save(item);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    emitItemDeletedEvent(clipboardId, itemId.toString(), item.getOpId(), changeSeq);
                }
            });
        } else {
            emitItemDeletedEvent(clipboardId, itemId.toString(), item.getOpId(), changeSeq);
        }

        log.info("[AirVault Clipboard] 🗑️ Soft deleted item: clipboard={}, itemId={}, opId={}, changeSeq={}",
                clipboardId, itemId, item.getOpId(), changeSeq);
    }

    /**
     * Incremental sync and change feed query: returns items with lastChangeSeq > sinceSeq up to limit.
     */
    @Transactional(readOnly = true)
    public List<ClipboardItemDto> getItemsSince(String clipboardId, Long sinceSeq, Integer limit, AirVaultPrincipal principal) {
        if (principal == null || !authorizationService.canRead(principal, clipboardId)) {
            throw new SecurityException("Unauthorized to access clipboard items");
        }

        int maxLimit = (limit != null && limit > 0) ? Math.min(limit, 200) : 50;
        PageRequest pageRequest = PageRequest.of(0, maxLimit);

        List<AirVaultClipboardItem> rows;
        if (sinceSeq == null || sinceSeq <= 0) {
            rows = itemRepository.findByClipboardIdAndDeletedAtIsNullOrderBySeqAsc(clipboardId, pageRequest);
        } else {
            rows = itemRepository.findByClipboardIdAndLastChangeSeqGreaterThanOrderByLastChangeSeqAsc(clipboardId, sinceSeq, pageRequest);
        }

        List<ClipboardItemDto> dtos = new ArrayList<>();
        for (AirVaultClipboardItem r : rows) {
            dtos.add(ClipboardItemDto.builder()
                    .id(r.getId())
                    .clipboardId(r.getClipboardId())
                    .seq(r.getSeq())
                    .lastChangeSeq(r.getLastChangeSeq() != null ? r.getLastChangeSeq() : r.getSeq())
                    .opId(r.getOpId())
                    .authorType(r.getAuthorType())
                    .authorName(r.getAuthorName())
                    .authorColor(r.getAuthorColor())
                    .payload(r.getPayload())
                    .retentionSeconds(r.getRetentionSeconds())
                    .burnAfterRead(r.getBurnAfterRead())
                    .createdAt(r.getCreatedAt())
                    .deletedAt(r.getDeletedAt())
                    .build());
        }
        return dtos;
    }

    /**
     * Backward-compatible overload for existing callers.
     */
    @Transactional(readOnly = true)
    public List<ClipboardItemDto> getItemsSince(String clipboardId, Long sinceSeq, AirVaultPrincipal principal) {
        return getItemsSince(clipboardId, sinceSeq, 50, principal);
    }

    /**
     * Retrieves or idempotently provisions the authenticated user's personal clipboard.
     */
    @Transactional
    public ClipboardResponseDto getOrCreatePersonalClipboard(AirVaultPrincipal principal) {
        if (principal == null) {
            throw new SecurityException("Authentication required to access personal clipboard");
        }

        String username = principal.getUsername() != null ? principal.getUsername().trim().toLowerCase().replace("@", "") : "";
        String deviceId = principal.getDeviceId() != null ? principal.getDeviceId().trim() : "";

        if (username.isBlank() && deviceId.isBlank()) {
            throw new SecurityException("Invalid identity credentials for personal clipboard");
        }

        AirVaultIdentity identity = null;
        if (!username.isBlank()) {
            identity = identityRepository.findByUsernameIgnoreCase(username).orElse(null);
        }

        UUID identityId = identity != null ? identity.getId() : null;

        Optional<AirVaultSharedClipboard> existingOpt = Optional.empty();
        if (identityId != null) {
            existingOpt = clipboardRepository.findFirstByOwnerIdentityIdAndIsPersonalTrueAndDeletedAtIsNull(identityId);
        }
        if (existingOpt.isEmpty() && !username.isBlank()) {
            existingOpt = clipboardRepository.findFirstByOwnerUsernameIgnoreCaseAndIsPersonalTrueAndDeletedAtIsNull(username);
        }

        AirVaultSharedClipboard personalBoard;
        if (existingOpt.isPresent()) {
            personalBoard = existingOpt.get();
            if (personalBoard.getOwnerIdentityId() == null && identityId != null) {
                personalBoard.setOwnerIdentityId(identityId);
                personalBoard = clipboardRepository.save(personalBoard);
            }
        } else {
            String boardId = "clip_personal_" + (identityId != null
                    ? identityId.toString().replace("-", "").substring(0, 16)
                    : (!username.isBlank() ? username : deviceId));

            personalBoard = AirVaultSharedClipboard.builder()
                    .id(boardId)
                    .ownerUsername(!username.isBlank() ? username : deviceId)
                    .ownerIdentityId(identityId)
                    .ownerDeviceId(deviceId)
                    .title((!username.isBlank() ? "@" + username : deviceId) + "'s Clipboard")
                    .accessMode("read-write")
                    .isPersonal(true)
                    .nextSeq(1L)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .expiresAt(null)
                    .build();

            personalBoard = clipboardRepository.save(personalBoard);
            log.info("[AirVault Personal] 📋 Provisioned personal clipboard id={} for user=@{}", boardId, username);
        }

        return getClipboard(personalBoard.getId(), principal);
    }

    /**
     * Updates clipboard access mode. Only owner can execute this.
     */
    @Transactional
    public ClipboardResponseDto updateAccessMode(String clipboardId, UpdateAccessModeRequest req, AirVaultPrincipal principal) {
        if (principal == null || !authorizationService.isOwner(principal, clipboardId)) {
            throw new SecurityException("Only clipboard owner can change access mode");
        }

        AirVaultSharedClipboard clipboard = clipboardRepository.findByIdAndDeletedAtIsNull(clipboardId)
                .orElseThrow(() -> new IllegalArgumentException("Clipboard not found: " + clipboardId));

        if (req.getAccessMode() != null && (req.getAccessMode().equalsIgnoreCase("read-only") || req.getAccessMode().equalsIgnoreCase("read-write"))) {
            clipboard.setAccessMode(req.getAccessMode().toLowerCase());
            clipboard.setUpdatedAt(Instant.now());
            clipboardRepository.save(clipboard);
            log.info("[AirVault Clipboard] 🔒 Updated access mode for clipboard={} to {}", clipboardId, req.getAccessMode());
        }

        return getClipboard(clipboardId, principal);
    }

    /**
     * Checks slug availability.
     */
    @Transactional(readOnly = true)
    public SlugAvailabilityResponse checkSlugAvailability(String slug, AirVaultPrincipal principal) {
        if (slug == null || slug.trim().isEmpty()) {
            return SlugAvailabilityResponse.builder()
                    .slug(slug)
                    .available(false)
                    .message("Clipboard ID cannot be empty.")
                    .build();
        }
        String cleanSlug = slug.trim().toLowerCase();
        if (cleanSlug.length() < 3 || cleanSlug.length() > 32) {
            return SlugAvailabilityResponse.builder()
                    .slug(cleanSlug)
                    .available(false)
                    .message("Clipboard ID must be between 3 and 32 characters.")
                    .build();
        }
        if (!cleanSlug.matches("^[a-z0-9_-]+$")) {
            return SlugAvailabilityResponse.builder()
                    .slug(cleanSlug)
                    .available(false)
                    .message("Only letters, numbers, hyphens (-) and underscores (_) are allowed.")
                    .build();
        }

        Set<String> reserved = Set.of(
                "api", "c", "tools", "invite", "admin", "settings", "login",
                "register", "workspace", "dashboard", "app", "explore", "trending",
                "new", "about", "contact", "blog", "auth", "airvault", "datalens", "json-formatter"
        );
        if (reserved.contains(cleanSlug)) {
            return SlugAvailabilityResponse.builder()
                    .slug(cleanSlug)
                    .available(false)
                    .message("'" + cleanSlug + "' is a reserved keyword. Please choose another ID.")
                    .build();
        }

        Optional<AirVaultSharedClipboard> existingOpt = clipboardRepository.findByIdAndDeletedAtIsNull(cleanSlug);
        if (existingOpt.isEmpty()) {
            return SlugAvailabilityResponse.builder()
                    .slug(cleanSlug)
                    .available(true)
                    .message("Available!")
                    .build();
        }

        AirVaultSharedClipboard clip = existingOpt.get();
        boolean isOwner = principal != null && authorizationService.isOwner(principal, cleanSlug);

        if (isOwner) {
            return SlugAvailabilityResponse.builder()
                    .slug(cleanSlug)
                    .available(true)
                    .message("You already own this Clipboard ID.")
                    .build();
        }

        return SlugAvailabilityResponse.builder()
                .slug(cleanSlug)
                .available(false)
                .message("Clipboard ID is already taken. Please choose another.")
                .build();
    }

    /**
     * Renames clipboard slug. Only owner can execute this.
     */
    @Transactional
    public ClipboardResponseDto renameClipboard(RenameClipboardRequest req, AirVaultPrincipal principal) {
        if (principal == null || !authorizationService.isOwner(principal, req.getOldId())) {
            throw new SecurityException("Only clipboard owner can rename clipboard");
        }

        String oldId = req.getOldId() != null ? req.getOldId().trim().toLowerCase() : "";
        String newId = req.getNewId() != null ? req.getNewId().trim().toLowerCase() : "";

        if (oldId.equals(newId)) {
            return getClipboard(oldId, principal);
        }

        SlugAvailabilityResponse avail = checkSlugAvailability(newId, principal);
        if (!avail.isAvailable()) {
            throw new IllegalArgumentException(avail.getMessage());
        }

        AirVaultSharedClipboard oldClip = clipboardRepository.findByIdAndDeletedAtIsNull(oldId)
                .orElseThrow(() -> new IllegalArgumentException("Existing clipboard not found: " + oldId));

        AirVaultSharedClipboard newClip = AirVaultSharedClipboard.builder()
                .id(newId)
                .ownerUsername(oldClip.getOwnerUsername())
                .ownerDeviceId(oldClip.getOwnerDeviceId())
                .title(oldClip.getTitle())
                .accessMode(oldClip.getAccessMode())
                .itemsJson(oldClip.getItemsJson())
                .nextSeq(oldClip.getNextSeq())
                .createdAt(oldClip.getCreatedAt())
                .updatedAt(Instant.now())
                .expiresAt(oldClip.getExpiresAt())
                .build();

        clipboardRepository.save(newClip);

        // Migrate all item rows to new clipboardId
        List<AirVaultClipboardItem> items = itemRepository.findByClipboardIdAndDeletedAtIsNullOrderBySeqAsc(oldId);
        for (AirVaultClipboardItem item : items) {
            item.setClipboardId(newId);
            itemRepository.save(item);
        }

        oldClip.setDeletedAt(Instant.now());
        clipboardRepository.save(oldClip);

        log.info("[AirVault Clipboard] 🏷️ Renamed clipboard from '{}' to '{}'", oldId, newId);
        return getClipboard(newId, principal);
    }

    /**
     * Generates a guest token scoped to a specific clipboard.
     */
    @Transactional(readOnly = true)
    public GuestTokenResponse generateGuestToken(String clipboardId, AirVaultPrincipal principal) {
        AirVaultSharedClipboard clipboard = clipboardRepository.findByIdAndDeletedAtIsNull(clipboardId)
                .orElseThrow(() -> new IllegalArgumentException("Clipboard not found: " + clipboardId));

        String guestToken = tokenService.generateGuestClipboardToken(
                clipboard.getId(),
                clipboard.getAccessMode(),
                principal != null ? principal.getDeviceId() : null
        );

        return GuestTokenResponse.builder()
                .token(guestToken)
                .clipboardId(clipboard.getId())
                .accessMode(clipboard.getAccessMode())
                .expiresInSeconds(7 * 24 * 3600)
                .build();
    }

    private void emitItemAddedEvent(String clipboardId, Map<String, Object> itemMap, Long seq) {
        try {
            String payloadStr = objectMapper.writeValueAsString(Map.of(
                    "clipboardId", clipboardId,
                    "item", itemMap,
                    "seq", seq
            ));

            AirVaultWsMessage wsMsg = AirVaultWsMessage.builder()
                    .type("CLIPBOARD_ITEM_ADDED")
                    .senderDeviceId("server")
                    .clipboardId(clipboardId)
                    .payload(payloadStr)
                    .timestamp(System.currentTimeMillis())
                    .build();

            webSocketHandler.sendToClipboardRoom(clipboardId, wsMsg, null);
        } catch (Exception e) {
            log.warn("[AirVault Clipboard] Failed to emit WebSocket item event: {}", e.getMessage());
        }
    }

    private void emitItemDeletedEvent(String clipboardId, String itemId, String opId, Long seq) {
        try {
            String payloadStr = objectMapper.writeValueAsString(Map.of(
                    "clipboardId", clipboardId,
                    "itemId", itemId,
                    "opId", opId,
                    "seq", seq
            ));

            AirVaultWsMessage wsMsg = AirVaultWsMessage.builder()
                    .type("CLIPBOARD_ITEM_DELETED")
                    .senderDeviceId("server")
                    .clipboardId(clipboardId)
                    .payload(payloadStr)
                    .timestamp(System.currentTimeMillis())
                    .build();

            webSocketHandler.sendToClipboardRoom(clipboardId, wsMsg, null);
        } catch (Exception e) {
            log.warn("[AirVault Clipboard] Failed to emit WebSocket delete event: {}", e.getMessage());
        }
    }

    /**
     * Creates a new standalone clipboard.
     * Enforces a hard limit: one user can create at most 5 clipboards.
     */
    @Transactional
    public ClipboardResponseDto createClipboard(CreateClipboardRequest req, AirVaultPrincipal principal) {
        if (principal == null || principal.isGuest()) {
            throw new SecurityException("Authentication required to create a clipboard");
        }

        String username = principal.getUsername() != null ? principal.getUsername().trim().toLowerCase().replace("@", "") : "";
        String deviceId = principal.getDeviceId() != null ? principal.getDeviceId().trim() : "";

        AirVaultIdentity identity = null;
        if (!username.isBlank()) {
            identity = identityRepository.findByUsernameIgnoreCase(username).orElse(null);
        }
        UUID identityId = identity != null ? identity.getId() : null;

        // 1. Enforce 5 clipboards limit per user
        int maxClipboards = limitsProperties.getMaxClipboardsPerUser();
        long currentCount = identityId != null
                ? clipboardRepository.countByOwnerIdentityIdAndDeletedAtIsNull(identityId)
                : clipboardRepository.countByOwnerUsernameIgnoreCaseAndDeletedAtIsNull(username);

        if (currentCount >= maxClipboards) {
            throw new IllegalStateException("Maximum clipboard limit reached (" + maxClipboards + " clipboards). Please delete an existing clipboard to create a new one.");
        }

        // 2. Validate custom slug or generate unguessable memorable ID
        String id = req.getId() != null ? req.getId().trim().toLowerCase() : null;
        if (id != null && !id.isBlank()) {
            if (id.length() < 3 || id.length() > 32 || !id.matches("^[a-z0-9_-]+$")) {
                throw new IllegalArgumentException("Clipboard ID must be 3-32 alphanumeric characters (hyphens and underscores allowed)");
            }
            if (clipboardRepository.findById(id).isPresent()) {
                throw new IllegalArgumentException("Clipboard ID '" + id + "' is already taken. Please choose another ID.");
            }
        } else {
            id = generateUnguessableId();
            while (clipboardRepository.findById(id).isPresent()) {
                id = generateUnguessableId();
            }
        }

        Instant now = Instant.now();
        int retentionDays = (req.getRetentionDays() != null && req.getRetentionDays() > 0)
                ? req.getRetentionDays()
                : limitsProperties.getDefaultClipboardRetentionDays();
        Instant expiresAt = now.plus(Duration.ofDays(retentionDays));

        String title = (req.getTitle() != null && !req.getTitle().isBlank())
                ? req.getTitle().trim()
                : "Clipboard #" + id;

        String accessMode = (req.getAccessMode() != null && !req.getAccessMode().isBlank())
                ? req.getAccessMode()
                : "read-write";

        AirVaultSharedClipboard clipboard = AirVaultSharedClipboard.builder()
                .id(id)
                .ownerUsername(!username.isBlank() ? username : deviceId)
                .ownerIdentityId(identityId)
                .ownerDeviceId(deviceId)
                .title(title)
                .accessMode(accessMode)
                .isPersonal(false)
                .nextSeq(1L)
                .itemsJson("[]")
                .createdAt(now)
                .updatedAt(now)
                .expiresAt(expiresAt)
                .build();

        clipboard = clipboardRepository.save(clipboard);

        log.info("[AirVault Clipboard] 📋 Created new clipboard id={}, title='{}', owner={}, totalActive={}/{}",
                id, title, username, currentCount + 1, maxClipboards);

        return getClipboard(id, principal);
    }

    /**
     * Lists all non-deleted clipboards created/owned by the authenticated user.
     */
    @Transactional(readOnly = true)
    public MyClipboardsResponseDto listMyClipboards(AirVaultPrincipal principal) {
        if (principal == null || principal.isGuest()) {
            throw new SecurityException("Authentication required to list clipboards");
        }

        String username = principal.getUsername() != null ? principal.getUsername().trim().toLowerCase().replace("@", "") : "";
        AirVaultIdentity identity = !username.isBlank()
                ? identityRepository.findByUsernameIgnoreCase(username).orElse(null)
                : null;
        UUID identityId = identity != null ? identity.getId() : null;

        List<AirVaultSharedClipboard> boards = identityId != null
                ? clipboardRepository.findAllByOwnerIdentityIdAndDeletedAtIsNullOrderByCreatedAtDesc(identityId)
                : clipboardRepository.findAllByOwnerUsernameIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(username);

        List<ClipboardSummaryDto> summaries = new ArrayList<>();
        for (AirVaultSharedClipboard board : boards) {
            int itemCount = (int) itemRepository.countByClipboardIdAndDeletedAtIsNull(board.getId());
            summaries.add(ClipboardSummaryDto.builder()
                    .id(board.getId())
                    .title(board.getTitle())
                    .ownerUsername(board.getOwnerUsername())
                    .accessMode(board.getAccessMode())
                    .isPersonal(Boolean.TRUE.equals(board.getIsPersonal()))
                    .isOwner(true)
                    .itemCount(itemCount)
                    .totalBytes(0L)
                    .createdAt(board.getCreatedAt())
                    .expiresAt(board.getExpiresAt())
                    .build());
        }

        return MyClipboardsResponseDto.builder()
                .clipboards(summaries)
                .count(summaries.size())
                .maxLimit(limitsProperties.getMaxClipboardsPerUser())
                .maxClipboardBytes(limitsProperties.getMaxClipboardBytes())
                .build();
    }

    /**
     * Deletes (soft-deletes) a custom-created clipboard.
     * Personal primary clipboard cannot be deleted.
     */
    @Transactional
    public void deleteClipboard(String clipboardId, AirVaultPrincipal principal) {
        if (principal == null || principal.isGuest()) {
            throw new SecurityException("Authentication required to delete clipboard");
        }

        AirVaultSharedClipboard clipboard = clipboardRepository.findByIdAndDeletedAtIsNull(clipboardId)
                .orElseThrow(() -> new IllegalArgumentException("Clipboard not found: " + clipboardId));

        if (!authorizationService.isOwner(principal, clipboardId)) {
            throw new SecurityException("Only clipboard owner can delete this clipboard");
        }

        if (Boolean.TRUE.equals(clipboard.getIsPersonal())) {
            throw new IllegalStateException("Personal primary clipboard cannot be deleted");
        }

        clipboard.setDeletedAt(Instant.now());
        clipboardRepository.save(clipboard);

        log.info("[AirVault Clipboard] 🗑️ Deleted clipboard id={}, owner={}", clipboardId, principal.getUsername());
    }
}
