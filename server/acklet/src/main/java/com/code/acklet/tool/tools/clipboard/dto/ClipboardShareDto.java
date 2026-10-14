package com.code.acklet.tool.tools.clipboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClipboardShareDto {
    private String code;
    private String wordCode;
    private String ownerToken;
    private String createdAt;
    private String expiresAt;
    private Boolean burnAfterReading;
    private Boolean liveMode;
    private Boolean hasPin;
    @Builder.Default
    private List<ClipboardItemDto> items = new ArrayList<>();
    @Builder.Default
    private int textCount = 0;
    @Builder.Default
    private int imageCount = 0;
    @Builder.Default
    private int fileCount = 0;
    @Builder.Default
    private long totalSizeBytes = 0;
}
