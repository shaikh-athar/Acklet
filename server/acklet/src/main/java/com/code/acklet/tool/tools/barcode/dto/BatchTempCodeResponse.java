package com.code.acklet.tool.tools.barcode.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchTempCodeResponse {

    private UUID batchId;
    private List<TempCodeResponse> items;
    private int totalCount;
    private Instant expiresAt;
    private String ownerToken;
}

