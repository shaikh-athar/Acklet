package com.code.acklet.auth.service;

import com.code.acklet.config.properties.AppProperties;
import com.code.acklet.auth.dto.GoogleCodeExchangeRequest;
import com.code.acklet.auth.dto.GoogleLoginRequest;
import com.code.acklet.auth.dto.LoginResponse;
import com.code.acklet.auth.dto.OAuthPkceState;
import com.code.acklet.auth.dto.TokenRefreshRequest;
import com.code.acklet.auth.dto.TokenRefreshResponse;
import com.code.acklet.auth.entity.RefreshToken;
import com.code.acklet.auth.repository.RefreshTokenRepository;
import com.code.acklet.shared.exception.UnauthorizedException;
import com.code.acklet.shared.security.JwtTokenProvider;
import com.code.acklet.shared.security.TokenBlacklistService;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.entity.UserProfile;
import com.code.acklet.user.mapper.UserMapper;
import com.code.acklet.user.repository.UserProfileRepository;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;
    private final AppProperties appProperties;
    private final AuditLogService auditLogService;
    private final TokenBlacklistService tokenBlacklistService;

    private String getGoogleClientId() {
        return appProperties.getSecurity().getGoogle().getClientId();
    }

    private String getGoogleClientSecret() {
        return appProperties.getSecurity().getGoogle().getClientSecret();
    }

    /**
     * Generates a cryptographically secure PKCE pair (code_verifier + S256 code_challenge)
     * and constructs the Google OAuth 2.0 authorization URL.
     */
    public OAuthPkceState generatePkceAuthUrl(String redirectUri) {
        String effectiveRedirectUri = (redirectUri != null && !redirectUri.isBlank()) 
                ? redirectUri 
                : "http://localhost:4200/auth/callback";

        // 1. Generate code_verifier (high-entropy random string)
        byte[] randomBytes = new byte[48];
        new SecureRandom().nextBytes(randomBytes);
        String codeVerifier = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        // 2. Derive S256 code_challenge
        String codeChallenge;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            codeChallenge = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            log.error("[OAuth PKCE] Error generating SHA-256 code_challenge", e);
            throw new RuntimeException("Crypto error during PKCE generation", e);
        }

        // 3. Generate state token for CSRF protection
        String state = UUID.randomUUID().toString();

        // 4. Construct authorization URL
        String authUrl = String.format(
                "https://accounts.google.com/o/oauth2/v2/auth?" +
                "response_type=code&" +
                "client_id=%s&" +
                "redirect_uri=%s&" +
                "scope=openid%%20profile%%20email&" +
                "state=%s&" +
                "code_challenge=%s&" +
                "code_challenge_method=S256&" +
                "prompt=select_account",
                getGoogleClientId(),
                effectiveRedirectUri,
                state,
                codeChallenge
        );

        log.info("[OAuth PKCE] Generated PKCE state and Auth URL for client callback: {}", effectiveRedirectUri);
        return OAuthPkceState.builder()
                .authUrl(authUrl)
                .state(state)
                .codeVerifier(codeVerifier)
                .codeChallenge(codeChallenge)
                .build();
    }

    /**
     * Exchanges Google OAuth authorization code + PKCE code_verifier for an ID token via back-channel REST request.
     */
    @Transactional
    public LoginResponse exchangeGoogleCode(GoogleCodeExchangeRequest request) {
        log.info("[OAuth PKCE] Exchanging authorization code with Google token endpoint...");
        String effectiveRedirectUri = (request.getRedirectUri() != null && !request.getRedirectUri().isBlank()) 
                ? request.getRedirectUri() 
                : "postmessage";

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code", request.getCode());
        if (request.getCodeVerifier() != null && !request.getCodeVerifier().isBlank()) {
            body.add("code_verifier", request.getCodeVerifier());
        }
        body.add("client_id", getGoogleClientId());
        if (getGoogleClientSecret() != null && !getGoogleClientSecret().isBlank()) {
            body.add("client_secret", getGoogleClientSecret());
        }
        body.add("redirect_uri", effectiveRedirectUri);
        body.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> httpEntity = new HttpEntity<>(body, headers);
        Map<?, ?> tokenResponse;
        try {
            log.info("[OAuth PKCE] Sending token exchange request to https://oauth2.googleapis.com/token");
            tokenResponse = restTemplate.postForObject("https://oauth2.googleapis.com/token", httpEntity, Map.class);
        } catch (Exception e) {
            log.error("[OAuth PKCE] Error exchanging authorization code for tokens with Google", e);
            throw new UnauthorizedException("Google authorization code exchange failed");
        }

        if (tokenResponse == null || !tokenResponse.containsKey("id_token")) {
            log.error("[OAuth PKCE] Token response from Google missing id_token: {}", tokenResponse);
            throw new UnauthorizedException("Google response did not contain a valid ID Token");
        }

        String idToken = (String) tokenResponse.get("id_token");
        log.info("[OAuth PKCE] Code exchange successful. ID token received, proceeding with claims validation...");
        return loginWithGoogle(GoogleLoginRequest.builder().credential(idToken).build());
    }

    @Transactional
    public LoginResponse loginWithGoogle(GoogleLoginRequest request) {
        log.info("[OAuth Server] Received request to authenticate via Google OAuth. ID Token length: {}", 
                request.getCredential() != null ? request.getCredential().length() : 0);

        String tokeninfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.getCredential();
        RestTemplate restTemplate = new RestTemplate();
        Map<?, ?> response;
        try {
            log.info("[OAuth Server] Calling Google tokeninfo API to verify credential: {}", tokeninfoUrl.split("id_token=")[0] + "id_token=***");
            response = restTemplate.getForObject(tokeninfoUrl, Map.class);
        } catch (Exception e) {
            log.error("[OAuth Server] Error calling Google tokeninfo verification API", e);
            throw new UnauthorizedException("Invalid Google ID Token");
        }

        if (response == null || response.containsKey("error")) {
            log.error("[OAuth Server] Google tokeninfo verification failed. Response: {}", response);
            throw new UnauthorizedException("Invalid Google ID Token");
        }

        log.info("[OAuth Server] Google tokeninfo verified signature. Parsing claims...");

        // Verify issuer
        String iss = (String) response.get("iss");
        log.info("[OAuth Server] Verifying token issuer (iss): {}", iss);
        if (iss == null || (!iss.equals("https://accounts.google.com") && !iss.equals("accounts.google.com"))) {
            log.error("[OAuth Server] Token issuer validation failed: {}", iss);
            throw new UnauthorizedException("Invalid issuer on Google ID Token");
        }

        // Verify audience if configured
        String aud = (String) response.get("aud");
        log.info("[OAuth Server] Verifying token audience (aud): {}", aud);
        String configuredClientId = getGoogleClientId();
        if (configuredClientId != null && !configuredClientId.isBlank() && !configuredClientId.equals(aud)) {
            log.error("[OAuth Server] Audience mismatch. Configured: {}, Token: {}", configuredClientId, aud);
            throw new UnauthorizedException("Audience mismatch on Google ID Token");
        }

        String googleId = (String) response.get("sub");
        String email = (String) response.get("email");
        String name = (String) response.get("name");
        String picture = (String) response.get("picture");

        log.info("[OAuth Server] Token claims parsed: email={}, googleId (sub)={}, name={}", email, googleId, name);

        if (email == null || googleId == null) {
            log.error("[OAuth Server] Missing required claims in ID token.");
            throw new UnauthorizedException("Required email/sub claims are missing from Google ID Token");
        }

        // Look up user by googleId, or fallback to email (if previously registered)
        log.info("[OAuth Server] Querying database for user with email: {}", email);
        Optional<User> userOpt = userRepository.findByEmail(email);
        User user;
        boolean isNew = false;

        if (userOpt.isEmpty()) {
            log.info("[OAuth Server] User not found. Proceeding with new user auto-registration...");
            isNew = true;
            user = User.builder()
                    .email(email)
                    .googleId(googleId)
                    .provider("GOOGLE")
                    .status(User.UserStatus.ACTIVE)
                    .role(User.Role.USER)
                    .lastLoginAt(Instant.now())
                    .build();

            UserProfile profile = UserProfile.builder()
                    .user(user)
                    .displayName(name != null ? name : email.split("@")[0])
                    .avatarUrl(picture)
                    .preferences(new HashMap<>())
                    .notificationSettings(new HashMap<>())
                    .build();

            user.setProfile(profile);
            user = userRepository.save(user);
            log.info("[OAuth Server] New user successfully registered and saved: {}", email);
        } else {
            user = userOpt.get();
            log.info("[OAuth Server] User found in database. User ID: {}, existing googleId: {}", user.getId(), user.getGoogleId());
            user.setLastLoginAt(Instant.now());
            if (user.getGoogleId() == null) {
                log.info("[OAuth Server] Linking Google ID to existing credentials-based user account: {}", googleId);
                user.setGoogleId(googleId);
                user.setProvider("GOOGLE");
            }
            if (user.getStatus() == User.UserStatus.SUSPENDED) {
                log.warn("[OAuth Server] Attempted login for suspended user: {}", email);
                throw new UnauthorizedException("Your account has been suspended");
            }
            
            UserProfile profile = user.getProfile();
            if (profile == null) {
                profile = UserProfile.builder().user(user).id(user.getId()).build();
            }
            if (name != null) profile.setDisplayName(name);
            if (picture != null) profile.setAvatarUrl(picture);
            userProfileRepository.save(profile);
            user = userRepository.save(user);
            log.info("[OAuth Server] Updated login session timestamp and profile details for: {}", email);
        }

        log.info("[OAuth Server] Generating local JWT access and refresh tokens for user session...");
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = createAndSaveRefreshToken(user, null, null, null);

        // Determine if user needs onboarding: new user OR existing user who hasn't completed it
        UserProfile finalProfile = user.getProfile();
        boolean needsOnboarding = isNew || (finalProfile != null && !finalProfile.isOnboardingCompleted());
        log.info("[OAuth Server] Authentication flow successfully completed for: {}. needsOnboarding={}", email, needsOnboarding);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .isNewUser(needsOnboarding)
                .profile(userMapper.toProfileResponse(user))
                .build();
    }

    @Transactional
    public LoginResponse authenticateWithDevice(GoogleLoginRequest request, String userAgent, String ipAddress) {
        LoginResponse response = loginWithGoogle(request);
        User user = userRepository.findByEmail(response.getProfile().getEmail()).orElseThrow();
        String newRefreshToken = createAndSaveRefreshToken(user, null, userAgent, ipAddress);
        response.setRefreshToken(newRefreshToken);

        auditLogService.logEvent("LOGIN_SUCCESS", user.getId(), user.getEmail(), ipAddress, userAgent, null, "User authenticated via Google OAuth 2.0 PKCE");
        return response;
    }

    @Transactional
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request, String userAgent, String ipAddress) {
        String rawToken = request.getRefreshToken();
        if (rawToken == null || rawToken.isBlank()) {
            throw new UnauthorizedException("Refresh token required");
        }

        String hash = com.code.acklet.shared.security.CryptoUtils.hashSha256(rawToken);
        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByTokenHash(hash);

        if (tokenOpt.isEmpty()) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        RefreshToken token = tokenOpt.get();

        // Check for REUSE ATTACK: if token is already revoked, revoke ENTIRE family
        if (token.isRevoked()) {
            log.warn("[Security Alert] Refresh token reuse detected! Revoking family {}", token.getFamilyId());
            refreshTokenRepository.revokeFamily(token.getFamilyId());
            auditLogService.logEvent("TOKEN_REUSE_ALERT", token.getUser().getId(), token.getUser().getEmail(), ipAddress, userAgent, null, "Refresh token reuse detected! Revoked token family: " + token.getFamilyId());
            throw new UnauthorizedException("Security Alert: Token reuse detected. All sessions in this family revoked.");
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            throw new UnauthorizedException("Refresh token has expired. Please sign in again.");
        }

        User user = token.getUser();
        String newAccessToken = jwtTokenProvider.generateAccessToken(user);

        // Rotate token: revoke old token and create new token keeping SAME familyId
        token.setRevoked(true);
        refreshTokenRepository.save(token);

        String newRefreshToken = createAndSaveRefreshToken(user, token.getFamilyId(), userAgent, ipAddress);
        auditLogService.logEvent("TOKEN_REFRESH", user.getId(), user.getEmail(), ipAddress, userAgent, null, "Tokens rotated successfully");

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String hash = com.code.acklet.shared.security.CryptoUtils.hashSha256(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
                auditLogService.logEvent("LOGOUT", token.getUser().getId(), token.getUser().getEmail(), token.getIpAddress(), token.getDeviceName(), null, "User session logged out");
            });
        }
    }

    @Transactional(readOnly = true)
    public java.util.List<com.code.acklet.auth.dto.SessionInfoResponse> getUserSessions(User currentUser, String currentRawToken) {
        String currentHash = currentRawToken != null ? com.code.acklet.shared.security.CryptoUtils.hashSha256(currentRawToken) : "";
        
        return refreshTokenRepository.findAllByUserIdAndIsRevokedFalse(currentUser.getId()).stream()
                .map(t -> com.code.acklet.auth.dto.SessionInfoResponse.builder()
                        .id(t.getId())
                        .deviceName(t.getDeviceName() != null ? t.getDeviceName() : "Web Browser")
                        .ipAddress(t.getIpAddress() != null ? t.getIpAddress() : "127.0.0.1")
                        .location(t.getLocation() != null ? t.getLocation() : "Localhost")
                        .lastUsedAt(t.getLastUsedAt())
                        .createdAt(t.getCreatedAt())
                        .isCurrentSession(t.getTokenHash().equals(currentHash))
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void revokeSession(UUID sessionId, User currentUser) {
        RefreshToken token = refreshTokenRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        if (!token.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Cannot revoke another user's session");
        }
        token.setRevoked(true);
        refreshTokenRepository.save(token);
    }

    @Transactional
    public void revokeAllSessions(User currentUser, String currentRawToken) {
        if (currentRawToken != null && !currentRawToken.isBlank()) {
            String currentHash = com.code.acklet.shared.security.CryptoUtils.hashSha256(currentRawToken);
            Optional<RefreshToken> currentOpt = refreshTokenRepository.findByTokenHash(currentHash);
            if (currentOpt.isPresent()) {
                refreshTokenRepository.revokeAllUserTokensExcept(currentUser.getId(), currentOpt.get().getId());
                return;
            }
        }
        refreshTokenRepository.revokeAllUserTokens(currentUser.getId());
    }

    public String createAndSaveRefreshToken(User user, UUID familyId, String userAgent, String ipAddress) {
        String rawTokenStr = UUID.randomUUID().toString() + "." + UUID.randomUUID().toString();
        String hash = com.code.acklet.shared.security.CryptoUtils.hashSha256(rawTokenStr);
        
        UUID effectiveFamilyId = familyId != null ? familyId : UUID.randomUUID();
        String parsedDevice = parseUserAgent(userAgent);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(hash)
                .familyId(effectiveFamilyId)
                .deviceName(parsedDevice)
                .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                .location("Local Dev")
                .isRevoked(false)
                .expiresAt(Instant.now().plus(7, java.time.temporal.ChronoUnit.DAYS))
                .lastUsedAt(Instant.now())
                .build();

        refreshTokenRepository.save(refreshToken);
        return rawTokenStr;
    }

    private String parseUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return "Unknown Device";
        if (userAgent.contains("Chrome")) return "Chrome on " + getOs(userAgent);
        if (userAgent.contains("Firefox")) return "Firefox on " + getOs(userAgent);
        if (userAgent.contains("Safari")) return "Safari on " + getOs(userAgent);
        if (userAgent.contains("Edge")) return "Edge on " + getOs(userAgent);
        return "Browser on " + getOs(userAgent);
    }

    private String getOs(String ua) {
        if (ua.contains("Windows")) return "Windows";
        if (ua.contains("Mac")) return "macOS";
        if (ua.contains("Linux")) return "Linux";
        if (ua.contains("Android")) return "Android";
        if (ua.contains("iPhone") || ua.contains("iPad")) return "iOS";
        return "Desktop";
    }
}
