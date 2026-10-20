package com.code.acklet.tool.tools.clipboard.service;

import com.code.acklet.tool.tools.clipboard.dto.*;
import com.code.acklet.tool.tools.clipboard.entity.ClipboardItemEntity;
import com.code.acklet.tool.tools.clipboard.entity.ClipboardShareEntity;
import com.code.acklet.tool.tools.clipboard.entity.ClipboardUploadSessionEntity;
import com.code.acklet.tool.tools.clipboard.repository.ClipboardItemRepository;
import com.code.acklet.tool.tools.clipboard.repository.ClipboardShareRepository;
import com.code.acklet.tool.tools.clipboard.repository.ClipboardUploadSessionRepository;
import com.code.acklet.tool.tools.clipboard.storage.ClipboardFileStorageService;
import com.code.acklet.tool.tools.clipboard.storage.ClipboardStorageProperties;
import com.code.acklet.tool.tools.clipboard.util.ClipboardSecurityUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.code.acklet.shared.exception.ConflictException;
import com.code.acklet.tool.tools.clipboard.entity.ClipboardTextRevisionEntity;
import com.code.acklet.tool.tools.clipboard.repository.ClipboardTextRevisionRepository;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.io.InputStream;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClipboardService {

    private static final String CODE_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ClipboardShareRepository shareRepository;
    private final ClipboardItemRepository itemRepository;
    private final ClipboardUploadSessionRepository sessionRepository;
    private final ClipboardTextRevisionRepository revisionRepository;
    private final ClipboardFileStorageService storageService;
    private final ClipboardStorageProperties properties;
    private final ObjectMapper objectMapper;

    private final Map<String, List<SseEmitter>> sseEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribeEvents(String code) {
        String clean = code.trim().toLowerCase();
        SseEmitter emitter = new SseEmitter(180_000L); // 3 minutes timeout
        sseEmitters.computeIfAbsent(clean, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(clean, emitter));
        emitter.onTimeout(() -> removeEmitter(clean, emitter));
        emitter.onError(e -> removeEmitter(clean, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("{\"shareCode\":\"" + clean + "\"}"));
        } catch (Exception e) {
            removeEmitter(clean, emitter);
        }

        return emitter;
    }

    private void removeEmitter(String code, SseEmitter emitter) {
        List<SseEmitter> list = sseEmitters.get(code);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                sseEmitters.remove(code);
            }
        }
    }

    public void broadcastEvent(String code, String eventType, Object data) {
        String clean = code.trim().toLowerCase();
        List<SseEmitter> list = sseEmitters.get(clean);
        if (list == null || list.isEmpty()) return;

        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(eventType).data(data));
            } catch (Exception e) {
                removeEmitter(clean, emitter);
            }
        }
    }

    private final Map<String, byte[]> fileByteStore = new ConcurrentHashMap<>();

    public ClipboardConfigDto getConfig() {
        return ClipboardConfigDto.builder()
                .codeLength(5)
                .maxCodeLength(8)
                .maxFileSizeBytes(properties.getMaxFileSizeBytes())
                .maxTextSizeBytes(50L * 1024 * 1024)
                .maxItemsPerType(100)
                .maxTotalShareSizeBytes(properties.getMaxTotalShareSizeBytes())
                .retentionDays(properties.getRetentionDays())
                .chunkSize((long) properties.getChunkSize())
                .build();
    }

    @Transactional
    public ClipboardShareDto createShare(CreateShareRequest request) {
        String code;
        if (request != null && request.getRequestedCode() != null && !request.getRequestedCode().isBlank()) {
            code = request.getRequestedCode().trim().toLowerCase();
            if (!code.matches("^[a-z0-9_-]{3,16}$")) {
                throw new IllegalArgumentException("Clipboard ID must be 3-16 letters, numbers, or dashes");
            }
            Optional<ClipboardShareEntity> existingOpt = shareRepository.findById(code);
            if (existingOpt.isPresent()) {
                ClipboardShareEntity existing = existingOpt.get();
                if (existing.getExpiresAt().isAfter(Instant.now())) {
                    throw new IllegalStateException("Clipboard ID \"" + code + "\" is already taken");
                } else {
                    itemRepository.deleteByShare_Code(code);
                    sessionRepository.deleteByShare_Code(code);
                    shareRepository.delete(existing);
                }
            }
        } else {
            code = generateUniqueCode();
        }

        int expiryHours = (request != null && request.getExpiryHours() != null) ? request.getExpiryHours() : (properties.getRetentionDays() * 24);
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expiryHours, ChronoUnit.HOURS);

        ClipboardShareEntity entity = ClipboardShareEntity.builder()
                .code(code)
                .wordCode(code + "-clip")
                .ownerToken("tok_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12))
                .createdAt(now)
                .updatedAt(now)
                .expiresAt(expiresAt)
                .burnAfterReading(request != null && Boolean.TRUE.equals(request.getBurnAfterReading()))
                .liveMode(request == null || !Boolean.FALSE.equals(request.getLiveMode()))
                .hasPin(request != null && request.getPin() != null && !request.getPin().isBlank())
                .pinHash((request != null && request.getPin() != null && !request.getPin().isBlank()) ? request.getPin() : null)
                .items(new ArrayList<>())
                .build();

        shareRepository.save(entity);
        return mapToShareDto(entity, Collections.emptyList());
    }

    @Transactional
    public ClipboardShareDto renameShare(String currentCode, String newCode, String ownerToken) {
        String oldClean = currentCode.trim().toLowerCase();
        String newClean = newCode.trim().toLowerCase();

        if (oldClean.equals(newClean)) {
            return getShare(oldClean, null).orElseThrow();
        }

        if (!newClean.matches("^[a-z0-9_-]{3,16}$")) {
            throw new IllegalArgumentException("Clipboard ID must be 3-16 letters, numbers, or dashes");
        }

        // Check if new ID is already taken
        Optional<ClipboardShareEntity> targetOpt = shareRepository.findById(newClean);
        if (targetOpt.isPresent()) {
            ClipboardShareEntity target = targetOpt.get();
            if (target.getExpiresAt().isAfter(Instant.now())) {
                throw new IllegalStateException("Clipboard ID \"" + newClean + "\" is already taken");
            } else {
                itemRepository.deleteByShare_Code(newClean);
                sessionRepository.deleteByShare_Code(newClean);
                shareRepository.delete(target);
            }
        }

        ClipboardShareEntity oldShare = shareRepository.findById(oldClean)
                .orElseThrow(() -> new IllegalArgumentException("Clipboard not found"));

        if (oldShare.getOwnerToken() != null && ownerToken != null && !oldShare.getOwnerToken().equals(ownerToken)) {
            throw new SecurityException("Unauthorized to rename this clipboard");
        }

        Instant now = Instant.now();
        // Create new share copying ALL settings exactly ("ditto copy with as well settings")
        ClipboardShareEntity newShare = ClipboardShareEntity.builder()
                .code(newClean)
                .wordCode(newClean + "-clip")
                .ownerToken(oldShare.getOwnerToken())
                .pinHash(oldShare.getPinHash())
                .hasPin(oldShare.getHasPin())
                .burnAfterReading(oldShare.getBurnAfterReading())
                .liveMode(oldShare.getLiveMode())
                .expiresAt(oldShare.getExpiresAt())
                .createdAt(oldShare.getCreatedAt())
                .updatedAt(now)
                .items(new ArrayList<>())
                .build();
        newShare = shareRepository.save(newShare);

        // Move all items (files, images, text) to new share
        List<ClipboardItemEntity> items = itemRepository.findByShare_CodeOrderByCreatedAtDesc(oldClean);
        for (ClipboardItemEntity item : items) {
            item.setShare(newShare);
            itemRepository.save(item);
        }

        // Move all upload sessions to new share
        List<ClipboardUploadSessionEntity> sessions = sessionRepository.findByShare_Code(oldClean);
        for (ClipboardUploadSessionEntity session : sessions) {
            session.setShare(newShare);
            sessionRepository.save(session);
        }

        // Leave redirect item in old share so other open tabs/devices follow
        String redirectJson = "{\"__acklet_redirect__\":\"" + newClean + "\"}";
        ClipboardItemEntity redirectItem = ClipboardItemEntity.builder()
                .id("redir_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10))
                .share(oldShare)
                .itemType("TEXT")
                .textContent(redirectJson)
                .sizeBytes((long) redirectJson.length())
                .detectedMime("text/plain")
                .createdAt(now)
                .expiresAt(oldShare.getExpiresAt())
                .isEncrypted(false)
                .build();
        itemRepository.save(redirectItem);

        List<ClipboardItemEntity> newItems = itemRepository.findByShare_CodeOrderByCreatedAtDesc(newClean);
        return mapToShareDto(newShare, newItems);
    }

    public boolean isCodeAvailable(String code) {
        String clean = code.trim().toLowerCase();
        Optional<ClipboardShareEntity> existing = shareRepository.findById(clean);
        if (existing.isEmpty()) {
            return true;
        }
        return existing.get().getExpiresAt().isBefore(Instant.now());
    }

    @Transactional
    public Optional<ClipboardShareDto> getShare(String code, String pin) {
        String clean = code.trim().toLowerCase();
        Optional<ClipboardShareEntity> shareOpt = shareRepository.findById(clean);

        ClipboardShareEntity share;
        if (shareOpt.isEmpty()) {
            // Auto-provision room on first access
            share = autoProvisionShare(clean);
        } else {
            share = shareOpt.get();
            // Check expiry
            if (share.getExpiresAt().isBefore(Instant.now())) {
                shareRepository.delete(share);
                share = autoProvisionShare(clean);
            }
        }

        List<ClipboardItemEntity> items = itemRepository.findByShare_CodeOrderByCreatedAtDesc(clean);
        return Optional.of(mapToShareDto(share, items));
    }

    @Transactional
    public ClipboardItemDto addTextItem(String code, String text, String ownerToken, boolean isEncrypted) {
        return addTextItem(code, text, null, ownerToken, isEncrypted);
    }

    @Transactional
    public ClipboardItemDto addTextItem(String code, String text, Long expectedVersion, String ownerToken, boolean isEncrypted) {
        String clean = code.trim().toLowerCase();
        ClipboardShareEntity share = getOrAutoProvision(clean);

        if (share.getOwnerToken() != null && ownerToken != null && !share.getOwnerToken().equals(ownerToken)) {
            throw new SecurityException("Unauthorized to modify this clipboard");
        }

        // Optimistic concurrency / conflict detection
        if (expectedVersion != null && share.getVersion() != null && !expectedVersion.equals(share.getVersion())) {
            throw new ConflictException("Conflict: Clipboard was modified by another session (expected version " + expectedVersion + ", current version " + share.getVersion() + ")");
        }

        // Archive previous text item into revision history
        List<ClipboardItemEntity> existingTexts = itemRepository.findByShare_CodeOrderByCreatedAtDesc(clean).stream()
                .filter(i -> "TEXT".equalsIgnoreCase(i.getItemType()))
                .toList();
        if (!existingTexts.isEmpty()) {
            ClipboardItemEntity oldText = existingTexts.get(0);
            if (oldText.getTextContent() != null && !oldText.getTextContent().isBlank() && !oldText.getTextContent().contains("__acklet_redirect__")) {
                ClipboardTextRevisionEntity revision = ClipboardTextRevisionEntity.builder()
                        .id("rev_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10))
                        .share(share)
                        .version(share.getVersion() != null ? share.getVersion() : 1L)
                        .textContent(oldText.getTextContent())
                        .isEncrypted(Boolean.TRUE.equals(oldText.getIsEncrypted()))
                        .createdAt(oldText.getCreatedAt() != null ? oldText.getCreatedAt() : Instant.now())
                        .build();
                revisionRepository.save(revision);
            }
        }

        // Replace previous text items
        itemRepository.deleteTextItemsByShareCode(clean);

        long sizeBytes = text != null ? text.getBytes().length : 0;
        String itemId = "item_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Instant now = Instant.now();

        ClipboardItemEntity item = ClipboardItemEntity.builder()
                .id(itemId)
                .share(share)
                .itemType("TEXT")
                .textContent(text != null ? text : "")
                .sizeBytes(sizeBytes)
                .detectedMime("text/plain")
                .createdAt(now)
                .expiresAt(share.getExpiresAt())
                .downloadCount(0)
                .viewCount(1)
                .isEncrypted(isEncrypted)
                .isCompressed(false)
                .build();

        itemRepository.save(item);

        long nextVersion = (share.getVersion() != null ? share.getVersion() : 1L) + 1;
        share.setVersion(nextVersion);
        share.setUpdatedAt(now);
        shareRepository.save(share);

        Map<String, Object> eventData = new HashMap<>();
        eventData.put("eventType", "ITEM_ADDED");
        eventData.put("shareCode", clean);
        eventData.put("version", nextVersion);
        eventData.put("item", mapToItemDto(item));
        broadcastEvent(clean, "ITEM_ADDED", eventData);

        return mapToItemDto(item);
    }

    public List<ClipboardTextRevisionDto> getTextRevisions(String code) {
        String clean = code.trim().toLowerCase();
        List<ClipboardTextRevisionDto> result = new ArrayList<>();

        // 1. Current active text item
        Optional<ClipboardShareEntity> shareOpt = shareRepository.findById(clean);
        if (shareOpt.isPresent()) {
            ClipboardShareEntity share = shareOpt.get();
            List<ClipboardItemEntity> currentTexts = itemRepository.findByShare_CodeOrderByCreatedAtDesc(clean).stream()
                    .filter(i -> "TEXT".equalsIgnoreCase(i.getItemType()))
                    .toList();
            if (!currentTexts.isEmpty()) {
                ClipboardItemEntity current = currentTexts.get(0);
                if (current.getTextContent() != null && !current.getTextContent().isBlank() && !current.getTextContent().contains("__acklet_redirect__")) {
                    result.add(ClipboardTextRevisionDto.builder()
                            .id(current.getId())
                            .shareCode(clean)
                            .version(share.getVersion() != null ? share.getVersion() : 1L)
                            .textContent(current.getTextContent())
                            .isEncrypted(Boolean.TRUE.equals(current.getIsEncrypted()))
                            .createdAt(current.getCreatedAt() != null ? current.getCreatedAt().toString() : Instant.now().toString())
                            .isCurrent(true)
                            .build());
                }
            }
        }

        // 2. Archived historical revisions
        List<ClipboardTextRevisionEntity> past = revisionRepository.findByShare_CodeOrderByVersionDesc(clean);
        for (ClipboardTextRevisionEntity r : past) {
            result.add(ClipboardTextRevisionDto.builder()
                    .id(r.getId())
                    .shareCode(clean)
                    .version(r.getVersion())
                    .textContent(r.getTextContent())
                    .isEncrypted(r.getIsEncrypted())
                    .createdAt(r.getCreatedAt().toString())
                    .isCurrent(false)
                    .build());
        }
        return result;
    }

    @Transactional
    public ClipboardItemDto restoreTextRevision(String code, String revisionId, String ownerToken) {
        String clean = code.trim().toLowerCase();
        ClipboardShareEntity share = shareRepository.findById(clean)
                .orElseThrow(() -> new IllegalArgumentException("Clipboard not found: " + clean));

        if (share.getOwnerToken() != null && ownerToken != null && !share.getOwnerToken().equals(ownerToken)) {
            throw new SecurityException("Unauthorized to restore revision on this clipboard");
        }

        ClipboardTextRevisionEntity revision = revisionRepository.findById(revisionId)
                .orElseThrow(() -> new IllegalArgumentException("Revision not found: " + revisionId));

        if (!revision.getShare().getCode().equalsIgnoreCase(clean)) {
            throw new SecurityException("Revision does not belong to clipboard " + clean);
        }

        return addTextItem(clean, revision.getTextContent(), null, ownerToken, Boolean.TRUE.equals(revision.getIsEncrypted()));
    }

    @Transactional
    public boolean deleteItem(String code, String itemId, String ownerToken) {
        String clean = code.trim().toLowerCase();
        Optional<ClipboardItemEntity> itemOpt = itemRepository.findByIdAndShare_Code(itemId, clean);
        if (itemOpt.isEmpty()) {
            return false;
        }

        ClipboardItemEntity item = itemOpt.get();
        String storagePath = item.getStoragePath();

        itemRepository.delete(item);

        // If it was a stored file, check if orphaned
        if (storagePath != null && !storagePath.isBlank()) {
            List<ClipboardItemEntity> referencing = itemRepository.findByContentHash(item.getContentHash());
            if (referencing.isEmpty()) {
                storageService.deleteBlobIfOrphaned(storagePath);
            }
        }

        return true;
    }

    @Transactional
    public ClipboardItemDto addFileItem(String code, String filename, byte[] content, String mimeType, boolean isImage, boolean isEncrypted, String contentHash) throws IOException {
        String clean = code.trim().toLowerCase();
        ClipboardShareEntity share = getOrAutoProvision(clean);

        String sanitizedName = ClipboardSecurityUtil.sanitizeFilename(filename);
        if (ClipboardSecurityUtil.isDangerousExtension(sanitizedName)) {
            throw new IllegalArgumentException("Uploading executable or hazardous files is prohibited for security reasons");
        }

        long size = content != null ? content.length : 0;
        if (size > properties.getMaxFileSizeBytes()) {
            throw new IllegalArgumentException("File size exceeds maximum permitted limit (" + (properties.getMaxFileSizeBytes() / (1024 * 1024)) + " MB)");
        }

        // Store file with safe compression and deduplication
        ClipboardFileStorageService.StorageResult storageResult = storageService.storeDirectFile(
                sanitizedName, content != null ? content : new byte[0], mimeType, isImage, contentHash
        );

        String itemId = "file_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Instant now = Instant.now();

        // Deduplicate in this share: remove existing item matching hash or name+size
        List<ClipboardItemEntity> existingItems = itemRepository.findByShare_CodeOrderByCreatedAtDesc(clean);
        for (ClipboardItemEntity existing : existingItems) {
            boolean match = (storageResult.getContentHash().equals(existing.getContentHash()))
                    || (sanitizedName.equals(existing.getOriginalName()) && size == existing.getSizeBytes());
            if (match) {
                itemRepository.delete(existing);
            }
        }

        ClipboardItemEntity item = ClipboardItemEntity.builder()
                .id(itemId)
                .share(share)
                .itemType(isImage ? "IMAGE" : "FILE")
                .originalName(sanitizedName)
                .sizeBytes(storageResult.getOriginalSizeBytes())
                .detectedMime(mimeType != null && !mimeType.isBlank() ? mimeType : (isImage ? "image/png" : "application/octet-stream"))
                .storagePath(storageResult.getStoragePath())
                .contentHash(storageResult.getContentHash())
                .isCompressed(storageResult.isCompressed())
                .isEncrypted(isEncrypted)
                .createdAt(now)
                .expiresAt(share.getExpiresAt())
                .downloadCount(0)
                .viewCount(0)
                .build();

        itemRepository.save(item);
        share.setUpdatedAt(now);
        shareRepository.save(share);

        return mapToItemDto(item);
    }

    @Transactional
    public UploadSessionResponse initChunkedUpload(String code, UploadSessionInitRequest request, String ownerToken) {
        String clean = code.trim().toLowerCase();
        ClipboardShareEntity share = getOrAutoProvision(clean);

        if (request.getTotalSize() > properties.getMaxFileSizeBytes()) {
            throw new IllegalArgumentException("File size exceeds maximum limit of " + (properties.getMaxFileSizeBytes() / (1024 * 1024)) + " MB");
        }

        String sanitizedName = ClipboardSecurityUtil.sanitizeFilename(request.getFileName());
        if (ClipboardSecurityUtil.isDangerousExtension(sanitizedName)) {
            throw new IllegalArgumentException("Uploading executable or hazardous files is prohibited for security reasons");
        }

        int chunkSize = request.getChunkSize() > 0 ? request.getChunkSize() : properties.getChunkSize();
        int totalChunks = request.getTotalChunks() > 0 ? request.getTotalChunks() : (int) Math.ceil((double) request.getTotalSize() / chunkSize);

        Instant now = Instant.now();
        Instant sessionExpires = now.plus(properties.getUploadSessionExpiryHours(), ChronoUnit.HOURS);

        // Check if an active resumable session already exists for this (shareCode, fileHash, totalSize)
        if (request.getFileHash() != null && !request.getFileHash().isBlank()) {
            List<ClipboardUploadSessionEntity> existingSessions = sessionRepository.findActiveResumableSessions(
                    clean, request.getFileHash().toLowerCase(), request.getTotalSize(), now
            );

            if (!existingSessions.isEmpty()) {
                ClipboardUploadSessionEntity existing = existingSessions.get(0);
                List<Integer> verifiedChunks = parseUploadedChunks(existing.getUploadedChunks());
                log.info("[ClipboardService] Resuming upload session {} with {}/{} verified chunks",
                        existing.getId(), verifiedChunks.size(), existing.getTotalChunks());

                return UploadSessionResponse.builder()
                        .uploadId(existing.getId())
                        .shareCode(clean)
                        .fileName(existing.getFileName())
                        .totalSize(existing.getTotalSize())
                        .chunkSize(existing.getChunkSize())
                        .totalChunks(existing.getTotalChunks())
                        .uploadedChunks(verifiedChunks)
                        .isComplete(verifiedChunks.size() >= existing.getTotalChunks())
                        .expiresAt(existing.getExpiresAt().toString())
                        .build();
            }
        }

        String uploadId = "upsess_" + UUID.randomUUID().toString().replace("-", "");
        ClipboardUploadSessionEntity session = ClipboardUploadSessionEntity.builder()
                .id(uploadId)
                .share(share)
                .fileName(sanitizedName)
                .totalSize(request.getTotalSize())
                .chunkSize(chunkSize)
                .totalChunks(totalChunks)
                .uploadedChunks("[]")
                .fileHash(request.getFileHash() != null ? request.getFileHash().toLowerCase() : null)
                .isImage(Boolean.TRUE.equals(request.getIsImage()))
                .isEncrypted(Boolean.TRUE.equals(request.getIsEncrypted()))
                .status("IN_PROGRESS")
                .createdAt(now)
                .updatedAt(now)
                .expiresAt(sessionExpires)
                .build();

        sessionRepository.save(session);

        return UploadSessionResponse.builder()
                .uploadId(uploadId)
                .shareCode(clean)
                .fileName(sanitizedName)
                .totalSize(request.getTotalSize())
                .chunkSize(chunkSize)
                .totalChunks(totalChunks)
                .uploadedChunks(Collections.emptyList())
                .isComplete(false)
                .expiresAt(sessionExpires.toString())
                .build();
    }

    @Transactional
    public UploadChunkResponse uploadChunk(String code, String uploadId, int chunkNumber, byte[] chunkBytes) throws IOException {
        String clean = code.trim().toLowerCase();
        Optional<ClipboardUploadSessionEntity> sessionOpt = sessionRepository.findByIdAndShare_Code(uploadId, clean);
        if (sessionOpt.isEmpty()) {
            throw new IllegalArgumentException("Upload session not found or invalid room");
        }

        ClipboardUploadSessionEntity session = sessionOpt.get();
        if (!"IN_PROGRESS".equalsIgnoreCase(session.getStatus())) {
            throw new IllegalStateException("Upload session is no longer active");
        }

        if (session.getExpiresAt().isBefore(Instant.now())) {
            session.setStatus("EXPIRED");
            sessionRepository.save(session);
            throw new IllegalStateException("Upload session has expired");
        }

        if (chunkNumber < 0 || chunkNumber >= session.getTotalChunks()) {
            throw new IllegalArgumentException("Chunk number out of bounds: " + chunkNumber + " (total " + session.getTotalChunks() + ")");
        }

        // Store chunk part on filesystem
        storageService.storeChunk(uploadId, chunkNumber, chunkBytes);

        // Update verified chunks set
        Set<Integer> verified = new TreeSet<>(parseUploadedChunks(session.getUploadedChunks()));
        verified.add(chunkNumber);

        session.setUploadedChunks(serializeUploadedChunks(verified));
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);

        boolean complete = verified.size() >= session.getTotalChunks();

        return UploadChunkResponse.builder()
                .chunkNumber(chunkNumber)
                .totalChunks(session.getTotalChunks())
                .uploadedChunks(new ArrayList<>(verified))
                .isComplete(complete)
                .build();
    }

    @Transactional
    public ClipboardItemDto completeChunkedUpload(String code, String uploadId) throws IOException {
        String clean = code.trim().toLowerCase();
        Optional<ClipboardUploadSessionEntity> sessionOpt = sessionRepository.findByIdAndShare_Code(uploadId, clean);
        if (sessionOpt.isEmpty()) {
            throw new IllegalArgumentException("Upload session not found");
        }

        ClipboardUploadSessionEntity session = sessionOpt.get();
        List<Integer> verified = parseUploadedChunks(session.getUploadedChunks());
        if (verified.size() < session.getTotalChunks()) {
            throw new IllegalStateException("Cannot complete upload: missing chunks (" + verified.size() + "/" + session.getTotalChunks() + " uploaded)");
        }

        String mime = session.getIsImage() ? "image/png" : "application/octet-stream";

        // Assemble chunks with deduplication and safe compression
        ClipboardFileStorageService.StorageResult storageResult = storageService.assembleChunks(
                uploadId,
                session.getTotalChunks(),
                session.getFileName(),
                mime,
                session.getFileHash()
        );

        session.setStatus("COMPLETED");
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);

        String itemId = "file_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Instant now = Instant.now();

        // Deduplicate in this share
        List<ClipboardItemEntity> existingItems = itemRepository.findByShare_CodeOrderByCreatedAtDesc(clean);
        for (ClipboardItemEntity existing : existingItems) {
            boolean match = (storageResult.getContentHash().equals(existing.getContentHash()))
                    || (session.getFileName().equals(existing.getOriginalName()) && session.getTotalSize() == existing.getSizeBytes());
            if (match) {
                itemRepository.delete(existing);
            }
        }

        ClipboardItemEntity item = ClipboardItemEntity.builder()
                .id(itemId)
                .share(session.getShare())
                .itemType(session.getIsImage() ? "IMAGE" : "FILE")
                .originalName(session.getFileName())
                .sizeBytes(storageResult.getOriginalSizeBytes())
                .detectedMime(mime)
                .storagePath(storageResult.getStoragePath())
                .contentHash(storageResult.getContentHash())
                .isCompressed(storageResult.isCompressed())
                .isEncrypted(session.getIsEncrypted())
                .createdAt(now)
                .expiresAt(session.getShare().getExpiresAt())
                .downloadCount(0)
                .viewCount(0)
                .build();

        itemRepository.save(item);
        return mapToItemDto(item);
    }

    public Optional<ClipboardItemEntity> getItem(String code, String itemId) {
        String clean = code.trim().toLowerCase();
        return itemRepository.findByIdAndShare_Code(itemId, clean);
    }

    public InputStream getFileStream(ClipboardItemEntity item) throws IOException {
        return storageService.getFileStream(item.getStoragePath(), Boolean.TRUE.equals(item.getIsCompressed()));
    }

    public byte[] readByteRange(ClipboardItemEntity item, long start, long end) throws IOException {
        return storageService.readByteRange(
                item.getStoragePath(),
                Boolean.TRUE.equals(item.getIsCompressed()),
                start,
                end,
                item.getSizeBytes()
        );
    }

    @Transactional
    public void incrementDownloadCount(String itemId) {
        itemRepository.findById(itemId).ifPresent(item -> {
            item.setDownloadCount(item.getDownloadCount() + 1);
            itemRepository.save(item);
        });
    }

    @Scheduled(fixedDelay = 3600000) // Hourly background cleanup
    @Transactional
    public void cleanupExpiredData() {
        Instant now = Instant.now();
        log.info("[ClipboardCleanup] Running scheduled cleanup of expired sessions and rooms...");

        // 1. Clean up expired upload sessions (> 24 hours)
        List<ClipboardUploadSessionEntity> expiredSessions = sessionRepository.findByStatusAndExpiresAtBefore("IN_PROGRESS", now);
        for (ClipboardUploadSessionEntity session : expiredSessions) {
            try {
                storageService.deleteChunkSession(session.getId());
                session.setStatus("EXPIRED");
                sessionRepository.save(session);
                log.info("[ClipboardCleanup] Expired incomplete upload session {}", session.getId());
            } catch (Exception e) {
                log.warn("[ClipboardCleanup] Error cleaning upload session {}: {}", session.getId(), e.getMessage());
            }
        }

        // 2. Clean up expired rooms and orphaned blobs
        List<ClipboardShareEntity> expiredShares = shareRepository.findByExpiresAtBefore(now);
        for (ClipboardShareEntity share : expiredShares) {
            try {
                List<ClipboardItemEntity> items = itemRepository.findByShare_CodeOrderByCreatedAtDesc(share.getCode());
                for (ClipboardItemEntity item : items) {
                    if (item.getStoragePath() != null) {
                        storageService.deleteBlobIfOrphaned(item.getStoragePath());
                    }
                }
                shareRepository.delete(share);
                log.info("[ClipboardCleanup] Expired clipboard room {}", share.getCode());
            } catch (Exception e) {
                log.warn("[ClipboardCleanup] Error deleting expired room {}: {}", share.getCode(), e.getMessage());
            }
        }
    }

    private ClipboardShareEntity getOrAutoProvision(String cleanCode) {
        return shareRepository.findById(cleanCode).orElseGet(() -> autoProvisionShare(cleanCode));
    }

    private ClipboardShareEntity autoProvisionShare(String cleanCode) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.getRetentionDays(), ChronoUnit.DAYS);

        ClipboardShareEntity share = ClipboardShareEntity.builder()
                .code(cleanCode)
                .wordCode(cleanCode + "-clip")
                .ownerToken("tok_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12))
                .createdAt(now)
                .updatedAt(now)
                .expiresAt(expiresAt)
                .burnAfterReading(false)
                .liveMode(true)
                .hasPin(false)
                .items(new ArrayList<>())
                .build();

        return shareRepository.save(share);
    }

    private String generateUniqueCode() {
        for (int attempts = 0; attempts < 100; attempts++) {
            StringBuilder sb = new StringBuilder(5);
            for (int i = 0; i < 5; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            String code = sb.toString();
            if (!shareRepository.existsById(code)) {
                return code;
            }
        }
        return UUID.randomUUID().toString().substring(0, 5);
    }

    private List<Integer> parseUploadedChunks(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Integer>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String serializeUploadedChunks(Set<Integer> chunks) {
        try {
            return objectMapper.writeValueAsString(new ArrayList<>(chunks));
        } catch (Exception e) {
            return "[]";
        }
    }

    private ClipboardShareDto mapToShareDto(ClipboardShareEntity entity, List<ClipboardItemEntity> items) {
        List<ClipboardItemDto> itemDtos = items.stream().map(this::mapToItemDto).collect(Collectors.toList());
        long totalSize = itemDtos.stream().mapToLong(ClipboardItemDto::getSizeBytes).sum();
        int textCount = (int) itemDtos.stream().filter(i -> "TEXT".equalsIgnoreCase(i.getItemType())).count();
        int imageCount = (int) itemDtos.stream().filter(i -> "IMAGE".equalsIgnoreCase(i.getItemType())).count();
        int fileCount = (int) itemDtos.stream().filter(i -> "FILE".equalsIgnoreCase(i.getItemType())).count();

        return ClipboardShareDto.builder()
                .code(entity.getCode())
                .wordCode(entity.getWordCode())
                .ownerToken(entity.getOwnerToken())
                .createdAt(entity.getCreatedAt().toString())
                .expiresAt(entity.getExpiresAt().toString())
                .burnAfterReading(entity.getBurnAfterReading())
                .liveMode(entity.getLiveMode())
                .hasPin(entity.getHasPin())
                .version(entity.getVersion() != null ? entity.getVersion() : 1L)
                .items(itemDtos)
                .textCount(textCount)
                .imageCount(imageCount)
                .fileCount(fileCount)
                .totalSizeBytes(totalSize)
                .build();
    }

    private ClipboardItemDto mapToItemDto(ClipboardItemEntity item) {
        String clean = item.getShare().getCode();
        return ClipboardItemDto.builder()
                .id(item.getId())
                .shareCode(clean)
                .itemType(item.getItemType())
                .textContent(item.getTextContent())
                .originalName(item.getOriginalName())
                .sizeBytes(item.getSizeBytes())
                .detectedMime(item.getDetectedMime())
                .createdAt(item.getCreatedAt().toString())
                .previewUrl("/api/v1/clipboard/shares/" + clean + "/items/" + item.getId() + "/download")
                .downloadUrl("/api/v1/clipboard/shares/" + clean + "/items/" + item.getId() + "/download")
                .downloadCount(item.getDownloadCount())
                .viewCount(item.getViewCount())
                .isEncrypted(item.getIsEncrypted())
                .contentHash(item.getContentHash())
                .build();
    }
}
