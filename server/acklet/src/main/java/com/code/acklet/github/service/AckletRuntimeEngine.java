package com.code.acklet.github.service;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.HttpURLConnection;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
public class AckletRuntimeEngine {

    private final Map<String, RuntimeInstance> activeRuntimes = new ConcurrentHashMap<>();
    private final AtomicInteger dynamicPortCounter = new AtomicInteger(9100);

    @Data
    @Builder
    public static class RuntimeInstance {
        private String toolId;
        private String slug;
        private String runtimeType;
        private int allocatedPort;
        private String status; // "RUNNING", "STOPPED", "SLEEPING"
        private String healthStatus; // "HEALTHY", "UNHEALTHY", "UNKNOWN"
        private long processPid;
        private long lastActiveTimestamp;
        private String startCommand;
    }

    public synchronized int allocatePort(Integer preferredPort) {
        if (preferredPort != null && preferredPort > 1024 && isPortAvailable(preferredPort)) {
            return preferredPort;
        }
        int port = dynamicPortCounter.getAndIncrement();
        while (!isPortAvailable(port)) {
            port = dynamicPortCounter.getAndIncrement();
        }
        return port;
    }

    private boolean isPortAvailable(int port) {
        for (RuntimeInstance instance : activeRuntimes.values()) {
            if ("RUNNING".equalsIgnoreCase(instance.getStatus()) && instance.getAllocatedPort() == port) {
                return false;
            }
        }
        try (var socket = new java.net.ServerSocket(port)) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public RuntimeInstance startRuntime(String toolId, String slug, String runtimeType, String startCommand, Integer preferredPort) {
        int port = allocatePort(preferredPort);
        log.info("Starting runtime engine for tool: {} ({}) on port {}", slug, runtimeType, port);

        RuntimeInstance instance = RuntimeInstance.builder()
                .toolId(toolId)
                .slug(slug)
                .runtimeType(runtimeType)
                .allocatedPort(port)
                .status("RUNNING")
                .healthStatus("HEALTHY")
                .processPid(System.currentTimeMillis() % 100000)
                .lastActiveTimestamp(System.currentTimeMillis())
                .startCommand(startCommand)
                .build();

        activeRuntimes.put(toolId, instance);
        return instance;
    }

    public boolean stopRuntime(String toolId) {
        RuntimeInstance instance = activeRuntimes.get(toolId);
        if (instance == null) return false;

        log.info("Stopping runtime engine for tool: {}", instance.getSlug());
        instance.setStatus("STOPPED");
        instance.setHealthStatus("UNKNOWN");
        return true;
    }

    public RuntimeInstance restartRuntime(String toolId) {
        stopRuntime(toolId);
        RuntimeInstance instance = activeRuntimes.get(toolId);
        if (instance == null) return null;

        return startRuntime(toolId, instance.getSlug(), instance.getRuntimeType(), instance.getStartCommand(), instance.getAllocatedPort());
    }

    public boolean sleepRuntime(String toolId) {
        RuntimeInstance instance = activeRuntimes.get(toolId);
        if (instance == null || !"RUNNING".equalsIgnoreCase(instance.getStatus())) return false;

        log.info("Putting runtime engine to sleep due to inactivity: {}", instance.getSlug());
        instance.setStatus("SLEEPING");
        return true;
    }

    public boolean wakeRuntime(String toolId) {
        RuntimeInstance instance = activeRuntimes.get(toolId);
        if (instance == null || !"SLEEPING".equalsIgnoreCase(instance.getStatus())) return false;

        log.info("Waking up runtime engine for tool: {}", instance.getSlug());
        instance.setStatus("RUNNING");
        instance.setLastActiveTimestamp(System.currentTimeMillis());
        return true;
    }

    public String checkHealth(String toolId, String healthEndpointPath) {
        RuntimeInstance instance = activeRuntimes.get(toolId);
        if (instance == null || !"RUNNING".equalsIgnoreCase(instance.getStatus())) {
            return "UNHEALTHY";
        }

        String path = (healthEndpointPath != null && !healthEndpointPath.isBlank()) ? healthEndpointPath : "/";
        String targetUrl = "http://localhost:" + instance.getAllocatedPort() + (path.startsWith("/") ? path : "/" + path);

        try {
            HttpURLConnection conn = (HttpURLConnection) URI.create(targetUrl).toURL().openConnection();
            conn.setConnectTimeout(2000);
            conn.setReadTimeout(2000);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            if (code >= 200 && code < 400) {
                instance.setHealthStatus("HEALTHY");
                return "HEALTHY";
            }
        } catch (Exception e) {
            log.warn("Health check poll failed for tool {} on URL {}: {}", instance.getSlug(), targetUrl, e.getMessage());
        }

        instance.setHealthStatus("UNHEALTHY");
        return "UNHEALTHY";
    }

    public RuntimeInstance getRuntime(String toolId) {
        return activeRuntimes.get(toolId);
    }
}
