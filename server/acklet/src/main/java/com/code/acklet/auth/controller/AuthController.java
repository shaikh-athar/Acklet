package com.code.acklet.auth.controller;

import com.code.acklet.auth.dto.*;
import com.code.acklet.auth.service.AuthService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication Gateway", description = "Endpoints for Google OAuth logins, token rotation, and sign out")
public class AuthController {

    private final AuthService authService;

    @GetMapping("/google/authorize")
    @Operation(summary = "Initiate PKCE Authorization Flow", description = "Generates a PKCE code_verifier, state, and Google OAuth 2.0 authorization URL")
    public ResponseEntity<ApiResponse<OAuthPkceState>> getGoogleAuthUrl(
            @RequestParam(required = false) String redirectUri) {
        OAuthPkceState response = authService.generatePkceAuthUrl(redirectUri);
        return ResponseEntity.ok(ApiResponse.success(response, "PKCE Authorization state generated"));
    }

    @PostMapping("/google/code")
    @Operation(summary = "Exchange Google Authorization Code with PKCE", description = "Exchanges authorization code + code_verifier for ID token and issues application JWT session")
    public ResponseEntity<ApiResponse<LoginResponse>> exchangeGoogleCode(
            @Valid @RequestBody GoogleCodeExchangeRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse response) {
        LoginResponse loginResp = authService.exchangeGoogleCode(request);
        setRefreshTokenCookie(response, loginResp.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(loginResp, "Code exchange successful"));
    }

    @PostMapping("/google")
    @Operation(summary = "Authenticate via Google ID Token", description = "Verifies the Google ID token and issues local JWT access and refresh tokens")
    public ResponseEntity<ApiResponse<LoginResponse>> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse response) {
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = servletRequest.getRemoteAddr();
        LoginResponse loginResp = authService.authenticateWithDevice(request, userAgent, ipAddress);
        setRefreshTokenCookie(response, loginResp.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(loginResp, "Login successful"));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate authentication tokens", description = "Rotates an active, unrevoked refresh token to issue a new JWT access/refresh pair")
    public ResponseEntity<ApiResponse<TokenRefreshResponse>> refresh(
            @RequestBody(required = false) TokenRefreshRequest request,
            @CookieValue(name = "acklet_refresh_token", required = false) String cookieRefreshToken,
            HttpServletRequest servletRequest,
            HttpServletResponse response) {
        String refreshTokenToUse = (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank())
                ? request.getRefreshToken()
                : cookieRefreshToken;

        if (refreshTokenToUse == null || refreshTokenToUse.isBlank()) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Missing refresh token"));
        }

        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = servletRequest.getRemoteAddr();
        TokenRefreshResponse refreshResp = authService.refreshToken(new TokenRefreshRequest(refreshTokenToUse), userAgent, ipAddress);
        setRefreshTokenCookie(response, refreshResp.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(refreshResp, "Tokens rotated successfully"));
    }

    @PostMapping("/logout")
    @Operation(summary = "Invalidate user session", description = "Revokes the active refresh token to end the session")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) TokenRefreshRequest request,
            @CookieValue(name = "acklet_refresh_token", required = false) String cookieRefreshToken,
            HttpServletResponse response) {
        String tokenToRevoke = (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank())
                ? request.getRefreshToken()
                : cookieRefreshToken;
        
        authService.logout(tokenToRevoke);
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok(ApiResponse.success(null, "Logged out successfully"));
    }

    @GetMapping("/sessions")
    @Operation(summary = "List active user sessions", description = "Returns active device sessions for current authenticated user")
    public ResponseEntity<ApiResponse<List<SessionInfoResponse>>> getSessions(
            @AuthenticationPrincipal User currentUser,
            @CookieValue(name = "acklet_refresh_token", required = false) String cookieToken) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Unauthorized access"));
        }
        List<SessionInfoResponse> sessions = authService.getUserSessions(currentUser, cookieToken);
        return ResponseEntity.ok(ApiResponse.success(sessions, "Active sessions retrieved"));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Revoke single session", description = "Invalidates a specific device session by ID")
    public ResponseEntity<ApiResponse<Void>> revokeSession(
            @PathVariable UUID sessionId,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Unauthorized access"));
        }
        authService.revokeSession(sessionId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(null, "Session revoked"));
    }

    @PostMapping("/sessions/revoke-all")
    @Operation(summary = "Sign out all devices", description = "Revokes all active sessions for current user except current device")
    public ResponseEntity<ApiResponse<Void>> revokeAllSessions(
            @AuthenticationPrincipal User currentUser,
            @CookieValue(name = "acklet_refresh_token", required = false) String cookieToken) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Unauthorized access"));
        }
        authService.revokeAllSessions(currentUser, cookieToken);
        return ResponseEntity.ok(ApiResponse.success(null, "All other sessions revoked"));
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        if (refreshToken == null) return;
        ResponseCookie cookie = ResponseCookie.from("acklet_refresh_token", refreshToken)
                .httpOnly(true)
                .secure(false) // Set to true in production HTTPS
                .path("/api/v1/auth")
                .maxAge(7 * 24 * 60 * 60)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("acklet_refresh_token", "")
                .httpOnly(true)
                .secure(false)
                .path("/api/v1/auth")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
