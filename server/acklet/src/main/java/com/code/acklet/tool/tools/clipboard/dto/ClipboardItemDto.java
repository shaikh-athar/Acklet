package com.code.acklet.tool.tools.clipboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClipboardItemDto {
    private String id;
    private String shareCode;
    private String itemType; // TEXT, LINK, IMAGE, FILE
    private String textContent;
    private String originalName;
    private long sizeBytes;
    private String detectedMime;
    private String createdAt;
    private String previewUrl;
    private String downloadUrl;
    @Builder.Default
    private int downloadCount = 0;
    @Builder.Default
    private int viewCount = 0;
    @Builder.Default
    private Boolean isEncrypted = false;
}
