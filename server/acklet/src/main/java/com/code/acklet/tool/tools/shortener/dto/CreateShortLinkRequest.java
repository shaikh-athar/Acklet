package com.code.acklet.tool.tools.shortener.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"password", "targetUrl", "fallbackUrl"})
public class CreateShortLinkRequest {

    @NotBlank(message = "Destination URL is required")
    @Size(max = 2048, message = "URL cannot exceed 2048 characters")
    private String targetUrl;

    @Size(min = 3, max = 30, message = "Custom alias must be between 3 and 30 characters")
    private String customAlias;

    @Size(max = 2048, message = "Fallback URL cannot exceed 2048 characters")
    private String fallbackUrl;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Size(min = 6, max = 128, message = "Password must be at least 6 characters")
    private String password;

    @Size(max = 255, message = "Label cannot exceed 255 characters")
    private String label;

    private List<String> tags;

    private Long maxClicks;

    private Boolean isOneTime;

    private Instant startDate;

    private Instant expiresAt;

    private java.util.Map<String, String> utmParams;
}
