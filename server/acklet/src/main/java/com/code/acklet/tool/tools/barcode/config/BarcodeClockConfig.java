package com.code.acklet.tool.tools.barcode.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class BarcodeClockConfig {

    @Bean
    @ConditionalOnMissingBean(Clock.class)
    public Clock clock() {
        return Clock.systemUTC();
    }
}

