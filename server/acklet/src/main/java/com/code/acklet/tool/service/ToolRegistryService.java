package com.code.acklet.tool.service;

import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import jakarta.annotation.PostConstruct;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class ToolRegistryService {

    private final ToolRepository toolRepository;
    private final Map<String, RegisteredTool> registry = new ConcurrentHashMap<>();
    private final AtomicInteger nextPort = new AtomicInteger(9001);

    @PostConstruct
    public void initRegistry() {
        log.info("ToolRegistry: Restoring active tool registrations from database...");
        try {
            List<Tool> activeTools = toolRepository.findAll();
            int count = 0;
            for (Tool tool : activeTools) {
                if (tool.getStatus() == Tool.ToolStatus.ACTIVE && tool.getPort() != null) {
                    registerTool(tool.getId().toString(), tool.getName(), tool.getSlug(), tool.getVersion(), tool.getPort());
                    count++;
                }
            }
            log.info("ToolRegistry: Successfully restored {} active registrations.", count);
        } catch (Exception e) {
            log.error("ToolRegistry: Failed to restore active tool registrations: {}", e.getMessage());
        }
    }

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
        if (slug != null) {
            registry.put(slug, registered);
            registry.put(slug.toLowerCase(), registered);
        }

        log.info("Registered tool: {} on port: {} with URL: {}", name, port, executionUrl);
        return registered;
    }

    public Optional<RegisteredTool> getRegisteredTool(String toolIdOrSlug) {
        if (toolIdOrSlug == null) return Optional.empty();
        RegisteredTool tool = registry.get(toolIdOrSlug);
        if (tool == null) {
            tool = registry.get(toolIdOrSlug.toLowerCase());
        }
        if (tool == null) {
            for (Map.Entry<String, RegisteredTool> entry : registry.entrySet()) {
                if (entry.getKey().equalsIgnoreCase(toolIdOrSlug)) {
                    return Optional.of(entry.getValue());
                }
            }
        }
        return Optional.ofNullable(tool);
    }

    public List<RegisteredTool> getActiveDeployments() {
        // Return unique registered tools
        return new ArrayList<>(new HashSet<>(registry.values()));
    }
}
