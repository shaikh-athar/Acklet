package com.code.acklet.ai.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configures the dedicated "aiExecutor" thread pool for @Async AI tasks.
 *
 * Keeps AI I/O off the Spring MVC threads. Pool sizing is configurable
 * via app.ai.executor.* properties.
 */
@Slf4j
@Configuration
public class AiConfig {

    @Bean(name = "aiExecutor")
    public Executor aiExecutor(
            @Value("${app.ai.executor.core-size:2}")    int coreSize,
            @Value("${app.ai.executor.max-size:5}")     int maxSize,
            @Value("${app.ai.executor.queue-capacity:50}") int queueCapacity) {

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(coreSize);
        executor.setMaxPoolSize(maxSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("ai-worker-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();

        log.info("AI executor pool initialized: core={}, max={}, queue={}",
                coreSize, maxSize, queueCapacity);
        return executor;
    }
}
