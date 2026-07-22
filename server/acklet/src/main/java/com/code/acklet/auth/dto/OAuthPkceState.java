package com.code.acklet.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OAuthPkceState {
    private String authUrl;
    private String state;
    private String codeVerifier;
    private String codeChallenge;
}
