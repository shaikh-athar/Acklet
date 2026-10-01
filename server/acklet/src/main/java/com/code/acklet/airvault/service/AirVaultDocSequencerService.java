package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.DocLineStateDto;
import com.code.acklet.airvault.dto.DocOperationDto;
import com.code.acklet.airvault.dto.DocStateDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * AirVault Document Sequencer and Conflict Resolution Service.
 *
 * Enforces:
 * 1. Single source of truth: Server-assigned monotonically increasing sequence numbers.
 * 2. Idempotency & Deduplication: Re-delivered or duplicate opId is a no-op.
 * 3. Tombstone-based delete/edit conflict resolution:
 *    - EDIT vs DELETE on same line: Later sequence number wins.
 *    - Concurrent DELETEs on distinct lines: Applied independently.
 *    - Concurrent EDITs on same line: Last sequence number wins.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultDocSequencerService {

    // Monotonic sequence counters keyed by docId
    private final Map<String, AtomicLong> docSequences = new ConcurrentHashMap<>();

    // Processed operations history keyed by docId
    private final Map<String, List<DocOperationDto>> docOperationHistory = new ConcurrentHashMap<>();

    // Processed opIds keyed by docId for fast idempotency check
    private final Map<String, Map<String, DocOperationDto>> processedOps = new ConcurrentHashMap<>();

    // Document line states (including tombstones) keyed by docId -> list of lineIds preserving order
    private final Map<String, List<String>> docLineOrder = new ConcurrentHashMap<>();
    private final Map<String, Map<String, DocLineStateDto>> docLines = new ConcurrentHashMap<>();

    // Per-doc monitor locks for strict FIFO ordering
    private final Map<String, Object> docLocks = new ConcurrentHashMap<>();

    private Object getDocLock(String docId) {
        return docLocks.computeIfAbsent(docId, k -> new Object());
    }

    /**
     * Atomically assigns a sequence number, deduplicates, and resolves conflicts.
     */
    public DocOperationDto processOperation(DocOperationDto op) {
        if (op == null || op.getDocId() == null || op.getOpId() == null) {
            throw new IllegalArgumentException("Operation, docId, and opId must not be null");
        }

        String docId = op.getDocId();
        synchronized (getDocLock(docId)) {
            Map<String, DocOperationDto> seenOps = processedOps.computeIfAbsent(docId, k -> new ConcurrentHashMap<>());
            
            // 1. Idempotency Check: Redelivered/retried opId is a no-op
            if (seenOps.containsKey(op.getOpId())) {
                DocOperationDto existing = seenOps.get(op.getOpId());
                log.debug("[DocSequencer] 🔁 Idempotent duplicate opId={} detected for docId={}, returning existing sequence={}",
                        op.getOpId(), docId, existing.getSequenceNumber());
                return existing;
            }

            // 2. Assign next monotonically increasing sequence number
            AtomicLong seqCounter = docSequences.computeIfAbsent(docId, k -> new AtomicLong(0));
            long assignedSeq = seqCounter.incrementAndGet();
            op.setSequenceNumber(assignedSeq);
            if (op.getTimestamp() == null) {
                op.setTimestamp(Instant.now().toEpochMilli());
            }

            // 3. Conflict Resolution & Line State Management
            Map<String, DocLineStateDto> lines = docLines.computeIfAbsent(docId, k -> new ConcurrentHashMap<>());
            List<String> lineOrder = docLineOrder.computeIfAbsent(docId, k -> Collections.synchronizedList(new ArrayList<>()));
            String lineId = op.getLineId();
            String type = op.getType() != null ? op.getType().toUpperCase() : "EDIT";

            DocLineStateDto currentLine = lines.get(lineId);

            if ("DELETE".equals(type)) {
                // DELETE: Mark tombstone with deletedAtSequence
                op.setDeletedAtSequence(assignedSeq);
                if (currentLine != null) {
                    currentLine.setDeleted(true);
                    currentLine.setDeletedAtSequence(assignedSeq);
                    currentLine.setLastSequence(assignedSeq);
                    currentLine.setLastEditedAt(op.getTimestamp());
                } else {
                    DocLineStateDto tombstone = DocLineStateDto.builder()
                            .lineId(lineId)
                            .content(null)
                            .authorId(op.getAuthorId())
                            .authorName(op.getAuthorName())
                            .lastSequence(assignedSeq)
                            .deleted(true)
                            .deletedAtSequence(assignedSeq)
                            .lastEditedAt(op.getTimestamp())
                            .build();
                    lines.put(lineId, tombstone);
                    if (!lineOrder.contains(lineId)) {
                        lineOrder.add(lineId);
                    }
                }
                log.debug("[DocSequencer] 🗑️ Tombstoned lineId={} at sequence={} for docId={}", lineId, assignedSeq, docId);
            } else {
                // ADD or EDIT operation
                if (currentLine == null) {
                    // New line insertion
                    DocLineStateDto newLine = DocLineStateDto.builder()
                            .lineId(lineId)
                            .content(op.getContent())
                            .authorId(op.getAuthorId())
                            .authorName(op.getAuthorName())
                            .lastSequence(assignedSeq)
                            .deleted(false)
                            .deletedAtSequence(null)
                            .lastEditedAt(op.getTimestamp())
                            .build();
                    lines.put(lineId, newLine);
                    if (!lineOrder.contains(lineId)) {
                        lineOrder.add(lineId);
                    }
                    log.debug("[DocSequencer] ➕ Added lineId={} at sequence={} for docId={}", lineId, assignedSeq, docId);
                } else {
                    // Line exists — check tombstone and sequence rules
                    if (currentLine.isDeleted()) {
                        Long deletedAtSeq = currentLine.getDeletedAtSequence();
                        if (deletedAtSeq != null && assignedSeq > deletedAtSeq) {
                            // EDIT sequence > DELETE sequence: un-tombstone (recreate) line
                            currentLine.setDeleted(false);
                            currentLine.setDeletedAtSequence(null);
                            currentLine.setContent(op.getContent());
                            currentLine.setAuthorId(op.getAuthorId());
                            currentLine.setAuthorName(op.getAuthorName());
                            currentLine.setLastSequence(assignedSeq);
                            currentLine.setLastEditedAt(op.getTimestamp());
                            log.debug("[DocSequencer] ♻️ Un-tombstoned lineId={} at sequence={} > deleteSeq={} for docId={}",
                                    lineId, assignedSeq, deletedAtSeq, docId);
                        } else {
                            // EDIT sequence < DELETE sequence: delete wins (line stays deleted)
                            log.debug("[DocSequencer] 🛑 Discarded EDIT for tombstoned lineId={} because editSeq={} < deleteSeq={}",
                                    lineId, assignedSeq, deletedAtSeq);
                        }
                    } else {
                        // Concurrent EDITs on active line: Last-Sequence-Wins
                        currentLine.setContent(op.getContent());
                        currentLine.setAuthorId(op.getAuthorId());
                        currentLine.setAuthorName(op.getAuthorName());
                        currentLine.setLastSequence(assignedSeq);
                        currentLine.setLastEditedAt(op.getTimestamp());
                        log.debug("[DocSequencer] ✏️ Applied EDIT on lineId={} at sequence={} for docId={}", lineId, assignedSeq, docId);
                    }
                }
            }

            // 4. Store in history & mark opId as seen
            seenOps.put(op.getOpId(), op);
            docOperationHistory.computeIfAbsent(docId, k -> Collections.synchronizedList(new ArrayList<>())).add(op);

            return op;
        }
    }

    /**
     * Retrieves full document state including active and tombstoned lines + latestSequenceNumber.
     */
    public DocStateDto getDocumentState(String docId) {
        if (docId == null) return null;
        synchronized (getDocLock(docId)) {
            AtomicLong seqCounter = docSequences.get(docId);
            long latestSeq = seqCounter != null ? seqCounter.get() : 0L;

            List<String> order = docLineOrder.getOrDefault(docId, Collections.emptyList());
            Map<String, DocLineStateDto> map = docLines.getOrDefault(docId, Collections.emptyMap());

            List<DocLineStateDto> lineList = new ArrayList<>();
            for (String lid : order) {
                DocLineStateDto state = map.get(lid);
                if (state != null) {
                    lineList.add(DocLineStateDto.builder()
                            .lineId(state.getLineId())
                            .content(state.getContent())
                            .authorId(state.getAuthorId())
                            .authorName(state.getAuthorName())
                            .lastSequence(state.getLastSequence())
                            .deleted(state.isDeleted())
                            .deletedAtSequence(state.getDeletedAtSequence())
                            .lastEditedAt(state.getLastEditedAt())
                            .build());
                }
            }

            return DocStateDto.builder()
                    .docId(docId)
                    .latestSequenceNumber(latestSeq)
                    .lines(lineList)
                    .timestamp(Instant.now().toEpochMilli())
                    .build();
        }
    }

    /**
     * Retrieves incremental operations since a given sequence number.
     */
    public List<DocOperationDto> getOperationsSince(String docId, long sinceSeq) {
        if (docId == null) return Collections.emptyList();
        synchronized (getDocLock(docId)) {
            List<DocOperationDto> history = docOperationHistory.getOrDefault(docId, Collections.emptyList());
            return history.stream()
                    .filter(op -> op.getSequenceNumber() != null && op.getSequenceNumber() > sinceSeq)
                    .collect(Collectors.toList());
        }
    }

    /**
     * Resets document state (useful for tests or purges).
     */
    public void resetDocument(String docId) {
        if (docId == null) return;
        synchronized (getDocLock(docId)) {
            docSequences.remove(docId);
            docOperationHistory.remove(docId);
            processedOps.remove(docId);
            docLineOrder.remove(docId);
            docLines.remove(docId);
        }
    }
}
