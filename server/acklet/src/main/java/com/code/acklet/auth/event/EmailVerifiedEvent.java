package com.code.acklet.auth.event;

import com.code.acklet.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class EmailVerifiedEvent extends ApplicationEvent {
    private final User user;

    public EmailVerifiedEvent(Object source, User user) {
        super(source);
        this.user = user;
    }
}
