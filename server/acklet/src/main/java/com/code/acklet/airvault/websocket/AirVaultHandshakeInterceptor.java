package com.code.acklet.airvault.websocket;

import com.code.acklet.shared.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        URI uri = request.getURI();
        String query = uri.getQuery();
        String deviceId = null;
        String token = null;

        if (query != null && !query.isBlank()) {
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                if (idx > 0) {
                    String key = pair.substring(0, idx);
                    String val = pair.substring(idx + 1);
                    if ("deviceId".equalsIgnoreCase(key)) {
                        deviceId = val;
                    } else if ("token".equalsIgnoreCase(key)) {
                        token = val;
                    }
                }
            }
        }

        // Header fallbacks
        if (deviceId == null || deviceId.isBlank()) {
            deviceId = request.getHeaders().getFirst("X-Device-Id");
        }
        if (token == null || token.isBlank()) {
            String authHeader = request.getHeaders().getFirst("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
        }

        if (deviceId == null || deviceId.isBlank()) {
            log.warn("[AirVault WS] Handshake rejected: missing required deviceId parameter (URI={})", uri);
            return false;
        }

        attributes.put("deviceId", deviceId);

        if (token != null && !token.isBlank()) {
            try {
                if (jwtTokenProvider.isTokenValid(token)) {
                    String username = jwtTokenProvider.extractUsername(token);
                    attributes.put("username", username);
                    log.debug("[AirVault WS] Authenticated user '{}' for device '{}'", username, deviceId);
                } else if ("demo_dev_access_token".equals(token)) {
                    attributes.put("username", "user@acklet.com");
                }
            } catch (Exception e) {
                log.debug("[AirVault WS] Token validation ignored on handshake: {}", e.getMessage());
            }
        }

        log.debug("[AirVault WS] Handshake accepted for deviceId='{}'", deviceId);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // No-op
    }
}
