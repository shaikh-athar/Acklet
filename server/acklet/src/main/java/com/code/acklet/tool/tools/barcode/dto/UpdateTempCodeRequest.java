package com.code.acklet.tool.tools.barcode.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTempCodeRequest {

    /**
     * "extend", "expireNow", or "rename"
     */
    @NotBlank(message = "Action is required")
    private String action;

    private Long extensionSeconds;

    private Instant newExpiresAt;

    private String name;
}

