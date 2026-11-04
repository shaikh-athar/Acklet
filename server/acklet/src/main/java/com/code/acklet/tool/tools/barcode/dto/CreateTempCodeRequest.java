package com.code.acklet.tool.tools.barcode.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTempCodeRequest {

    @Size(max = 100, message = "Name cannot exceed 100 characters")
    private String name;

    @Builder.Default
    private String payloadMode = "LINK"; // "LINK" or "CODE"

    @NotBlank(message = "Content type is required")
    private String contentType; // "MESSAGE", "LINK", "REFERENCE_ONLY"

    private String content;

    @Size(max = 64, message = "Reference text cannot exceed 64 characters")
    private String reference;

    @NotBlank(message = "Barcode format is required")
    private String barcodeFormat; // "qrcode", "datamatrix", "aztec", "pdf417", "code128"

    private Instant expiresAt;

    private Long durationSeconds;

    @Builder.Default
    private Boolean showExpiryOnLabel = false;
}

