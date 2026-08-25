package com.code.acklet.tool.airvault.model;

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
public class AirVaultClipMessage {
    private String id;
    private String content;
    private String contentType; // 'plain-text' | 'url' | 'code' | 'rich-text'
    private String language;
    private String contentHash;
    private int charCount;
    private String originDeviceId;
    private String originDeviceName;
    private String originDeviceType;
    private boolean isPinned;
    private boolean isTargetedOnly;
    private List<String> targetDeviceIds;
    private String deliveryStatus;
    private List<String> deliveredDeviceIds;
    private Instant createdAt;
}
