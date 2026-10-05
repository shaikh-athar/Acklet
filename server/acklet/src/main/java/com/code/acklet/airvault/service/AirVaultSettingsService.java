package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultSettingsDtos.*;
import com.code.acklet.airvault.entity.AirVaultIdentity;
import com.code.acklet.airvault.entity.AirVaultUserSettings;
import com.code.acklet.airvault.repository.AirVaultIdentityRepository;
import com.code.acklet.airvault.repository.AirVaultUserSettingsRepository;
import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultSettingsService {

    private final AirVaultUserSettingsRepository settingsRepository;
    private final AirVaultIdentityRepository identityRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public UserSettingsDto getSettings(AirVaultPrincipal principal) {
        if (principal == null || principal.getUsername() == null || principal.getUsername().isBlank()) {
            return UserSettingsDto.builder()
                    .username("guest")
                    .version(1L)
                    .settings(Collections.emptyMap())
                    .updatedAt(Instant.now())
                    .build();
        }

        String username = principal.getUsername().trim().toLowerCase().replace("@", "");
        AirVaultIdentity identity = identityRepository.findByUsernameIgnoreCase(username)
                .orElse(null);

        if (identity == null) {
            return UserSettingsDto.builder()
                    .username(username)
                    .version(1L)
                    .settings(Collections.emptyMap())
                    .updatedAt(Instant.now())
                    .build();
        }

        AirVaultUserSettings userSettings = settingsRepository.findByIdentityId(identity.getId())
                .orElseGet(() -> {
                    AirVaultUserSettings newSettings = AirVaultUserSettings.builder()
                            .identityId(identity.getId())
                            .username(username)
                            .version(1L)
                            .settingsJson("{}")
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    return settingsRepository.save(newSettings);
                });

        Map<String, Object> settingsMap = parseJson(userSettings.getSettingsJson());

        return UserSettingsDto.builder()
                .username(username)
                .version(userSettings.getVersion())
                .settings(settingsMap)
                .updatedAt(userSettings.getUpdatedAt())
                .build();
    }

    @Transactional
    public UserSettingsDto updateSettings(UpdateSettingsRequest request, AirVaultPrincipal principal) {
        if (principal == null || principal.getUsername() == null || principal.getUsername().isBlank()) {
            throw new SecurityException("Authenticated user session required to save cross-device settings");
        }

        String username = principal.getUsername().trim().toLowerCase().replace("@", "");
        AirVaultIdentity identity = identityRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new IllegalArgumentException("User identity not found: @" + username));

        AirVaultUserSettings userSettings = settingsRepository.findByIdentityId(identity.getId())
                .orElseGet(() -> AirVaultUserSettings.builder()
                        .identityId(identity.getId())
                        .username(username)
                        .version(0L)
                        .settingsJson("{}")
                        .createdAt(Instant.now())
                        .build());

        long nextVersion = (userSettings.getVersion() != null ? userSettings.getVersion() : 0L) + 1L;
        if (request.getVersion() != null && request.getVersion() >= nextVersion) {
            nextVersion = request.getVersion() + 1L;
        }

        Map<String, Object> newSettings = request.getSettings() != null ? request.getSettings() : new HashMap<>();
        String jsonStr;
        try {
            jsonStr = objectMapper.writeValueAsString(newSettings);
        } catch (Exception e) {
            jsonStr = "{}";
        }

        userSettings.setVersion(nextVersion);
        userSettings.setSettingsJson(jsonStr);
        userSettings.setUpdatedAt(Instant.now());
        userSettings = settingsRepository.save(userSettings);

        log.info("[AirVault Settings] ⚙️ Updated cross-device settings for user=@{}, version={}", username, nextVersion);

        return UserSettingsDto.builder()
                .username(username)
                .version(userSettings.getVersion())
                .settings(newSettings)
                .updatedAt(userSettings.getUpdatedAt())
                .build();
    }

    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("[AirVault Settings] Failed to parse settings JSON: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
