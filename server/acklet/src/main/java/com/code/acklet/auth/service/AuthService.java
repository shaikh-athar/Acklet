package com.code.acklet.auth.service;

import com.code.acklet.auth.dto.*;
import com.code.acklet.auth.entity.OneTimePassword;
import com.code.acklet.auth.entity.RefreshToken;
import com.code.acklet.auth.event.EmailVerifiedEvent;
import com.code.acklet.auth.event.UserRegisteredEvent;
import com.code.acklet.auth.repository.OneTimePasswordRepository;
import com.code.acklet.auth.repository.RefreshTokenRepository;
import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ConflictException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.shared.exception.UnauthorizedException;
import com.code.acklet.shared.security.JwtTokenProvider;
import com.code.acklet.user.dto.UserProfileResponse;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.entity.UserProfile;
import com.code.acklet.user.mapper.UserMapper;
import com.code.acklet.user.repository.UserProfileRepository;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Random;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OneTimePasswordRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;
    private final ApplicationEventPublisher eventPublisher;

    private final Random random = new Random();

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("User with this email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .status(User.UserStatus.PENDING)
                .role(User.Role.USER)
                .build();

        user = userRepository.save(user);

        UserProfile profile = UserProfile.builder()
                .id(user.getId())
                .user(user)
                .displayName(request.getDisplayName() != null ? request.getDisplayName() : request.getEmail().split("@")[0])
                .preferences(new HashMap<>())
                .notificationSettings(new HashMap<>())
                .build();
        userProfileRepository.save(profile);
        user.setProfile(profile);

        String otpCode = generateAndSaveOtp(user.getEmail(), OneTimePassword.OtpType.EMAIL_VERIFICATION);

        eventPublisher.publishEvent(new UserRegisteredEvent(this, user, otpCode));

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = createAndSaveRefreshToken(user);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .profile(userMapper.toProfileResponse(user))
                .build();
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid username or password");
        }

        if (user.getStatus() == User.UserStatus.SUSPENDED) {
            throw new UnauthorizedException("Your account has been suspended");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = createAndSaveRefreshToken(user);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .profile(userMapper.toProfileResponse(user))
                .build();
    }

    @Transactional
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        RefreshToken token = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (token.isRevoked() || token.isExpired()) {
            throw new UnauthorizedException("Refresh token is expired or revoked");
        }

        User user = token.getUser();
        String newAccessToken = jwtTokenProvider.generateAccessToken(user);
        
        // Rotate refresh token
        token.setRevoked(true);
        refreshTokenRepository.save(token);

        String newRefreshToken = createAndSaveRefreshToken(user);

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }

    @Transactional
    public void verifyEmail(VerifyEmailRequest request) {
        OneTimePassword otp = otpRepository.findByEmailAndCodeAndTypeAndVerifiedFalse(
                request.getEmail(), request.getCode(), OneTimePassword.OtpType.EMAIL_VERIFICATION
        ).orElseThrow(() -> new BadRequestException("Invalid or expired verification code"));

        if (otp.isExpired()) {
            throw new BadRequestException("Verification code has expired");
        }

        otp.setVerified(true);
        otpRepository.save(otp);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setStatus(User.UserStatus.ACTIVE);
        userRepository.save(user);

        eventPublisher.publishEvent(new EmailVerifiedEvent(this, user));
    }

    @Transactional
    public void resendOtp(ResendOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getStatus() == User.UserStatus.ACTIVE) {
            throw new BadRequestException("Email is already verified");
        }

        String otpCode = generateAndSaveOtp(user.getEmail(), OneTimePassword.OtpType.EMAIL_VERIFICATION);
        eventPublisher.publishEvent(new UserRegisteredEvent(this, user, otpCode));
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String otpCode = generateAndSaveOtp(user.getEmail(), OneTimePassword.OtpType.PASSWORD_RESET);
        log.info("Password reset OTP generated for {}: {}", user.getEmail(), otpCode);
        // In real system, publish a ResetPasswordRequestEvent to send an email. For foundation we log it.
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        OneTimePassword otp = otpRepository.findByEmailAndCodeAndTypeAndVerifiedFalse(
                request.getEmail(), request.getCode(), OneTimePassword.OtpType.PASSWORD_RESET
        ).orElseThrow(() -> new BadRequestException("Invalid or expired reset code"));

        if (otp.isExpired()) {
            throw new BadRequestException("Reset code has expired");
        }

        otp.setVerified(true);
        otpRepository.save(otp);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        refreshTokenRepository.findByToken(refreshTokenStr).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    private String generateAndSaveOtp(String email, OneTimePassword.OtpType type) {
        String code = String.format("%06d", random.nextInt(999999));
        OneTimePassword otp = OneTimePassword.builder()
                .email(email)
                .code(code)
                .type(type)
                .expiryDate(Instant.now().plus(15, ChronoUnit.MINUTES))
                .verified(false)
                .build();
        otpRepository.save(otp);
        return code;
    }

    private String createAndSaveRefreshToken(User user) {
        String tokenStr = UUID.randomUUID().toString();
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(tokenStr)
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);
        return tokenStr;
    }
}
