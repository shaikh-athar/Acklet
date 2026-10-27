package com.code.acklet.tool.tools.qr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrLinkStatsDto {

    private String code;
    private Long scanCount;
    private Instant lastScanAt;
    private String status;
    private Instant expiresAt;
    private String preview;
    private String payload;
    private String type;
    private Long contentBytes;
}
