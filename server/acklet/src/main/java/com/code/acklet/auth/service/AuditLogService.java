package com.code.acklet.auth.service;

import com.code.acklet.config.properties.AppProperties;
import com.code.acklet.auth.entity.SecurityAuditLog;
import com.code.acklet.auth.repository.SecurityAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final SecurityAuditLogRepository auditLogRepository;
    private final AppProperties appProperties;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(String eventType, UUID userId, String email, String ipAddress, String device, String correlationId, String details) {
        if (!appProperties.getSecurity().getFeatures().isSecurityAuditLogging()) {
            return;
        }

        try {
            SecurityAuditLog auditLog = SecurityAuditLog.builder()
                    .eventType(eventType)
                    .userId(userId)
                    .email(email)
                    .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                    .device(device != null ? device : "Unknown Device")
                    .browser(parseBrowser(device))
                    .country("Local")
                    .correlationId(correlationId)
                    .details(details)
                    .build();

            auditLogRepository.save(auditLog);
            log.info("[AuditLog] Saved security event: {} for user: {}", eventType, email);
        } catch (Exception e) {
            log.error("[AuditLog] Failed to persist audit log entry: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<SecurityAuditLog> getUserAuditLogs(UUID userId) {
        return auditLogRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId);
    }

    private String parseBrowser(String userAgent) {
        if (userAgent == null) return "Unknown";
        if (userAgent.contains("Chrome")) return "Chrome";
        if (userAgent.contains("Firefox")) return "Firefox";
        if (userAgent.contains("Safari")) return "Safari";
        if (userAgent.contains("Edge")) return "Edge";
        return "Browser";
    }
}
