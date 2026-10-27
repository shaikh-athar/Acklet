package com.code.acklet.tool.tools.qr.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QrLinkResponse {

    private String code;
    private String shortUrl;
    private String manageToken;
    private Instant expiresAt;
    private String status;
    private String type;
    private Long contentBytes;
}
