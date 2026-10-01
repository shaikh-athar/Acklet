package com.code.acklet.airvault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

public class AirVaultAuthDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GuestAuthResponse {
        private String username;
        private String pin;
        private String sessionToken;
        private String clientDeviceId;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class VerifyPinRequest {
        @NotBlank(message = "username is required")
        private String username;

        @NotBlank(message = "pin is required")
        @Pattern(regexp = "^\\d{4,12}$", message = "PIN must be between 4 and 12 digits")
        private String pin;

        @NotBlank(message = "clientDeviceId is required")
        private String clientDeviceId;

        private String deviceName;
        private String deviceType;
        private String os;
        private String browser;
        private String thumbprint;
        private String ipHint;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CustomizeIdentityRequest {
        @NotBlank(message = "username is required")
        @Size(min = 3, max = 30)
        @Pattern(regexp = "^[a-z0-9_.-]+$", message = "Username must contain only lowercase letters, numbers, hyphens, underscores, or dots")
        private String username;

        @NotBlank(message = "pin is required")
        @Pattern(regexp = "^\\d{6,12}$", message = "PIN must be at least 6 digits (6-12 digits)")
        private String pin;

        @NotBlank(message = "clientDeviceId is required")
        private String clientDeviceId;

        private String deviceName;
        private String deviceType;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthResponse {
        private String username;
        private String sessionToken;
        private String clientDeviceId;
        private boolean isCustomized;
        private String targetDeviceId;
        private String targetDeviceName;
        private String targetDeviceType;
        private String targetThumbprint;
        private String pairingId;
        private String pairingState;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QrPairingInitResponse {
        private String qrToken;
        private long expiresInSeconds;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QrPairingConfirmRequest {
        @NotBlank(message = "qrToken is required")
        private String qrToken;

        @NotBlank(message = "clientDeviceId is required")
        private String clientDeviceId;

        @NotBlank(message = "deviceName is required")
        private String deviceName;

        @NotBlank(message = "deviceType is required")
        private String deviceType;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UsernameAvailabilityResponse {
        private String username;
        private boolean available;
        private String message;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReconcilePairingResponse {
        private boolean isPaired;
        private String selfUsername;
        private String pairedUsername;
        private String pairedDeviceId;
        private String pairedDeviceName;
        private String pairedDeviceType;
        private String pairedThumbprint;
        private String pairingId;
        private String pairingState;
    }
}
