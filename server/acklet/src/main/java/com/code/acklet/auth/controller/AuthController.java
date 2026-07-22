package com.code.acklet.auth.controller;

import com.code.acklet.auth.dto.*;
import com.code.acklet.auth.service.AuthService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication Gateway", description = "Endpoints for Google OAuth logins, token rotation, and sign out")
public class AuthController {

    private final AuthService authService;

    @org.springframework.web.bind.annotation.GetMapping("/google/authorize")
    @Operation(summary = "Initiate PKCE Authorization Flow", description = "Generates a PKCE code_verifier, state, and Google OAuth 2.0 authorization URL")
    public ResponseEntity<ApiResponse<OAuthPkceState>> getGoogleAuthUrl(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String redirectUri) {
        OAuthPkceState response = authService.generatePkceAuthUrl(redirectUri);
        return ResponseEntity.ok(ApiResponse.success(response, "PKCE Authorization state generated"));
    }

    @PostMapping("/google/code")
    @Operation(summary = "Exchange Google Authorization Code with PKCE", description = "Exchanges authorization code + code_verifier for ID token and issues application JWT session")
    public ResponseEntity<ApiResponse<LoginResponse>> exchangeGoogleCode(@Valid @RequestBody GoogleCodeExchangeRequest request) {
        LoginResponse response = authService.exchangeGoogleCode(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Code exchange successful"));
    }

    @PostMapping("/google")
    @Operation(summary = "Authenticate via Google ID Token", description = "Verifies the Google ID token and issues local JWT access and refresh tokens")
    public ResponseEntity<ApiResponse<LoginResponse>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        LoginResponse response = authService.loginWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate authentication tokens", description = "Rotates an active, unrevoked refresh token to issue a new JWT access/refresh pair")
    public ResponseEntity<ApiResponse<TokenRefreshResponse>> refresh(@Valid @RequestBody TokenRefreshRequest request) {
        TokenRefreshResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Tokens rotated successfully"));
    }

    @PostMapping("/logout")
    @Operation(summary = "Invalidate user session", description = "Revokes the active refresh token to end the session")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody TokenRefreshRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(null, "Logged out successfully"));
    }
}
