package com.code.acklet.airvault.websocket;

import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.code.acklet.airvault.security.AirVaultTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AirVaultHandshakeInterceptor implements HandshakeInterceptor {

    private final AirVaultTokenService tokenService;
    private final Environment environment;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        URI uri = request.getURI();
        String query = uri.getQuery();
        String token = null;

        if (query != null && !query.isBlank()) {
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                if (idx > 0) {
                    String key = pair.substring(0, idx);
                    String val = pair.substring(idx + 1);
                    if ("token".equalsIgnoreCase(key)) {
                        token = val;
                    }
                }
            }
        }

        // Header fallback
        if (token == null || token.isBlank()) {
            String authHeader = request.getHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else {
                token = request.getHeaders().getFirst("X-AirVault-Token");
            }
        }

        if (token == null || token.isBlank()) {
            log.warn("[AirVault WS] 🚫 Handshake rejected: missing required signed token (URI={})", uri);
            return false;
        }

        AirVaultPrincipal principal = null;

        if ("demo_dev_access_token".equals(token)) {
            if (environment.acceptsProfiles(Profiles.of("local", "dev", "test"))) {
                principal = AirVaultPrincipal.builder()
                        .username("user@acklet.com")
                        .deviceId("demo-device-id")
                        .tokenType("USER")
                        .build();
            } else {
                log.warn("[AirVault WS] 🚫 Rejected demo token in non-local profile");
                return false;
            }
        } else {
            principal = tokenService.parseAndValidateToken(token);
        }

        if (principal == null) {
            log.warn("[AirVault WS] 🚫 Handshake rejected: token signature invalid or expired");
            return false;
        }

        attributes.put("principal", principal);
        attributes.put("deviceId", principal.getDeviceId());
        attributes.put("username", principal.getUsername());
        if (principal.isGuest()) {
            attributes.put("isGuest", true);
            attributes.put("scopedClipboardId", principal.getScopedClipboardId());
            attributes.put("guestAccessMode", principal.getGuestAccessMode());
        }

        log.debug("[AirVault WS] ✅ Handshake accepted: username='{}', deviceId='{}', type='{}'",
                principal.getUsername(), principal.getDeviceId(), principal.getTokenType());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // No-op
    }
}
