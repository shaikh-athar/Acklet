package com.code.acklet.user.dto;

import lombok.Data;

import java.util.Map;

@Data
public class UpdateNotificationSettingsRequest {
    private Map<String, Object> notificationSettings;
}
