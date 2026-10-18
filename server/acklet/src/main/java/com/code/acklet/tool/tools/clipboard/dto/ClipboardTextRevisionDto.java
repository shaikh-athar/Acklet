package com.code.acklet.tool.tools.clipboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClipboardTextRevisionDto {
    private String id;
    private String shareCode;
    private Long version;
    private String textContent;
    private Boolean isEncrypted;
    private String createdAt;
    private Boolean isCurrent;
}
