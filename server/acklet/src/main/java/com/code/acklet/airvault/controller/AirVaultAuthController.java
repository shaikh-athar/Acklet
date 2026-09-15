package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.dto.AirVaultAuthDtos.*;
import com.code.acklet.airvault.service.AirVaultAuthService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/airvault/auth")
@RequiredArgsConstructor
@Tag(name = "AirVault Authentication & QR Pairing", description = "Endpoints for guest identity generation, rate-limited PIN verification, identity customization, QR login, and full account erasure")
public class AirVaultAuthController {

    private final AirVaultAuthService authService;

    private String resolveClientIp(HttpServletRequest request) {
        String xForwarded = request.getHeader("X-Forwarded-For");
        if (xForwarded != null && !xForwarded.isBlank()) {
            return xForwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }

    @PostMapping("/guest")
    @Operation(summary = "Auto-generate Guest Identity", description = "Generates a unique adjective-noun-4digit username and random 4-digit PIN on first access")
    public ResponseEntity<ApiResponse<GuestAuthResponse>> autoGenerateGuest(
            @RequestParam String clientDeviceId,
            HttpServletRequest request) {
        GuestAuthResponse res = authService.autoGenerateGuest(clientDeviceId, resolveClientIp(request));
        return ResponseEntity.ok(ApiResponse.success(res, "Guest identity created"));
    }

    @PostMapping("/verify-pin")
    @Operation(summary = "Verify 4-digit PIN", description = "Verifies hashed PIN with Redis rate limiting (max 5 failed attempts per 15 min)")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyPin(
            @Valid @RequestBody VerifyPinRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse res = authService.verifyPin(request, resolveClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success(res, "Authenticated successfully"));
    }

    @PostMapping("/existing")
    @Operation(summary = "Login with Existing Identity", description = "Logs into an existing identity using username and PIN, attaching this device to that identity")
    public ResponseEntity<ApiResponse<AuthResponse>> loginExisting(
            @Valid @RequestBody VerifyPinRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse res = authService.loginExistingIdentity(request, resolveClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success(res, "Logged in to existing identity successfully"));
    }

    @PostMapping("/customize")
    @Operation(summary = "Customize Username and PIN", description = "Permanently reserves a customized username, updates hashed PIN, and invalidates old sessions")
    public ResponseEntity<ApiResponse<AuthResponse>> customize(
            @Valid @RequestBody CustomizeIdentityRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse res = authService.customizeIdentity(request, resolveClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success(res, "Identity customized and reserved"));
    }

    @PostMapping("/qr/init")
    @Operation(summary = "Generate Short-Lived QR Pairing Token", description = "Generates single-use 60-120s pairing token encoded in QR code")
    public ResponseEntity<ApiResponse<QrPairingInitResponse>> initQr(
            @RequestParam String username,
            @RequestParam String clientDeviceId) {
        QrPairingInitResponse res = authService.generateQrPairingToken(username, clientDeviceId);
        return ResponseEntity.ok(ApiResponse.success(res, "QR pairing token generated"));
    }

    @PostMapping("/qr/confirm")
    @Operation(summary = "Confirm QR Login", description = "Consumes pairing token and issues session token to new device")
    public ResponseEntity<ApiResponse<AuthResponse>> confirmQr(
            @Valid @RequestBody QrPairingConfirmRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse res = authService.confirmQrPairing(request, resolveClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success(res, "QR pairing verified and session established"));
    }

    @GetMapping("/check-username")
    @Operation(summary = "Check Username Availability", description = "Live Instagram-style check if a chosen username is available or taken")
    public ResponseEntity<ApiResponse<UsernameAvailabilityResponse>> checkUsername(
            @RequestParam String username) {
        UsernameAvailabilityResponse res = authService.checkUsernameAvailability(username);
        return ResponseEntity.ok(ApiResponse.success(res, "Username availability checked"));
    }

    @GetMapping("/reconcile")
    @Operation(summary = "Reconcile Pairing State", description = "Fetches current paired peer state directly from database for calling device")
    public ResponseEntity<ApiResponse<ReconcilePairingResponse>> reconcilePairing(
            @RequestParam String clientDeviceId) {
        ReconcilePairingResponse res = authService.reconcilePairing(clientDeviceId);
        return ResponseEntity.ok(ApiResponse.success(res, "Pairing state reconciled"));
    }

    @PostMapping("/erase-everything")
    @Operation(summary = "Erase Everything", description = "Permanently deletes user identity, invalidates sessions, and unpairs/revokes all linked devices")
    public ResponseEntity<ApiResponse<Void>> eraseEverything(
            @RequestParam String clientDeviceId,
            @RequestParam(required = false) String username) {
        authService.eraseEverything(clientDeviceId, username);
        return ResponseEntity.ok(ApiResponse.success(null, "AirVault identity and all linked data erased successfully"));
    }
}
