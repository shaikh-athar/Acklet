package com.code.acklet.airvault.websocket;

import jakarta.servlet.ServletContext;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
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
     * Only instantiated if the servlet container actually exposes jakarta.websocket.server.ServerContainer
     * (e.g. running in embedded Tomcat/Jetty server, not in mock-servlet test environments).
     */
    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    public ServletServerContainerFactoryBean createWebSocketContainer(ServletContext servletContext) {
        if (servletContext == null || servletContext.getAttribute("jakarta.websocket.server.ServerContainer") == null) {
            return null;
        }
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        // 20 MB message buffer capacity
        container.setMaxTextMessageBufferSize(20 * 1024 * 1024);
        container.setMaxBinaryMessageBufferSize(20 * 1024 * 1024);
        container.setMaxSessionIdleTimeout(60_000L);
        container.setAsyncSendTimeout(15_000L);
        return container;
    }
}

