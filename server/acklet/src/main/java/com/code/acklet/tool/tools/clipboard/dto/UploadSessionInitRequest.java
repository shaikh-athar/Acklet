package com.code.acklet.tool.tools.clipboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadSessionInitRequest {
    private String fileName;
    private long totalSize;
    private int chunkSize;
    private int totalChunks;
    @Builder.Default
    private Boolean isImage = false;
    @Builder.Default
    private Boolean isEncrypted = false;
    private String fileHash;
}
