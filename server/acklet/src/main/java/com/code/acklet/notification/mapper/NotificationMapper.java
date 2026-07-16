package com.code.acklet.notification.mapper;

import com.code.acklet.notification.dto.NotificationResponse;
import com.code.acklet.notification.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(target = "type", expression = "java(notification.getType().name())")
    @Mapping(target = "isRead", source = "read")
    NotificationResponse toResponse(Notification notification);
}
