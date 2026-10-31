package com.code.acklet.tool.tools.shortener.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"passwordHash", "targetUrl"})
public class ShortLinkMigrateItem {

    private String code;
    private String targetUrl;
    private String domain;
    private String label;
    private Long createdAt;
    private Long expiresAt;
    private Long startDate;
    private Long clicks;
    private Long maxClicks;
    private Boolean isOneTime;
    private Boolean isDeactivated;
    private Boolean hasPassword;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String passwordHash;
}
