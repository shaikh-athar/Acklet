package com.code.acklet.tool.tools.barcode.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TempCodeVerifyResponse {

    private String status; // "VALID", "EXPIRED", "DEACTIVATED", "NOT_FOUND"
    private Instant expiresAt;
    private Long remainingSeconds;
    private String payloadMode;
    private String contentType; // Only present when VALID
    private String content;     // Only present when VALID
    private String reference;   // Only present when VALID
    private String barcodeFormat;
    private String name;
    private Boolean reported;
}

