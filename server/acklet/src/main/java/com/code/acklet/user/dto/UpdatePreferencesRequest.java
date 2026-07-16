package com.code.acklet.user.dto;

import lombok.Data;

import java.util.Map;

@Data
public class UpdatePreferencesRequest {
    private Map<String, Object> preferences;
}
