package com.code.acklet.tool.tools.qr.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrLinkLookupItem {

    @NotBlank
    private String code;

    @NotBlank
    private String token;
}
