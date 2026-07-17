package com.code.acklet.notification.mapper;

import com.code.acklet.notification.dto.NotificationResponse;
import com.code.acklet.notification.entity.Notification;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-07-16T20:03:51+0530",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.9 (Oracle Corporation)"
)
@Component
public class NotificationMapperImpl implements NotificationMapper {

    @Override
    public NotificationResponse toResponse(Notification notification) {
        if ( notification == null ) {
            return null;
        }

        NotificationResponse.NotificationResponseBuilder notificationResponse = NotificationResponse.builder();

        notificationResponse.isRead( notification.isRead() );
        notificationResponse.id( notification.getId() );
        notificationResponse.title( notification.getTitle() );
        notificationResponse.content( notification.getContent() );
        notificationResponse.readAt( notification.getReadAt() );
        notificationResponse.createdAt( notification.getCreatedAt() );

        notificationResponse.type( notification.getType().name() );

        return notificationResponse.build();
    }
}
