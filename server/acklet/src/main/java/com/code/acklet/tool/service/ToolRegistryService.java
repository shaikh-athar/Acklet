package com.code.acklet.tool.service;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
public class ToolRegistryService {

    private final Map<String, RegisteredTool> registry = new ConcurrentHashMap<>();
    private final AtomicInteger nextPort = new AtomicInteger(9001);

    @Data
    @Builder
    public static class RegisteredTool {
        private String toolId;
        private String name;
        private String slug;
        private String version;
        private String executionUrl;
        private int port;
        private String status;
        private String health;
    }

    public RegisteredTool registerTool(String toolId, String name, String slug, String version) {
        return registerTool(toolId, name, slug, version, null);
    }

    public RegisteredTool registerTool(String toolId, String name, String slug, String version, Integer customPort) {
        // Check if already registered
        if (registry.containsKey(toolId)) {
            RegisteredTool existing = registry.get(toolId);
            if (customPort != null) {
                existing.setPort(customPort);
                existing.setExecutionUrl("http://localhost:" + customPort);
            }
            return existing;
        }

        int port = customPort != null ? customPort : nextPort.getAndIncrement();
        String executionUrl = "http://localhost:" + port;

        RegisteredTool registered = RegisteredTool.builder()
                .toolId(toolId)
                .name(name)
                .slug(slug)
                .version(version)
                .executionUrl(executionUrl)
                .port(port)
                .status("DEPLOYED")
                .health("HEALTHY")
                .build();

        registry.put(toolId, registered);
        registry.put(slug, registered); // Also support lookup by slug

        log.info("Registered tool: {} on port: {} with URL: {}", name, port, executionUrl);
        return registered;
    }

    public Optional<RegisteredTool> getRegisteredTool(String toolIdOrSlug) {
        return Optional.ofNullable(registry.get(toolIdOrSlug));
    }

    public List<RegisteredTool> getActiveDeployments() {
        // Return unique registered tools
        return new ArrayList<>(new HashSet<>(registry.values()));
    }
}
