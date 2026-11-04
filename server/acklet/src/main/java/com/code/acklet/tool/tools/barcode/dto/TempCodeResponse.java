package com.code.acklet.tool.tools.barcode.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TempCodeResponse {

    private UUID id;
    private UUID batchId;
    private String name;
    private String token;
    private String tokenHash;
    private String verifyUrl;
    private String payload;
    private String payloadMode;
    private String contentType;
    private String content;
    private String reference;
    private String barcodeFormat;
    private Boolean showExpiryOnLabel;
    private Instant createdAt;
    private Instant expiresAt;
    private String status; // "ACTIVE", "EXPIRING_SOON", "EXPIRED", "DEACTIVATED"
    private Long remainingSeconds;
    private Long checkCount;
    private Instant lastCheckedAt;
    private String ownerToken;
}

