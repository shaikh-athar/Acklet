package com.code.acklet.airvault.diagnostic;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Slf4j
@Component
public class WsOperationTimer {

    private final MeterRegistry registry;
    private static final long WARN_THRESHOLD_MS = 200L; // anything slower than this is suspect

    public WsOperationTimer(MeterRegistry registry) {
        this.registry = registry;
    }

    public <T> T time(String opName, String sessionId, Supplier<T> op) {
        long start = System.nanoTime();
        try {
            return op.get();
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            try {
                Timer.builder("ws.operation.duration")
                        .tag("operation", opName)
                        .register(registry)
                        .record(elapsedMs, TimeUnit.MILLISECONDS);
            } catch (Exception ignored) {}

            if (elapsedMs > WARN_THRESHOLD_MS) {
                log.warn("[WS-SLOW] op={} session={} took {}ms on thread={}",
                        opName, sessionId, elapsedMs, Thread.currentThread().getName());
            }
        }
    }

    public void timeRunnable(String opName, String sessionId, Runnable op) {
        time(opName, sessionId, () -> {
            op.run();
            return null;
        });
    }
}
