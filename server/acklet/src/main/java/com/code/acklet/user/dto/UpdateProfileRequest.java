package com.code.acklet.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(max = 100, message = "Display name must not exceed 100 characters")
    private String displayName;
    
    @Size(max = 512, message = "Avatar URL must not exceed 512 characters")
    private String avatarUrl;
}
