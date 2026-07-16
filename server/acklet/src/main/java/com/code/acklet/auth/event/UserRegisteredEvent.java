package com.code.acklet.auth.event;

import com.code.acklet.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class UserRegisteredEvent extends ApplicationEvent {
    private final User user;
    private final String otpCode;

    public UserRegisteredEvent(Object source, User user, String otpCode) {
        super(source);
        this.user = user;
        this.otpCode = otpCode;
    }
}
