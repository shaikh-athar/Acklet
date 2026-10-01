package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.dto.AirVaultSettingsDtos.*;
import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.code.acklet.airvault.service.AirVaultSettingsService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/airvault/settings")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AirVault User Settings", description = "Endpoints for cross-device synchronized user settings (versioned JSON per identity)")
public class AirVaultSettingsController {

    private final AirVaultSettingsService settingsService;

    private AirVaultPrincipal getPrincipal() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AirVaultPrincipal principal) {
            return principal;
        }
        return null;
    }

    @GetMapping
    @Operation(summary = "Get User Settings", description = "Retrieves current versioned cross-device user settings for the authenticated identity")
    public ResponseEntity<ApiResponse<UserSettingsDto>> getSettings() {
        UserSettingsDto settings = settingsService.getSettings(getPrincipal());
        return ResponseEntity.ok(ApiResponse.success(settings, "User settings retrieved successfully"));
    }

    @PutMapping
    @Operation(summary = "Update User Settings", description = "Updates versioned cross-device user settings for the authenticated identity")
    public ResponseEntity<ApiResponse<UserSettingsDto>> updateSettings(
            @RequestBody UpdateSettingsRequest request) {
        try {
            UserSettingsDto updated = settingsService.updateSettings(request, getPrincipal());
            return ResponseEntity.ok(ApiResponse.success(updated, "User settings updated successfully"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(ex.getMessage(), "401"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }
}
