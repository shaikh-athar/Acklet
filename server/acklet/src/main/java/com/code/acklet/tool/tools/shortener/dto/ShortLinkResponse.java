package com.code.acklet.tool.tools.shortener.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"targetUrl", "fallbackUrl", "ownerToken"})
public class ShortLinkResponse {

    private String code;
    private String shortUrl;
    private String previewUrl;
    private String targetUrl;
    private String fallbackUrl;
    private String ownerToken;
    private String label;
    private List<String> tags;
    private Instant createdAt;
    private Instant startDate;
    private Instant expiresAt;
    private Long clicks;
    private Long maxClicks;
    private Boolean isOneTime;
    private Boolean isDeactivated;
    private Boolean hasPassword;
    private Instant lastOpenedAt;
    private String status;
    private java.util.Map<String, String> utmParams;
}
