package com.code.acklet.airvault.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class AirVaultSecurityFilter extends OncePerRequestFilter {

    private final AirVaultTokenService tokenService;
    private final Environment environment;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/v1/airvault")) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        String token = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        } else if (request.getParameter("token") != null && !request.getParameter("token").isBlank()) {
            token = request.getParameter("token").trim();
        }

        if (token != null && !token.isBlank()) {
            if ("demo_dev_access_token".equals(token)) {
                if (environment.acceptsProfiles(Profiles.of("local", "dev", "test"))) {
                    AirVaultPrincipal demoPrincipal = AirVaultPrincipal.builder()
                            .username("user@acklet.com")
                            .deviceId("demo-device-id")
                            .tokenType("USER")
                            .build();
                    SecurityContextHolder.getContext().setAuthentication(new AirVaultAuthenticationToken(demoPrincipal));
                } else {
                    log.warn("[AirVault Security] Rejected demo token in non-local profile");
                }
            } else {
                try {
                    AirVaultPrincipal principal = tokenService.parseAndValidateToken(token);
                    if (principal != null) {
                        SecurityContextHolder.getContext().setAuthentication(new AirVaultAuthenticationToken(principal));
                    }
                } catch (Exception ex) {
                    log.debug("[AirVault Security] Failed to authenticate token on {}: {}", path, ex.getMessage());
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
