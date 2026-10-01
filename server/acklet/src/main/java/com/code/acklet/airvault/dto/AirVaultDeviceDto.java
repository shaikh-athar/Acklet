package com.code.acklet.airvault.dto;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AirVaultDeviceDto {
    private UUID id;
    private String clientDeviceId;
    private String name;
    private String username;
    private String deviceKeyword;
    private String type;
    private String os;
    private String browser;
    private String thumbprint;
    private String ipHint;
    private String status;
    private Boolean syncEnabled;
    private String accentColor;
    private Instant lastActiveAt;
    private boolean isCurrent;
}
