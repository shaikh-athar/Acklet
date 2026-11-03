package com.code.acklet.tool.tools.shortener.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortLinkPreviewResponse {

    private String code;
    private String domain;
    private String scheme;
    private Instant createdAt;
    private String status;
    private Boolean hasPassword;
}
