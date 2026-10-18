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
public class UploadSessionResponse {
    private String uploadId;
    private String shareCode;
    private String fileName;
    private long totalSize;
    private int chunkSize;
    private int totalChunks;
    @Builder.Default
    private List<Integer> uploadedChunks = new ArrayList<>();
    @Builder.Default
    private Boolean isComplete = false;
    private String expiresAt;
}
