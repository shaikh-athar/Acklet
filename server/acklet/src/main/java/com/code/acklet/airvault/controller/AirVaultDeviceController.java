package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.dto.AirVaultDeviceDto;
import com.code.acklet.airvault.dto.RegisterDeviceRequest;
import com.code.acklet.airvault.service.AirVaultDeviceService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/airvault/devices")
@RequiredArgsConstructor
@Tag(name = "AirVault Devices", description = "Device registration, listing, heartbeat, and revocation")
public class AirVaultDeviceController {

    private final AirVaultDeviceService deviceService;

    private UUID resolveUserId(User user) {
        return user != null ? user.getId() : UUID.fromString("00000000-0000-0000-0000-000000000001");
    }

    @GetMapping
    @Operation(summary = "List registered devices", description = "Returns all non-revoked devices for the authenticated user")
    public ResponseEntity<ApiResponse<List<AirVaultDeviceDto>>> listDevices(@AuthenticationPrincipal User user) {
        List<AirVaultDeviceDto> devices = deviceService.getDevices(resolveUserId(user));
        return ResponseEntity.ok(ApiResponse.success(devices, "Devices retrieved"));
    }

    @PostMapping("/register")
    @Operation(summary = "Register or re-activate a device", description = "Idempotent: creates a new device record or re-activates an existing one")
    public ResponseEntity<ApiResponse<AirVaultDeviceDto>> register(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody RegisterDeviceRequest request) {
        AirVaultDeviceDto dto = deviceService.registerDevice(resolveUserId(user), request);
        return ResponseEntity.ok(ApiResponse.success(dto, "Device registered"));
    }

    @PostMapping("/{clientDeviceId}/heartbeat")
    @Operation(summary = "Device heartbeat", description = "Updates lastActiveAt for presence tracking")
    public ResponseEntity<ApiResponse<Void>> heartbeat(
            @AuthenticationPrincipal User user,
            @PathVariable String clientDeviceId) {
        deviceService.heartbeat(resolveUserId(user), clientDeviceId);
        return ResponseEntity.ok(ApiResponse.success(null, "Heartbeat recorded"));
    }

    @PatchMapping("/{clientDeviceId}/rename")
    @Operation(summary = "Rename device", description = "Updates the friendly display name of a registered device")
    public ResponseEntity<ApiResponse<AirVaultDeviceDto>> rename(
            @AuthenticationPrincipal User user,
            @PathVariable String clientDeviceId,
            @Valid @RequestBody com.code.acklet.airvault.dto.UpdateDeviceRequest request) {
        AirVaultDeviceDto dto = deviceService.renameDevice(resolveUserId(user), clientDeviceId, request.getName());
        return ResponseEntity.ok(ApiResponse.success(dto, "Device renamed successfully"));
    }

    @PatchMapping("/{clientDeviceId}/sync-permission")
    @Operation(summary = "Update device sync permission", description = "Enables or disables clipboard sync for a specific registered device")
    public ResponseEntity<ApiResponse<AirVaultDeviceDto>> updateSyncPermission(
            @AuthenticationPrincipal User user,
            @PathVariable String clientDeviceId,
            @RequestParam boolean enabled) {
        AirVaultDeviceDto dto = deviceService.updateSyncPermission(resolveUserId(user), clientDeviceId, enabled);
        return ResponseEntity.ok(ApiResponse.success(dto, "Device sync permission updated"));
    }

    @DeleteMapping("/{clientDeviceId}")
    @Operation(summary = "Revoke device", description = "Marks the device as revoked so it can no longer participate in sync")
    public ResponseEntity<ApiResponse<Void>> revoke(
            @AuthenticationPrincipal User user,
            @PathVariable String clientDeviceId) {
        deviceService.revokeDevice(resolveUserId(user), clientDeviceId);
        return ResponseEntity.ok(ApiResponse.success(null, "Device revoked"));
    }

    @GetMapping("/{clientDeviceId}/presence")
    @Operation(summary = "Get device presence", description = "Returns the real-time online/offline status for a device based on Redis heartbeat TTL")
    public java.util.concurrent.CompletableFuture<ResponseEntity<ApiResponse<Map<String, Object>>>> getPresence(
            @AuthenticationPrincipal User user,
            @PathVariable String clientDeviceId) {
        return java.util.concurrent.CompletableFuture.supplyAsync(
                () -> ResponseEntity.ok(ApiResponse.success(deviceService.getDevicePresence(clientDeviceId), "Presence retrieved"))
        );
    }

    @PostMapping("/presence/batch")
    @Operation(summary = "Get batch device presence", description = "Returns the real-time online/offline status for multiple devices based on Redis heartbeat TTL")
    public java.util.concurrent.CompletableFuture<ResponseEntity<ApiResponse<Map<String, Map<String, Object>>>>> getBatchPresence(
            @AuthenticationPrincipal User user,
            @RequestBody List<String> clientDeviceIds) {
        return java.util.concurrent.CompletableFuture.supplyAsync(
                () -> ResponseEntity.ok(ApiResponse.success(deviceService.getMultipleDevicePresence(clientDeviceIds), "Batch presence retrieved"))
        );
    }

    @PostMapping("/{clientDeviceId}/offline")
    @Operation(summary = "Record device offline", description = "Called by sendBeacon on browser close to immediately mark device offline")
    public ResponseEntity<ApiResponse<Void>> recordOffline(
            @AuthenticationPrincipal User user,
            @PathVariable String clientDeviceId) {
        deviceService.recordDeviceOffline(resolveUserId(user), clientDeviceId);
        return ResponseEntity.ok(ApiResponse.success(null, "Device marked offline"));
    }
}
