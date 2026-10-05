package com.code.acklet.airvault.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Discrete operation for operation-based collaborative document sync")
public class DocOperationDto {

    @NotBlank(message = "opId is required for idempotency deduplication")
    @Schema(description = "Client-generated UUID for idempotency", example = "550e8400-e29b-41d4-a716-446655440000")
    private String opId;

    @NotBlank(message = "docId is required")
    @Schema(description = "Shared document or pairing-group ID", example = "shared-doc-1")
    private String docId;

    @Schema(description = "Server-assigned monotonically increasing sequence number", example = "101")
    private Long sequenceNumber;

    @NotBlank(message = "type is required (ADD, EDIT, DELETE)")
    @Schema(description = "Operation type: ADD | EDIT | DELETE", example = "EDIT")
    private String type;

    @NotBlank(message = "lineId is required")
    @Schema(description = "Stable line identifier UUID", example = "line-1")
    private String lineId;

    @Schema(description = "Author device or user identifier", example = "dev-k9asf08a")
    private String authorId;

    @Schema(description = "Author display username", example = "@alice")
    private String authorName;

    @Schema(description = "Line content (null for DELETE operations)", example = "const x = 42;")
    private String content;

    @Schema(description = "Client generation timestamp in Unix milliseconds", example = "1725700000000")
    private Long timestamp;

    @Schema(description = "Sequence number when line was tombstoned (for DELETE)", example = "98")
    private Long deletedAtSequence;
}
