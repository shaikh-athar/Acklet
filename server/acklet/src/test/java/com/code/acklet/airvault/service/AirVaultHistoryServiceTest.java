package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultSearchDtos;
import com.code.acklet.airvault.entity.AirVaultAuditEvent;
import com.code.acklet.airvault.entity.ClipboardFile;
import com.code.acklet.airvault.repository.AirVaultAuditEventRepository;
import com.code.acklet.airvault.repository.AirVaultIdentityRepository;
import com.code.acklet.airvault.repository.ClipboardFileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AirVaultHistoryServiceTest {

    @Mock
    private AirVaultAuditEventRepository auditRepository;

    @Mock
    private ClipboardFileRepository fileRepository;

    @Mock
    private AirVaultIdentityRepository identityRepository;

    @Mock
    private AirVaultRedisTracker redisTracker;

    @InjectMocks
    private AirVaultHistoryService historyService;

    private ClipboardFile file1;
    private ClipboardFile file2;
    private AirVaultAuditEvent audit1;
    private AirVaultAuditEvent audit2;

    @BeforeEach
    void setUp() {
        file1 = ClipboardFile.builder()
                .id(UUID.randomUUID())
                .fileId("file-101")
                .fileName("design-mockup.png")
                .category("image")
                .byteSize(1024L)
                .senderDeviceId("dev-a")
                .senderDeviceName("Alice MacBook")
                .build();
        file1.setCreatedAt(Instant.now());

        file2 = ClipboardFile.builder()
                .id(UUID.randomUUID())
                .fileId("file-102")
                .fileName("api-contracts.json")
                .category("json")
                .byteSize(2048L)
                .senderDeviceId("dev-b")
                .senderDeviceName("Bob Linux")
                .build();
        file2.setCreatedAt(Instant.now());

        UUID evt1Id = UUID.randomUUID();
        audit1 = AirVaultAuditEvent.builder()
                .eventId(evt1Id)
                .eventType("item_created")
                .afterValue("const clipboardToken = 'bearer-xyz123';\nconsole.log(clipboardToken);")
                .actorUsername("alice")
                .deviceId("dev-a")
                .timestampUtc(Instant.now())
                .build();

        UUID evt2Id = UUID.randomUUID();
        audit2 = AirVaultAuditEvent.builder()
                .eventId(evt2Id)
                .eventType("item_pasted")
                .afterValue("https://github.com/google/antigravity")
                .actorUsername("bob")
                .deviceId("dev-b")
                .timestampUtc(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Empty query returns empty results without database scan")
    void testEmptyQuery() {
        AirVaultSearchDtos.SearchResponse res = historyService.searchUnifiedHistory("", "dev-a", "alice", 7, false);
        assertThat(res.getTotalMatches()).isZero();
        assertThat(res.getResults()).isEmpty();
    }

    @Test
    @DisplayName("Short query (<=2 chars) enforces word boundaries avoiding mid-word hits")
    void testShortQueryWordBoundaries() {
        when(fileRepository.findByCreatedAtAfterOrderByCreatedAtDesc(any())).thenReturn(List.of(file1, file2));
        when(auditRepository.findByTimestampUtcAfterOrderByTimestampUtcDesc(any())).thenReturn(List.of(audit1, audit2));

        // Query "in" should NOT match inside "design" or "console.log(clipboardToken)" unless it's a standalone word
        AirVaultSearchDtos.SearchResponse resNoWord = historyService.searchUnifiedHistory("in", "dev-a", "alice", 7, false);
        assertThat(resNoWord.getTotalMatches()).isZero();

        // But query "api" (3 chars) or full word matches
    }

    @Test
    @DisplayName("Unified search matches both clipboard files and text events with character offsets")
    void testUnifiedSearchMatches() {
        when(fileRepository.findByCreatedAtAfterOrderByCreatedAtDesc(any())).thenReturn(List.of(file1, file2));
        when(auditRepository.findByTimestampUtcAfterOrderByTimestampUtcDesc(any())).thenReturn(List.of(audit1, audit2));

        AirVaultSearchDtos.SearchResponse res = historyService.searchUnifiedHistory("clipboard", "dev-a", "alice", 7, false);

        assertThat(res.getTotalMatches()).isGreaterThanOrEqualTo(2);
        assertThat(res.getEntryCount()).isEqualTo(1); // audit1 contains "clipboardToken" twice
        AirVaultSearchDtos.MatchEntry entry = res.getResults().get(0);
        assertThat(entry.getEntryId()).isEqualTo(audit1.getEventId().toString());
        assertThat(entry.getOffsets()).isNotEmpty();
        assertThat(entry.getOffsets().get(0).getMatchText()).isEqualToIgnoringCase("clipboard");
    }

    @Test
    @DisplayName("File name matching works with partial query and correct entryType")
    void testFileNameSearch() {
        when(fileRepository.findByCreatedAtAfterOrderByCreatedAtDesc(any())).thenReturn(List.of(file1, file2));
        when(auditRepository.findByTimestampUtcAfterOrderByTimestampUtcDesc(any())).thenReturn(List.of(audit1, audit2));

        AirVaultSearchDtos.SearchResponse res = historyService.searchUnifiedHistory("mockup", "dev-a", "alice", 7, false);

        assertThat(res.getEntryCount()).isEqualTo(1);
        AirVaultSearchDtos.MatchEntry entry = res.getResults().get(0);
        assertThat(entry.getEntryId()).isEqualTo("file-101");
        assertThat(entry.getEntryType()).isEqualTo("IMAGE");
        assertThat(entry.getOffsets().get(0).getField()).isEqualTo("title");
    }
}
