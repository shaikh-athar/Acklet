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
public class CreateDynamicQrRequest {

    private String type;

    @Size(max = 255)
    private String title;

    private String targetUrl;

    private String contentJson;

    @Size(max = 100)
    private String password;

    @Size(min = 3, max = 32)
    private String customSlug;

    private Instant expiresAt;
}
