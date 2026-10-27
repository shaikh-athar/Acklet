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
public class QrLinkSummaryDto {

    private String code;
    private String shortUrl;
    private String type;
    private String preview;
    private Long scanCount;
    private Instant createdAt;
    private Instant expiresAt;
    private Instant lastScanAt;
    private String status;
    private Long contentBytes;
    private String mime;
}
