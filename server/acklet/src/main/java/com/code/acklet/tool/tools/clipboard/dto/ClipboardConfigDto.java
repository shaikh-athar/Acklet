package com.code.acklet.tool.tools.clipboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClipboardConfigDto {
    private int codeLength;
    private int maxCodeLength;
    private long maxFileSizeBytes;
    private long maxTextSizeBytes;
    private int maxItemsPerType;
    private long maxTotalShareSizeBytes;
    private int retentionDays;
    private long chunkSize;
}
