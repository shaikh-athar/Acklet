package com.code.acklet.airvault.dto;

import lombok.*;

import java.time.Instant;
import java.util.Map;

public class AirVaultSettingsDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSettingsDto {
        private String username;
        private Long version;
        private Map<String, Object> settings;
        private Instant updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateSettingsRequest {
        private Long version;
        private Map<String, Object> settings;
    }
}
