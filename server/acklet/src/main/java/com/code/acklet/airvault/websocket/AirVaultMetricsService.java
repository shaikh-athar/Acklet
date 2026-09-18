package com.code.acklet.airvault.websocket;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Service providing real-time Micrometer metrics for AirVault WebSocket connection scaling,
 * active connection counts, connect/disconnect churn rates, and message throughput.
 */
@Service
@Slf4j
public class AirVaultMetricsService {

    private final MeterRegistry meterRegistry;

    @Getter
    private final String nodeId = UUID.randomUUID().toString().substring(0, 8);

    private final AtomicInteger activeConnections = new AtomicInteger(0);
    private final Counter totalConnects;
    private final Counter totalMessagesSent;
    private final Counter totalMessagesReceived;

    public AirVaultMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        // Register Gauge for live active connections on this node
        Gauge.builder("airvault.ws.connections.active", activeConnections, AtomicInteger::get)
                .tag("node.id", nodeId)
                .description("Number of currently active WebSocket connections on this node")
                .register(meterRegistry);

        this.totalConnects = Counter.builder("airvault.ws.connections.total")
                .tag("node.id", nodeId)
                .description("Total number of WebSocket connections established")
                .register(meterRegistry);

        this.totalMessagesSent = Counter.builder("airvault.ws.messages.sent")
                .tag("node.id", nodeId)
                .description("Total number of WebSocket messages dispatched to clients")
                .register(meterRegistry);

        this.totalMessagesReceived = Counter.builder("airvault.ws.messages.received")
                .tag("node.id", nodeId)
                .description("Total number of WebSocket messages received from clients")
                .register(meterRegistry);
    }

    public void recordConnectionEstablished() {
        activeConnections.incrementAndGet();
        totalConnects.increment();
    }

    public void recordConnectionClosed(String reasonTag) {
        activeConnections.decrementAndGet();
        try {
            meterRegistry.counter("airvault.ws.disconnections.total",
                    "node.id", nodeId,
                    "reason", reasonTag != null ? reasonTag : "unknown"
            ).increment();
        } catch (Exception ignored) {}
    }

    public void recordMessageSent() {
        totalMessagesSent.increment();
    }

    public void recordMessageReceived() {
        totalMessagesReceived.increment();
    }

    public int getActiveConnectionCount() {
        return activeConnections.get();
    }
}
