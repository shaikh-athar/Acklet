package com.code.acklet.airvault.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.ResourceRegionHttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * AirVault Web MVC Configuration.
 * <p>
 * Registers ResourceRegionHttpMessageConverter so Spring MVC can seamlessly
 * serialize ResourceRegion instances for HTTP 206 Partial Content video/audio
 * seeking and progressive streaming.
 */
@Configuration
public class AirVaultWebMvcConfig implements WebMvcConfigurer {

    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        boolean hasResourceRegionConverter = converters.stream()
                .anyMatch(c -> c instanceof ResourceRegionHttpMessageConverter);

        if (!hasResourceRegionConverter) {
            converters.add(new ResourceRegionHttpMessageConverter());
        }
    }
}
