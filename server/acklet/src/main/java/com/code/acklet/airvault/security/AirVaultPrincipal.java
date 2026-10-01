package com.code.acklet.airvault.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.security.Principal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AirVaultPrincipal implements Principal {
    private String username;
    private String deviceId;
    @Builder.Default
    private String tokenType = "USER"; // "USER" or "GUEST_CLIPBOARD"
    private String scopedClipboardId; // non-null for GUEST_CLIPBOARD
    private String guestAccessMode; // "read-only" or "read-write"

    @Override
    public String getName() {
        return username != null ? username : (deviceId != null ? deviceId : "anonymous");
    }

    public boolean isGuest() {
        return "GUEST_CLIPBOARD".equalsIgnoreCase(tokenType) || "GUEST".equalsIgnoreCase(tokenType);
    }

    public boolean isUser() {
        return !isGuest();
    }
}
