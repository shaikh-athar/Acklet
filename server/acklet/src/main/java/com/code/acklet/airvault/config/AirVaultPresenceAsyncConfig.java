package com.code.acklet.airvault.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
public class AirVaultPresenceAsyncConfig {

    public static final String PRESENCE_EXECUTOR = "airvaultPresenceExecutor";

    @Bean(name = PRESENCE_EXECUTOR)
    public Executor airvaultPresenceExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("airvault-presence-");
        executor.initialize();
        return executor;
    }
}
