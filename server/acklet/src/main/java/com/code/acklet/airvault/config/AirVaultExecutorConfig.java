package com.code.acklet.airvault.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.lang.reflect.Method;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
@Slf4j
public class AirVaultExecutorConfig {

    /**
     * Dedicated Virtual Thread Per Task Executor for offloaded WebSocket tasks and async presence I/O.
     * When running on Java 21+, creates lightweight Virtual Threads (Executors.newVirtualThreadPerTaskExecutor())
     * which scale to 100,000+ concurrent connections without OS thread pool bottlenecks.
     * Includes seamless reflection fallback for environments running on Java 17.
     */
    @Bean(name = "wsOffloadExecutor")
    public ExecutorService wsOffloadExecutor() {
        try {
            // Attempt to invoke Executors.newVirtualThreadPerTaskExecutor() (Java 21+)
            Method virtualExecutorMethod = Executors.class.getMethod("newVirtualThreadPerTaskExecutor");
            ExecutorService virtualExecutor = (ExecutorService) virtualExecutorMethod.invoke(null);
            log.info("[AirVault Thread Model] 🚀 Activated Java 21+ Virtual Threads executor for WebSocket offloading.");
            return virtualExecutor;
        } catch (Throwable ex) {
            log.info("[AirVault Thread Model] ℹ️ Virtual threads not natively available on compile target ({}), using high-throughput elastic pool.", ex.getMessage());
            AtomicInteger count = new AtomicInteger(1);
            ThreadFactory factory = r -> {
                Thread t = new Thread(r, "ws-worker-" + count.getAndIncrement());
                t.setDaemon(true);
                return t;
            };
            return new ThreadPoolExecutor(
                    16,
                    512,
                    60L,
                    TimeUnit.SECONDS,
                    new SynchronousQueue<>(),
                    factory,
                    new ThreadPoolExecutor.CallerRunsPolicy()
            );
        }
    }
}

