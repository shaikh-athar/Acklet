package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.DocLineStateDto;
import com.code.acklet.airvault.dto.DocOperationDto;
import com.code.acklet.airvault.dto.DocStateDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class AirVaultDocSequencerServiceTest {

    private AirVaultDocSequencerService sequencerService;
    private final String docId = "test-shared-doc-1";

    @BeforeEach
    void setUp() {
        sequencerService = new AirVaultDocSequencerService();
        sequencerService.resetDocument(docId);
    }

    @Test
    @DisplayName("Verification 1: Three devices editing different lines simultaneously are all preserved")
    void testThreeDevicesEditDifferentLinesSimultaneously() {
        // Device A edits Line 1
        DocOperationDto opA = DocOperationDto.builder()
                .opId(UUID.randomUUID().toString())
                .docId(docId)
                .type("ADD")
                .lineId("line-1")
                .authorId("dev-device-A")
                .authorName("@alice")
                .content("Line 1 authored by Alice")
                .build();

        // Device B edits Line 2
        DocOperationDto opB = DocOperationDto.builder()
                .opId(UUID.randomUUID().toString())
                .docId(docId)
                .type("ADD")
                .lineId("line-2")
                .authorId("dev-device-B")
                .authorName("@bob")
                .content("Line 2 authored by Bob")
                .build();

        // Device C edits Line 3
        DocOperationDto opC = DocOperationDto.builder()
                .opId(UUID.randomUUID().toString())
                .docId(docId)
                .type("ADD")
                .lineId("line-3")
                .authorId("dev-device-C")
                .authorName("@charlie")
                .content("Line 3 authored by Charlie")
                .build();

        DocOperationDto seqA = sequencerService.processOperation(opA);
        DocOperationDto seqB = sequencerService.processOperation(opB);
        DocOperationDto seqC = sequencerService.processOperation(opC);

        assertEquals(1L, seqA.getSequenceNumber());
        assertEquals(2L, seqB.getSequenceNumber());
        assertEquals(3L, seqC.getSequenceNumber());

        DocStateDto state = sequencerService.getDocumentState(docId);
        assertNotNull(state);
        assertEquals(3L, state.getLatestSequenceNumber());
        assertEquals(3, state.getLines().size());

        List<DocLineStateDto> lines = state.getLines();
        assertEquals("Line 1 authored by Alice", lines.get(0).getContent());
        assertEquals("Line 2 authored by Bob", lines.get(1).getContent());
        assertEquals("Line 3 authored by Charlie", lines.get(2).getContent());
    }

    @Test
    @DisplayName("Verification 2: Concurrent EDIT vs DELETE on same line resolves by sequence number")
    void testEditVsDeleteOnSameLineConflictResolution() {
        // Step 1: Initial line creation
        DocOperationDto initOp = DocOperationDto.builder()
                .opId("op-init")
                .docId(docId)
                .type("ADD")
                .lineId("target-line")
                .authorId("dev-A")
                .authorName("@alice")
                .content("Initial content")
                .build();
        sequencerService.processOperation(initOp);

        // Case A: Delete comes first (seq 2), then Edit comes later (seq 3) -> Edit wins (un-tombstone)
        DocOperationDto deleteOp = DocOperationDto.builder()
                .opId("op-del-1")
                .docId(docId)
                .type("DELETE")
                .lineId("target-line")
                .authorId("dev-A")
                .authorName("@alice")
                .build();
        DocOperationDto seqDel = sequencerService.processOperation(deleteOp);
        assertEquals(2L, seqDel.getSequenceNumber());
        assertEquals(2L, seqDel.getDeletedAtSequence());

        DocStateDto deletedState = sequencerService.getDocumentState(docId);
        assertTrue(deletedState.getLines().get(0).isDeleted(), "Line should be tombstoned");

        DocOperationDto editLaterOp = DocOperationDto.builder()
                .opId("op-edit-later")
                .docId(docId)
                .type("EDIT")
                .lineId("target-line")
                .authorId("dev-B")
                .authorName("@bob")
                .content("Resurrected and edited by Bob")
                .build();
        DocOperationDto seqEdit = sequencerService.processOperation(editLaterOp);
        assertEquals(3L, seqEdit.getSequenceNumber());

        DocStateDto resurrectedState = sequencerService.getDocumentState(docId);
        assertFalse(resurrectedState.getLines().get(0).isDeleted(), "Line should be un-tombstoned by later EDIT");
        assertEquals("Resurrected and edited by Bob", resurrectedState.getLines().get(0).getContent());

        // Case B: If DELETE comes after EDIT -> Delete wins
        DocOperationDto finalDelOp = DocOperationDto.builder()
                .opId("op-del-final")
                .docId(docId)
                .type("DELETE")
                .lineId("target-line")
                .authorId("dev-A")
                .authorName("@alice")
                .build();
        DocOperationDto seqFinalDel = sequencerService.processOperation(finalDelOp);
        assertEquals(4L, seqFinalDel.getSequenceNumber());

        DocStateDto finalState = sequencerService.getDocumentState(docId);
        assertTrue(finalState.getLines().get(0).isDeleted(), "Final delete at higher sequence must tombstone line");
    }

    @Test
    @DisplayName("Verification 3: Offline edits replayed after peer changes integrate cleanly without overwrite")
    void testOfflineEditsReplayCorrectly() {
        // Device A adds Line 1
        sequencerService.processOperation(DocOperationDto.builder()
                .opId("op-a1")
                .docId(docId)
                .type("ADD")
                .lineId("line-1")
                .authorId("dev-A")
                .content("Line 1 from A")
                .build());

        // Device B adds Line 2
        sequencerService.processOperation(DocOperationDto.builder()
                .opId("op-b1")
                .docId(docId)
                .type("ADD")
                .lineId("line-2")
                .authorId("dev-B")
                .content("Line 2 from B")
                .build());

        // Device C was offline and generated two local operations:
        // 1. Edit Line 1
        // 2. Add Line 3
        DocOperationDto offlineEdit = DocOperationDto.builder()
                .opId("op-c-offline-1")
                .docId(docId)
                .type("EDIT")
                .lineId("line-1")
                .authorId("dev-C")
                .content("Line 1 modified by C while offline")
                .build();

        DocOperationDto offlineAdd = DocOperationDto.builder()
                .opId("op-c-offline-2")
                .docId(docId)
                .type("ADD")
                .lineId("line-3")
                .authorId("dev-C")
                .content("Line 3 added by C")
                .build();

        // Replay offline operations on reconnect
        DocOperationDto replayed1 = sequencerService.processOperation(offlineEdit);
        DocOperationDto replayed2 = sequencerService.processOperation(offlineAdd);

        assertEquals(3L, replayed1.getSequenceNumber());
        assertEquals(4L, replayed2.getSequenceNumber());

        DocStateDto state = sequencerService.getDocumentState(docId);
        assertEquals(4L, state.getLatestSequenceNumber());
        assertEquals(3, state.getLines().size());

        assertEquals("Line 1 modified by C while offline", state.getLines().get(0).getContent());
        assertEquals("Line 2 from B", state.getLines().get(1).getContent());
        assertEquals("Line 3 added by C", state.getLines().get(2).getContent());
    }

    @Test
    @DisplayName("Verification 4: Redelivered queue message with same opId is idempotent and no-op")
    void testDuplicateOpIdRedeliveryIsIdempotent() {
        DocOperationDto originalOp = DocOperationDto.builder()
                .opId("op-idempotent-uuid-999")
                .docId(docId)
                .type("ADD")
                .lineId("line-idempotent")
                .authorId("dev-A")
                .content("Original payload")
                .build();

        DocOperationDto firstResult = sequencerService.processOperation(originalOp);
        assertEquals(1L, firstResult.getSequenceNumber());

        // Simulate RabbitMQ redelivering duplicate message with same opId
        DocOperationDto duplicateOp = DocOperationDto.builder()
                .opId("op-idempotent-uuid-999")
                .docId(docId)
                .type("ADD")
                .lineId("line-idempotent")
                .authorId("dev-A")
                .content("Original payload duplicate")
                .build();

        DocOperationDto duplicateResult = sequencerService.processOperation(duplicateOp);
        assertEquals(1L, duplicateResult.getSequenceNumber(), "Duplicate must return same sequence number");

        DocStateDto state = sequencerService.getDocumentState(docId);
        assertEquals(1L, state.getLatestSequenceNumber(), "Sequence counter must not have incremented");
        assertEquals(1, state.getLines().size(), "Must have only 1 line");
    }
}
