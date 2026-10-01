package com.code.acklet.airvault.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Full document state snapshot for initial load and gap resync")
public class DocStateDto {

    @Schema(description = "Document ID", example = "shared-doc-1")
    private String docId;

    @Schema(description = "Latest server-assigned sequence number", example = "105")
    private Long latestSequenceNumber;

    @Schema(description = "Ordered list of document lines (active and tombstoned)")
    private List<DocLineStateDto> lines;

    @Schema(description = "Server snapshot timestamp in Unix milliseconds", example = "1725700000000")
    private Long timestamp;
}
