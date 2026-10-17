package com.code.acklet.tool.tools.clipboard.service;

import com.code.acklet.tool.tools.clipboard.dto.*;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ClipboardService {

    private static final String CODE_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, ClipboardShareDto> shareStore = new ConcurrentHashMap<>();

    private final Map<String, byte[]> fileByteStore = new ConcurrentHashMap<>();

    public ClipboardConfigDto getConfig() {
        return ClipboardConfigDto.builder()
                .codeLength(5)
                .maxCodeLength(8)
                .maxFileSizeBytes(200L * 1024 * 1024)
                .maxTextSizeBytes(50L * 1024 * 1024)
                .maxItemsPerType(100)
                .maxTotalShareSizeBytes(500L * 1024 * 1024)
                .retentionDays(7)
                .chunkSize(5L * 1024 * 1024)
                .build();
    }

    public ClipboardShareDto createShare(CreateShareRequest request) {
        String code = (request != null && request.getRequestedCode() != null && !request.getRequestedCode().isBlank())
                ? request.getRequestedCode().trim().toLowerCase()
                : generateUniqueCode();
        int expiryHours = (request != null && request.getExpiryHours() != null) ? request.getExpiryHours() : 168; // 7 days
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expiryHours, ChronoUnit.HOURS);

        ClipboardShareDto share = ClipboardShareDto.builder()
                .code(code)
                .wordCode(code + "-clip")
                .ownerToken("tok_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12))
                .createdAt(now.toString())
                .expiresAt(expiresAt.toString())
                .burnAfterReading(request != null && Boolean.TRUE.equals(request.getBurnAfterReading()))
                .liveMode(request == null || !Boolean.FALSE.equals(request.getLiveMode()))
                .hasPin(request != null && request.getPin() != null && !request.getPin().isBlank())
                .items(new ArrayList<>())
                .textCount(0)
                .imageCount(0)
                .fileCount(0)
                .totalSizeBytes(0)
                .build();

        shareStore.put(code, share);
        return share;
    }

    public void cleanupExpiredShares() {
        Instant now = Instant.now();
        shareStore.entrySet().removeIf(entry -> {
            try {
                return Instant.parse(entry.getValue().getExpiresAt()).isBefore(now);
            } catch (Exception e) {
                return false;
            }
        });
    }

    public Optional<ClipboardShareDto> getShare(String code, String pin) {
        if (shareStore.size() > 500) {
            cleanupExpiredShares();
        }
        String clean = code.trim().toLowerCase();
        ClipboardShareDto share = shareStore.get(clean);
        if (share == null) {
            // Auto-provision on lookup so any valid 5-char code can be immediately joined
            ClipboardShareDto created = createShareWithCode(clean);
            return Optional.of(created);
        }
        return Optional.of(share);
    }

    public ClipboardItemDto addTextItem(String code, String text, String ownerToken, boolean isEncrypted) {
        String clean = code.trim().toLowerCase();
        ClipboardShareDto share = shareStore.computeIfAbsent(clean, this::createShareWithCode);

        long sizeBytes = text != null ? text.getBytes().length : 0;
        String itemId = "item_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Instant now = Instant.now();

        ClipboardItemDto item = ClipboardItemDto.builder()
                .id(itemId)
                .shareCode(clean)
                .itemType("TEXT")
                .textContent(text != null ? text : "")
                .sizeBytes(sizeBytes)
                .detectedMime("text/plain")
                .createdAt(now.toString())
                .downloadCount(0)
                .viewCount(1)
                .isEncrypted(isEncrypted)
                .build();

        // If existing text item exists, replace it (shared clipboard semantics)
        synchronized (share) {
            share.getItems().removeIf(i -> "TEXT".equalsIgnoreCase(i.getItemType()) || "LINK".equalsIgnoreCase(i.getItemType()));
            share.getItems().add(0, item);
            share.setTextCount(1);
            share.setTotalSizeBytes(share.getItems().stream().mapToLong(ClipboardItemDto::getSizeBytes).sum());
        }

        return item;
    }

    public boolean deleteItem(String code, String itemId, String ownerToken) {
        String clean = code.trim().toLowerCase();
        ClipboardShareDto share = shareStore.get(clean);
        if (share == null) return false;

        synchronized (share) {
            boolean removed = share.getItems().removeIf(i -> {
                if (i.getId().equals(itemId)) {
                    fileByteStore.remove(itemId);
                    return true;
                }
                return false;
            });
            if (removed) {
                share.setTextCount((int) share.getItems().stream().filter(i -> "TEXT".equalsIgnoreCase(i.getItemType())).count());
                share.setImageCount((int) share.getItems().stream().filter(i -> "IMAGE".equalsIgnoreCase(i.getItemType())).count());
                share.setFileCount((int) share.getItems().stream().filter(i -> "FILE".equalsIgnoreCase(i.getItemType())).count());
                share.setTotalSizeBytes(share.getItems().stream().mapToLong(ClipboardItemDto::getSizeBytes).sum());
            }
            return removed;
        }
    }

    public ClipboardItemDto addFileItem(String code, String filename, byte[] content, String mimeType, boolean isImage, boolean isEncrypted, String contentHash) {
        String clean = code.trim().toLowerCase();
        ClipboardShareDto share = shareStore.computeIfAbsent(clean, this::createShareWithCode);

        String itemId = "file_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Instant now = Instant.now();
        long size = content != null ? content.length : 0;

        if (content != null && content.length > 0) {
            fileByteStore.put(itemId, content);
        }

        ClipboardItemDto item = ClipboardItemDto.builder()
                .id(itemId)
                .shareCode(clean)
                .itemType(isImage ? "IMAGE" : "FILE")
                .originalName(filename)
                .sizeBytes(size)
                .detectedMime(mimeType != null && !mimeType.isBlank() ? mimeType : (isImage ? "image/png" : "application/octet-stream"))
                .createdAt(now.toString())
                .previewUrl("/api/v1/clipboard/shares/" + clean + "/items/" + itemId + "/download")
                .downloadUrl("/api/v1/clipboard/shares/" + clean + "/items/" + itemId + "/download")
                .downloadCount(0)
                .viewCount(0)
                .isEncrypted(isEncrypted)
                .contentHash(contentHash)
                .build();

        synchronized (share) {
            // Deduplicate if identical hash or name+size
            share.getItems().removeIf(existing -> {
                boolean match = (contentHash != null && !contentHash.isBlank() && contentHash.equals(existing.getContentHash()))
                        || (filename.equals(existing.getOriginalName()) && size == existing.getSizeBytes());
                if (match) {
                    fileByteStore.remove(existing.getId());
                }
                return match;
            });

            share.getItems().add(0, item);
            if (isImage) {
                share.setImageCount(share.getImageCount() + 1);
            } else {
                share.setFileCount(share.getFileCount() + 1);
            }
            share.setTotalSizeBytes(share.getItems().stream().mapToLong(ClipboardItemDto::getSizeBytes).sum());
        }

        return item;
    }

    public Optional<byte[]> getFileBytes(String itemId) {
        return Optional.ofNullable(fileByteStore.get(itemId));
    }

    public Optional<ClipboardItemDto> getItem(String code, String itemId) {
        String clean = code.trim().toLowerCase();
        ClipboardShareDto share = shareStore.get(clean);
        if (share == null) return Optional.empty();
        return share.getItems().stream().filter(i -> i.getId().equals(itemId)).findFirst();
    }

    private ClipboardShareDto createShareWithCode(String code) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(7, ChronoUnit.DAYS);

        ClipboardShareDto share = ClipboardShareDto.builder()
                .code(code)
                .wordCode(code + "-clip")
                .ownerToken("tok_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12))
                .createdAt(now.toString())
                .expiresAt(expiresAt.toString())
                .burnAfterReading(false)
                .liveMode(true)
                .hasPin(false)
                .items(new ArrayList<>())
                .textCount(0)
                .imageCount(0)
                .fileCount(0)
                .totalSizeBytes(0)
                .build();

        shareStore.put(code, share);
        return share;
    }

    private String generateUniqueCode() {
        for (int attempts = 0; attempts < 100; attempts++) {
            StringBuilder sb = new StringBuilder(5);
            for (int i = 0; i < 5; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            String code = sb.toString();
            if (!shareStore.containsKey(code)) {
                return code;
            }
        }
        return UUID.randomUUID().toString().substring(0, 5);
    }
}
