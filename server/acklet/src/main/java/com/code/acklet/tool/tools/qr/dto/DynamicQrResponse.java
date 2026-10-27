package com.code.acklet.tool.tools.qr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DynamicQrResponse {

    private String code;
    private String type;
    private String title;
    private String shortUrl;
    private String targetUrl;
    private String contentJson;
    private boolean hasPassword;
    private String status;
    private long scanCount;
    private long uniqueScanCount;
    private Instant expiresAt;
    private Instant createdAt;
    private Instant updatedAt;
    private String manageKey;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetSummary {
        private String id;
        private String fileName;
        private String detectedMime;
        private long sizeBytes;
        private String downloadUrl;
        private Instant createdAt;
    }

    private List<AssetSummary> assets;
}
