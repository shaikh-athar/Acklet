package com.code.acklet.tool.tools.shortener.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortLinkAvailabilityResponse {

    private String code;
    private boolean available;
    private String reason;
}
