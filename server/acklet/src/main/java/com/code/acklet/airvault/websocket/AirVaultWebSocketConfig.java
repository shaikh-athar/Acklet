package com.code.acklet.airvault.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class AirVaultWebSocketConfig implements WebSocketConfigurer {

    private final AirVaultWebSocketHandler webSocketHandler;
    private final AirVaultHandshakeInterceptor handshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/ws/airvault")
                .addInterceptors(handshakeInterceptor)
                .setAllowedOriginPatterns("*");
    }

    /**
     * Configures the underlying WebSocket engine (Tomcat / Undertow / Jetty) container parameters.
     * Prevents WebSocket CloseStatus 1009 (TOO_BIG_TO_PROCESS / Message Too Big) by allowing up to
     * 20MB text and binary buffers for encrypted P2P payloads, batch descriptors, and archive sync.
     */
    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        // 20 MB message buffer capacity
        container.setMaxTextMessageBufferSize(20 * 1024 * 1024);
        container.setMaxBinaryMessageBufferSize(20 * 1024 * 1024);
        container.setMaxSessionIdleTimeout(60_000L);
        container.setAsyncSendTimeout(15_000L);
        return container;
    }
}

