package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.config.AirVaultLimitsProperties;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/airvault/config")
@RequiredArgsConstructor
@Tag(name = "AirVault Configuration", description = "Authoritative configuration and system limits")
public class AirVaultConfigController {

    private final AirVaultLimitsProperties limitsProperties;

    @Data
    @Builder
    public static class AirVaultLimitsDto {
        private long maxFileBytes;
        private long maxClipboardBytes;
        private long maxAccountBytes;
        private int trashRetentionDays;
        private int defaultClipboardRetentionDays;
        private int maxClipboardsPerUser;
        private long perGuestLinkDailyWriteBytes;
        private int perGuestLinkDailyItemCount;
    }

    @GetMapping("/limits")
    @Operation(summary = "Get Authoritative System Limits", description = "Returns system storage caps, file limits, retention defaults, and guest quotas")
    public ResponseEntity<ApiResponse<AirVaultLimitsDto>> getLimits() {
        AirVaultLimitsDto dto = AirVaultLimitsDto.builder()
                .maxFileBytes(limitsProperties.getMaxFileBytes())
                .maxClipboardBytes(limitsProperties.getMaxClipboardBytes())
                .maxAccountBytes(limitsProperties.getMaxAccountBytes())
                .trashRetentionDays(limitsProperties.getTrashRetentionDays())
                .defaultClipboardRetentionDays(limitsProperties.getDefaultClipboardRetentionDays())
                .maxClipboardsPerUser(limitsProperties.getMaxClipboardsPerUser())
                .perGuestLinkDailyWriteBytes(limitsProperties.getPerGuestLinkDailyWriteBytes())
                .perGuestLinkDailyItemCount(limitsProperties.getPerGuestLinkDailyItemCount())
                .build();
        return ResponseEntity.ok(ApiResponse.success(dto, "Limits configuration retrieved"));
    }
}
