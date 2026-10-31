package com.code.acklet.tool.tools.shortener.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class UpdateShortLinkRequest {

    @Size(max = 2048, message = "URL cannot exceed 2048 characters")
    private String targetUrl;

    @Size(max = 2048, message = "Fallback URL cannot exceed 2048 characters")
    private String fallbackUrl;

    @Size(max = 255, message = "Label cannot exceed 255 characters")
    private String label;

    private List<String> tags;

    private Long maxClicks;

    private Instant expiresAt;

    private Instant startDate;

    private Boolean isDeactivated;

    /**
     * If provided, changes the password. If set to "__REMOVE__", removes the password.
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    private java.util.Map<String, String> utmParams;
}
