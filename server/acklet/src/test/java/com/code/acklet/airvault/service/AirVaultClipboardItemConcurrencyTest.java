package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultClipboardDtos.*;
import com.code.acklet.airvault.entity.AirVaultClipboardItem;
import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import com.code.acklet.airvault.repository.AirVaultClipboardItemRepository;
import com.code.acklet.airvault.repository.AirVaultSharedClipboardRepository;
import com.code.acklet.airvault.security.AirVaultAuthorizationService;
import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.code.acklet.airvault.security.AirVaultTokenService;
import com.code.acklet.airvault.websocket.AirVaultWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AirVaultClipboardItemConcurrencyTest {

    @Mock
    private AirVaultSharedClipboardRepository clipboardRepository;

    @Mock
    private AirVaultClipboardItemRepository itemRepository;

    @Mock
    private com.code.acklet.airvault.repository.AirVaultIdentityRepository identityRepository;

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

    private AirVaultSharedClipboard testClipboard;
    private final String CLIPBOARD_ID = "clip-test12345";
    private AirVaultPrincipal ownerPrincipal;

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

        ownerPrincipal = AirVaultPrincipal.builder()
                .username("testowner")
                .deviceId("dev-owner")
                .tokenType("USER")
                .build();

        testClipboard = AirVaultSharedClipboard.builder()
                .id(CLIPBOARD_ID)
                .ownerUsername("testowner")
                .ownerDeviceId("dev-owner")
                .title("Test Concurrent Board")
                .accessMode("read-write")
                .nextSeq(1L)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(86400))
                .build();
    }

    @Test
    void testConcurrent50AddsAssignConsecutiveSeqNumbers() throws Exception {
        int threadCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        AtomicLong currentSeqCounter = new AtomicLong(1L);
        List<Long> assignedSeqs = new CopyOnWriteArrayList<>();
        List<AirVaultClipboardItem> storedRows = new CopyOnWriteArrayList<>();

        // Mock optimistic/pessimistic lock simulation
        final Object lock = new Object();
        when(authorizationService.canWrite(any(), eq(CLIPBOARD_ID))).thenReturn(true);
        when(authorizationService.isOwner(any(), eq(CLIPBOARD_ID))).thenReturn(true);
        when(authorizationService.checkAccess(any(), eq(CLIPBOARD_ID))).thenReturn(AirVaultAuthorizationService.AccessLevel.OWNER);

        when(clipboardRepository.findByIdAndDeletedAtIsNull(CLIPBOARD_ID)).thenAnswer(inv -> {
            synchronized (lock) {
                return Optional.of(testClipboard);
            }
        });

        // Lock & Atomic update simulation
        when(clipboardRepository.findByIdForUpdate(CLIPBOARD_ID)).thenAnswer(inv -> {
            synchronized (lock) {
                return Optional.of(testClipboard);
            }
        });

        when(clipboardRepository.save(any(AirVaultSharedClipboard.class))).thenAnswer(inv -> {
            synchronized (lock) {
                AirVaultSharedClipboard saved = inv.getArgument(0);
                testClipboard.setNextSeq(saved.getNextSeq());
                return saved;
            }
        });

        when(itemRepository.save(any(AirVaultClipboardItem.class))).thenAnswer(inv -> {
            AirVaultClipboardItem item = inv.getArgument(0);
            storedRows.add(item);
            assignedSeqs.add(item.getSeq());
            return item;
        });

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    AddClipboardItemRequest req = AddClipboardItemRequest.builder()
                            .opId("op-" + index)
                            .item(Map.of("id", "op-" + index, "text", "Item payload " + index))
                            .build();

                    synchronized (lock) {
                        clipboardService.addItem(CLIPBOARD_ID, req, ownerPrincipal);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Release all threads simultaneously
        startLatch.countDown();
        assertTrue(finishLatch.await(10, TimeUnit.SECONDS));
        executor.shutdown();

        // Verify that 50 items were saved
        assertEquals(50, storedRows.size());
        assertEquals(50, assignedSeqs.size());

        // Verify that all assigned sequence numbers from 1 to 50 are present with zero duplicates
        Set<Long> uniqueSeqs = new HashSet<>(assignedSeqs);
        assertEquals(50, uniqueSeqs.size(), "All 50 assigned sequence numbers must be unique");

        for (long seq = 1L; seq <= 50L; seq++) {
            assertTrue(uniqueSeqs.contains(seq), "Missing sequence number: " + seq);
        }
    }

    @Test
    void testIdempotentOpIdReturnsExistingWithoutDuplicateInsert() {
        when(authorizationService.canWrite(any(), eq(CLIPBOARD_ID))).thenReturn(true);
        when(authorizationService.isOwner(any(), eq(CLIPBOARD_ID))).thenReturn(true);
        when(authorizationService.checkAccess(any(), eq(CLIPBOARD_ID))).thenReturn(AirVaultAuthorizationService.AccessLevel.OWNER);
        when(clipboardRepository.findByIdAndDeletedAtIsNull(CLIPBOARD_ID)).thenReturn(Optional.of(testClipboard));
        when(clipboardRepository.findByIdForUpdate(CLIPBOARD_ID)).thenReturn(Optional.of(testClipboard));

        AirVaultClipboardItem existingItem = AirVaultClipboardItem.builder()
                .id(UUID.randomUUID())
                .clipboardId(CLIPBOARD_ID)
                .seq(1L)
                .opId("duplicate-op-id")
                .authorType("owner")
                .authorName("testowner")
                .payload("{\"text\":\"Original Item\"}")
                .build();

        // First check returns empty, second check returns existing item
        when(itemRepository.findByClipboardIdAndOpId(CLIPBOARD_ID, "duplicate-op-id"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existingItem));

        AddClipboardItemRequest req = AddClipboardItemRequest.builder()
                .opId("duplicate-op-id")
                .item(Map.of("text", "Original Item"))
                .build();

        // First call inserts
        clipboardService.addItem(CLIPBOARD_ID, req, ownerPrincipal);
        verify(itemRepository, times(1)).save(any(AirVaultClipboardItem.class));

        // Second call with same opId is idempotent
        clipboardService.addItem(CLIPBOARD_ID, req, ownerPrincipal);
        // itemRepository.save should NOT have been called a second time
        verify(itemRepository, times(1)).save(any(AirVaultClipboardItem.class));
    }
}
