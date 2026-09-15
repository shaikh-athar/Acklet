package com.code.acklet.airvault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UpdateDeviceRequest {

    @NotBlank(message = "Device name cannot be blank")
    @Size(max = 120)
    private String name;
}
