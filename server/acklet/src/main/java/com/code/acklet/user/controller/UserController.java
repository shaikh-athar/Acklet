package com.code.acklet.user.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.dto.UpdateNotificationSettingsRequest;
import com.code.acklet.user.dto.UpdatePreferencesRequest;
import com.code.acklet.user.dto.UpdateProfileRequest;
import com.code.acklet.user.dto.UserProfileResponse;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.mapper.UserMapper;
import com.code.acklet.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Endpoints for fetching and managing user profiles and preferences")
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Retrieves profile and setting details of the authenticated user")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser(@AuthenticationPrincipal User currentUser) {
        UserProfileResponse response = userMapper.toProfileResponse(currentUser);
        return ResponseEntity.ok(ApiResponse.success(response, "Profile retrieved successfully"));
    }

    @PutMapping("/me/profile")
    @Operation(summary = "Update user profile", description = "Updates display name and avatar URL of the authenticated user")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        User updated = userService.updateUserProfile(currentUser.getId(), request.getDisplayName(), request.getAvatarUrl());
        UserProfileResponse response = userMapper.toProfileResponse(updated);
        return ResponseEntity.ok(ApiResponse.success(response, "Profile updated successfully"));
    }

    @PutMapping("/me/preferences")
    @Operation(summary = "Update user preferences", description = "Updates UI and workspace preferences (e.g., theme, keybindings)")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updatePreferences(
            @AuthenticationPrincipal User currentUser,
            @RequestBody UpdatePreferencesRequest request
    ) {
        User updated = userService.updateUserPreferences(currentUser.getId(), request.getPreferences());
        UserProfileResponse response = userMapper.toProfileResponse(updated);
        return ResponseEntity.ok(ApiResponse.success(response, "Preferences updated successfully"));
    }

    @PutMapping("/me/notifications")
    @Operation(summary = "Update user notification settings", description = "Updates system notification preferences")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateNotifications(
            @AuthenticationPrincipal User currentUser,
            @RequestBody UpdateNotificationSettingsRequest request
    ) {
        User updated = userService.updateNotificationSettings(currentUser.getId(), request.getNotificationSettings());
        UserProfileResponse response = userMapper.toProfileResponse(updated);
        return ResponseEntity.ok(ApiResponse.success(response, "Notification settings updated successfully"));
    }
}
