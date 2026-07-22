package com.code.acklet.auth.dto;

import com.code.acklet.user.dto.UserProfileResponse;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    @JsonProperty("isNewUser")
    private boolean isNewUser;
    private UserProfileResponse profile;
}
