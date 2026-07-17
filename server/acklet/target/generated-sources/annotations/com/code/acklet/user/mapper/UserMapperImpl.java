package com.code.acklet.user.mapper;

import com.code.acklet.user.dto.UserProfileResponse;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.entity.UserProfile;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-07-16T20:03:51+0530",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.9 (Oracle Corporation)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserProfileResponse toProfileResponse(User user) {
        if ( user == null ) {
            return null;
        }

        UserProfileResponse.UserProfileResponseBuilder userProfileResponse = UserProfileResponse.builder();

        userProfileResponse.email( user.getEmail() );
        userProfileResponse.displayName( userProfileDisplayName( user ) );
        userProfileResponse.avatarUrl( userProfileAvatarUrl( user ) );
        Map<String, Object> preferences = userProfilePreferences( user );
        Map<String, Object> map = preferences;
        if ( map != null ) {
            userProfileResponse.preferences( new LinkedHashMap<String, Object>( map ) );
        }
        Map<String, Object> notificationSettings = userProfileNotificationSettings( user );
        Map<String, Object> map1 = notificationSettings;
        if ( map1 != null ) {
            userProfileResponse.notificationSettings( new LinkedHashMap<String, Object>( map1 ) );
        }
        userProfileResponse.id( user.getId() );

        userProfileResponse.role( user.getRole().name() );
        userProfileResponse.status( user.getStatus().name() );

        return userProfileResponse.build();
    }

    private String userProfileDisplayName(User user) {
        UserProfile profile = user.getProfile();
        if ( profile == null ) {
            return null;
        }
        return profile.getDisplayName();
    }

    private String userProfileAvatarUrl(User user) {
        UserProfile profile = user.getProfile();
        if ( profile == null ) {
            return null;
        }
        return profile.getAvatarUrl();
    }

    private Map<String, Object> userProfilePreferences(User user) {
        UserProfile profile = user.getProfile();
        if ( profile == null ) {
            return null;
        }
        return profile.getPreferences();
    }

    private Map<String, Object> userProfileNotificationSettings(User user) {
        UserProfile profile = user.getProfile();
        if ( profile == null ) {
            return null;
        }
        return profile.getNotificationSettings();
    }
}
