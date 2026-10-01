package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.config.AirVaultRabbitMqConfig;
import com.code.acklet.airvault.dto.DocOperationDto;
import com.code.acklet.airvault.dto.DocStateDto;
import com.code.acklet.airvault.service.AirVaultDocSequencerService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/airvault/sync/doc")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AirVault Document Operation Sync", description = "Operation-based collaborative sync with server-assigned monotonic sequencing and tombstone conflict resolution")
public class AirVaultDocSyncController {

    private final AirVaultDocSequencerService sequencerService;
    private final RabbitTemplate rabbitTemplate;

    @PostMapping("/op")
    @Operation(summary = "Submit discrete document operation", description = "Sequences, deduplicates, and resolves conflicts on line-level operations")
    public ResponseEntity<ApiResponse<DocOperationDto>> submitOperation(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DocOperationDto operation
    ) {
        log.debug("[DocSync API] 📤 Submitting operation: opId={}, docId={}, type={}, lineId={}",
                operation.getOpId(), operation.getDocId(), operation.getType(), operation.getLineId());

        // Process directly via sequencer for immediate synchronous confirmation
        DocOperationDto sequenced = sequencerService.processOperation(operation);

        // Also publish to RabbitMQ exchange for durable queuing and downstream broadcast
        try {
            rabbitTemplate.convertAndSend(
                    AirVaultRabbitMqConfig.AIRVAULT_DOC_OPS_EXCHANGE,
                    AirVaultRabbitMqConfig.ROUTING_KEY_DOC_OP,
                    sequenced
            );
        } catch (Exception ex) {
            log.debug("[DocSync API] ⚠️ RabbitMQ publish failed, handled in-memory: {}", ex.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.success(sequenced, "Operation processed and sequenced"));
    }

    @GetMapping("/{docId}/state")
    @Operation(summary = "Get full document state", description = "Returns active lines, tombstones, and latest sequence number for initial load or gap recovery")
    public ResponseEntity<ApiResponse<DocStateDto>> getDocumentState(
            @AuthenticationPrincipal User user,
            @PathVariable String docId
    ) {
        DocStateDto state = sequencerService.getDocumentState(docId);
        if (state == null) {
            state = DocStateDto.builder()
                    .docId(docId)
                    .latestSequenceNumber(0L)
                    .lines(List.of())
                    .timestamp(System.currentTimeMillis())
                    .build();
        }
        return ResponseEntity.ok(ApiResponse.success(state, "Document state retrieved"));
    }

    @GetMapping("/{docId}/ops")
    @Operation(summary = "Get incremental operations", description = "Retrieves discrete operations that occurred after the specified sequence number")
    public ResponseEntity<ApiResponse<List<DocOperationDto>>> getOperationsSince(
            @AuthenticationPrincipal User user,
            @PathVariable String docId,
            @RequestParam(defaultValue = "0") long sinceSeq
    ) {
        List<DocOperationDto> ops = sequencerService.getOperationsSince(docId, sinceSeq);
        return ResponseEntity.ok(ApiResponse.success(ops, "Incremental operations retrieved"));
    }
}
