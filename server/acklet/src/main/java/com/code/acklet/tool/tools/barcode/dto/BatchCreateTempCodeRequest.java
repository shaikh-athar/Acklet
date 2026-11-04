package com.code.acklet.tool.tools.barcode.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCreateTempCodeRequest {

    @NotEmpty(message = "Batch items cannot be empty")
    @Valid
    private List<BatchItemRequest> items;

    @Size(max = 128, message = "Idempotency key cannot exceed 128 characters")
    private String idempotencyKey;

    @Builder.Default
    private String payloadMode = "LINK"; // "LINK" or "CODE"

    @Builder.Default
    private String contentType = "MESSAGE"; // "MESSAGE", "REFERENCE_ONLY"

    @Builder.Default
    private String barcodeFormat = "qrcode"; // "qrcode", "datamatrix", "aztec", "pdf417", "code128"

    private Instant expiresAt;

    private Long durationSeconds;

    @Builder.Default
    private Boolean showExpiryOnLabel = false;
}

