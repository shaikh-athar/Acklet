package com.code.acklet.user.service;

import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.entity.UserProfile;
import com.code.acklet.user.repository.UserProfileRepository;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));
    }

    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    @Transactional
    public User updateUserProfile(UUID userId, String displayName, String avatarUrl) {
        User user = getUserById(userId);
        UserProfile profile = user.getProfile();
        if (profile == null) {
            profile = UserProfile.builder().user(user).id(userId).build();
        }
        profile.setDisplayName(displayName);
        profile.setAvatarUrl(avatarUrl);
        userProfileRepository.save(profile);
        user.setProfile(profile);
        return user;
    }

    @Transactional
    public User updateUserPreferences(UUID userId, Map<String, Object> preferences) {
        User user = getUserById(userId);
        UserProfile profile = user.getProfile();
        if (profile == null) {
            profile = UserProfile.builder().user(user).id(userId).build();
        }
        profile.setPreferences(preferences);
        profile.setOnboardingCompleted(true); // Mark onboarding done once preferences are saved
        userProfileRepository.save(profile);
        user.setProfile(profile);
        return user;
    }

    @Transactional
    public User updateNotificationSettings(UUID userId, Map<String, Object> settings) {
        User user = getUserById(userId);
        UserProfile profile = user.getProfile();
        if (profile == null) {
            profile = UserProfile.builder().user(user).id(userId).build();
        }
        profile.setNotificationSettings(settings);
        userProfileRepository.save(profile);
        user.setProfile(profile);
        return user;
    }
}
