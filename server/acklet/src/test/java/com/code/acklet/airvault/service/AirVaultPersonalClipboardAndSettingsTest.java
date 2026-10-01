package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultClipboardDtos.*;
import com.code.acklet.airvault.dto.AirVaultSettingsDtos.*;
import com.code.acklet.airvault.entity.AirVaultClipboardItem;
import com.code.acklet.airvault.entity.AirVaultIdentity;
import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import com.code.acklet.airvault.entity.AirVaultUserSettings;
import com.code.acklet.airvault.repository.AirVaultClipboardItemRepository;
import com.code.acklet.airvault.repository.AirVaultIdentityRepository;
import com.code.acklet.airvault.repository.AirVaultSharedClipboardRepository;
import com.code.acklet.airvault.repository.AirVaultUserSettingsRepository;
import com.code.acklet.airvault.security.AirVaultAuthorizationService;
import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.code.acklet.airvault.security.AirVaultTokenService;
import com.code.acklet.airvault.websocket.AirVaultWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AirVaultPersonalClipboardAndSettingsTest {

    @Mock
    private AirVaultSharedClipboardRepository clipboardRepository;

    @Mock
    private AirVaultClipboardItemRepository itemRepository;

    @Mock
    private AirVaultIdentityRepository identityRepository;

    @Mock
    private AirVaultUserSettingsRepository settingsRepository;

    @Mock
    private AirVaultAuthorizationService authorizationService;

    @Mock
    private AirVaultTokenService tokenService;

    @Mock
    private AirVaultWebSocketHandler webSocketHandler;

    @Mock
    private AirVaultSyncRelayService syncRelayService;

    @Mock
    private AirVaultAuditService auditService;

    private ObjectMapper objectMapper = new ObjectMapper();

    private AirVaultSharedClipboardService clipboardService;
    private AirVaultSettingsService settingsService;

    private AirVaultPrincipal alicePrincipal;
    private AirVaultIdentity aliceIdentity;

    @BeforeEach
    void setUp() {
        clipboardService = new AirVaultSharedClipboardService(
                clipboardRepository,
                itemRepository,
                identityRepository,
                authorizationService,
                tokenService,
                webSocketHandler,
                syncRelayService,
                objectMapper,
                auditService
        );

        settingsService = new AirVaultSettingsService(
                settingsRepository,
                identityRepository,
                objectMapper
        );

        aliceIdentity = AirVaultIdentity.builder()
                .id(UUID.randomUUID())
                .username("alice")
                .isCustomized(true)
                .build();

        alicePrincipal = AirVaultPrincipal.builder()
                .username("alice")
                .deviceId("dev-alice-mac")
                .tokenType("USER")
                .build();
    }

    @Test
    void testPersonalClipboardProvisioningAndIdempotency() {
        when(identityRepository.findByUsernameIgnoreCase("alice")).thenReturn(Optional.of(aliceIdentity));
        when(clipboardRepository.findFirstByOwnerIdentityIdAndIsPersonalTrueAndDeletedAtIsNull(aliceIdentity.getId()))
                .thenReturn(Optional.empty());

        when(clipboardRepository.save(any(AirVaultSharedClipboard.class))).thenAnswer(inv -> inv.getArgument(0));
        when(clipboardRepository.findByIdAndDeletedAtIsNull(anyString())).thenAnswer(inv -> {
            String id = inv.getArgument(0);
            return Optional.of(AirVaultSharedClipboard.builder()
                    .id(id)
                    .ownerUsername("alice")
                    .ownerIdentityId(aliceIdentity.getId())
                    .ownerDeviceId("dev-alice-mac")
                    .title("@alice's Clipboard")
                    .accessMode("read-write")
                    .isPersonal(true)
                    .nextSeq(1L)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build());
        });
        when(authorizationService.checkAccess(any(), anyString())).thenReturn(AirVaultAuthorizationService.AccessLevel.OWNER);

        // 1. First call provisions personal clipboard
        ClipboardResponseDto response = clipboardService.getOrCreatePersonalClipboard(alicePrincipal);

        assertNotNull(response);
        assertTrue(response.isPersonal());
        assertEquals("alice", response.getOwnerUsername());
        assertEquals("read-write", response.getAccessMode());
        assertNull(response.getExpiresAt(), "Personal clipboard must never have an expiration date");
        verify(clipboardRepository, atLeastOnce()).save(any(AirVaultSharedClipboard.class));
    }

    @Test
    void testChangeFeedWithSinceSeqAndLimit() {
        String clipId = "clip-change-feed-test";
        when(authorizationService.canRead(alicePrincipal, clipId)).thenReturn(true);

        AirVaultClipboardItem item1 = AirVaultClipboardItem.builder()
                .id(UUID.randomUUID())
                .clipboardId(clipId)
                .seq(10L)
                .lastChangeSeq(10L)
                .opId("op-10")
                .payload("{\"text\":\"hello 10\"}")
                .createdAt(Instant.now())
                .build();

        AirVaultClipboardItem item2 = AirVaultClipboardItem.builder()
                .id(UUID.randomUUID())
                .clipboardId(clipId)
                .seq(11L)
                .lastChangeSeq(11L)
                .opId("op-11")
                .payload("{\"text\":\"hello 11\"}")
                .createdAt(Instant.now())
                .build();

        when(itemRepository.findByClipboardIdAndLastChangeSeqGreaterThanOrderByLastChangeSeqAsc(eq(clipId), eq(9L), any(Pageable.class)))
                .thenReturn(List.of(item1, item2));

        List<ClipboardItemDto> items = clipboardService.getItemsSince(clipId, 9L, 20, alicePrincipal);

        assertEquals(2, items.size());
        assertEquals(10L, items.get(0).getLastChangeSeq());
        assertEquals(11L, items.get(1).getLastChangeSeq());
    }

    @Test
    void testUserSettingsGetAndUpdateVersioning() {
        when(identityRepository.findByUsernameIgnoreCase("alice")).thenReturn(Optional.of(aliceIdentity));

        // 1. Get Settings when empty -> returns default version 1
        when(settingsRepository.findByIdentityId(aliceIdentity.getId())).thenReturn(Optional.empty());
        when(settingsRepository.save(any(AirVaultUserSettings.class))).thenAnswer(inv -> inv.getArgument(0));

        UserSettingsDto initial = settingsService.getSettings(alicePrincipal);
        assertNotNull(initial);
        assertEquals("alice", initial.getUsername());
        assertEquals(1L, initial.getVersion());

        // 2. Update Settings -> increments version to 2
        AirVaultUserSettings existingSettings = AirVaultUserSettings.builder()
                .identityId(aliceIdentity.getId())
                .username("alice")
                .version(1L)
                .settingsJson("{}")
                .build();

        when(settingsRepository.findByIdentityId(aliceIdentity.getId())).thenReturn(Optional.of(existingSettings));

        UpdateSettingsRequest updateReq = UpdateSettingsRequest.builder()
                .version(1L)
                .settings(Map.of("theme", "dark", "soundEnabled", false, "defaultRetentionDays", 7))
                .build();

        UserSettingsDto updated = settingsService.updateSettings(updateReq, alicePrincipal);
        assertNotNull(updated);
        assertEquals(2L, updated.getVersion());
        assertEquals("dark", updated.getSettings().get("theme"));
        assertEquals(false, updated.getSettings().get("soundEnabled"));
    }
}
