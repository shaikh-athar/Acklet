package com.code.acklet.github.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class ImportTimelineTracker {

    private final Map<UUID, Map<String, Long>> timelines = new ConcurrentHashMap<>();

    public void startStage(UUID jobId, String stageName) {
        timelines.computeIfAbsent(jobId, k -> new ConcurrentHashMap<>()).put(stageName + "_start", System.currentTimeMillis());
        log.info("[ImportTimeline] Job {} - Started stage: {}", jobId, stageName);
    }

    public void endStage(UUID jobId, String stageName) {
        Map<String, Long> jobTimes = timelines.get(jobId);
        if (jobTimes == null) return;
        
        Long start = jobTimes.get(stageName + "_start");
        if (start != null) {
            long duration = System.currentTimeMillis() - start;
            jobTimes.put(stageName + "_duration", duration);
            log.info("[ImportTimeline] Job {} - Ended stage: {} in {}ms", jobId, stageName, duration);
        }
    }

    public void logTimeline(UUID jobId) {
        Map<String, Long> jobTimes = timelines.get(jobId);
        if (jobTimes == null) return;

        StringBuilder report = new StringBuilder();
        report.append("\n==================================================");
        report.append("\n        IMPORT PIPELINE TIMELINE REPORT           ");
        report.append("\n==================================================");
        report.append(String.format("\nJob ID: %s", jobId));

        jobTimes.forEach((key, val) -> {
            if (key.endsWith("_duration")) {
                String stage = key.substring(0, key.indexOf("_duration"));
                report.append(String.format("\n- %-25s : %d ms", stage, val));
            }
        });
        report.append("\n==================================================");
        log.info(report.toString());
        timelines.remove(jobId); // Clean up memory
    }
}
