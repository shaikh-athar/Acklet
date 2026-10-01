package com.code.acklet.airvault.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

public class AirVaultAuthenticationToken extends AbstractAuthenticationToken {

    private final AirVaultPrincipal principal;

    public AirVaultAuthenticationToken(AirVaultPrincipal principal) {
        super(principal != null && principal.isGuest()
                ? List.of(new SimpleGrantedAuthority("ROLE_AIRVAULT_GUEST"))
                : List.of(new SimpleGrantedAuthority("ROLE_AIRVAULT_USER")));
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public AirVaultPrincipal getPrincipal() {
        return principal;
    }
}
