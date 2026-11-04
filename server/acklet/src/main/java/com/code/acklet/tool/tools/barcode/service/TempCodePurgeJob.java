package com.code.acklet.tool.tools.barcode.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TempCodePurgeJob {

    private final TempCodeService tempCodeService;

    /**
     * Purges expired records after configured retention period (default 30 days).
     * Runs daily at 03:00 UTC.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void runPurge() {
        try {
            int count = tempCodeService.purgeExpiredCodes();
            log.info("[TempCodePurge] Daily scheduled purge removed {} records", count);
        } catch (Exception e) {
            log.error("[TempCodePurge] Scheduled purge encountered an error: {}", e.getMessage());
        }
    }
}

