package com.code.acklet.user.mapper;

import com.code.acklet.user.dto.UserProfileResponse;
import com.code.acklet.user.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "email", source = "email")
    @Mapping(target = "displayName", source = "profile.displayName")
    @Mapping(target = "avatarUrl", source = "profile.avatarUrl")
    @Mapping(target = "preferences", source = "profile.preferences")
    @Mapping(target = "notificationSettings", source = "profile.notificationSettings")
    @Mapping(target = "role", expression = "java(user.getRole().name())")
    @Mapping(target = "status", expression = "java(user.getStatus().name())")
    UserProfileResponse toProfileResponse(User user);
}
