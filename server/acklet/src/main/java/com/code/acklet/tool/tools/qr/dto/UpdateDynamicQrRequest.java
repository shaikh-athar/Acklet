package com.code.acklet.tool.tools.qr.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDynamicQrRequest {

    @Size(max = 255)
    private String title;

    private String targetUrl;

    private String contentJson;

    private String status;

    private Instant expiresAt;

    @Size(max = 100)
    private String newPassword;

    private Boolean removePassword;
}
