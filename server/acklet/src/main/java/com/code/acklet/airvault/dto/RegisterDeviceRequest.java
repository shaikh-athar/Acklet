package com.code.acklet.airvault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RegisterDeviceRequest {

    @NotBlank(message = "clientDeviceId is required")
    @Size(max = 100)
    private String clientDeviceId;

    @NotBlank(message = "deviceName is required")
    @Size(max = 120)
    private String deviceName;

    @Size(max = 60)
    private String username;

    @Size(max = 60)
    private String deviceKeyword;

    @NotBlank(message = "deviceType is required")
    @Size(max = 50)
    private String deviceType;

    @Size(max = 80)
    private String os;

    @Size(max = 80)
    private String browser;

    @Size(max = 100)
    private String thumbprint;

    @Size(max = 80)
    private String ipHint;
}
