package com.code.acklet.airvault.service;

import com.code.acklet.airvault.entity.AirVaultClipboardItem;
import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import com.code.acklet.airvault.repository.AirVaultClipboardItemRepository;
import com.code.acklet.airvault.repository.AirVaultSharedClipboardRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultItemsMigrationService {

    private final AirVaultSharedClipboardRepository clipboardRepository;
    private final AirVaultClipboardItemRepository itemRepository;
    private final ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void migrateLegacyJsonItems() {
        try {
            List<AirVaultSharedClipboard> clipboards = clipboardRepository.findAll();
            for (AirVaultSharedClipboard clipboard : clipboards) {
                if (clipboard.getItemsJson() == null || clipboard.getItemsJson().isBlank() || clipboard.getItemsJson().trim().equals("[]")) {
                    continue;
                }

                long existingCount = itemRepository.countByClipboardIdAndDeletedAtIsNull(clipboard.getId());
                if (existingCount > 0) {
                    continue; // Already migrated or has items
                }

                try {
                    List<Map<String, Object>> items = objectMapper.readValue(clipboard.getItemsJson(), new TypeReference<>() {});
                    if (items == null || items.isEmpty()) {
                        continue;
                    }

                    log.info("[AirVault Migration] 🔄 Migrating {} items from items_json to rows for clipboard={}", items.size(), clipboard.getId());
                    long seq = 1L;

                    // Items in JSON were newest-first (index 0 = newest). For sequential order, we assign seq 1..N
                    // preserved in reverse list order (oldest gets seq 1, newest gets seq N)
                    for (int i = items.size() - 1; i >= 0; i--) {
                        Map<String, Object> it = items.get(i);
                        String opId = it.get("id") != null ? it.get("id").toString() : UUID.randomUUID().toString();
                        String authorType = (String) it.getOrDefault("senderDeviceType", "owner");
                        String authorName = (String) it.getOrDefault("senderDeviceName", clipboard.getOwnerUsername());
                        String authorColor = (String) it.getOrDefault("senderDeviceAccent", "#2196F3");

                        String payloadJson;
                        try {
                            payloadJson = objectMapper.writeValueAsString(it);
                        } catch (Exception e) {
                            payloadJson = it.toString();
                        }

                        AirVaultClipboardItem row = AirVaultClipboardItem.builder()
                                .clipboardId(clipboard.getId())
                                .seq(seq++)
                                .opId(opId)
                                .authorType(authorType != null ? authorType : "owner")
                                .authorName(authorName)
                                .authorColor(authorColor)
                                .payload(payloadJson)
                                .createdAt(clipboard.getCreatedAt() != null ? clipboard.getCreatedAt() : Instant.now())
                                .build();

                        itemRepository.save(row);
                    }

                    clipboard.setNextSeq(seq);
                    clipboardRepository.save(clipboard);
                    log.info("[AirVault Migration] ✅ Migrated {} items for clipboard={}, nextSeq={}", items.size(), clipboard.getId(), seq);
                } catch (Exception e) {
                    log.warn("[AirVault Migration] Could not migrate items_json for clipboard={}: {}", clipboard.getId(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.debug("[AirVault Migration] Migration check completed with message: {}", e.getMessage());
        }
    }
}
