package com.code.acklet.tool.tools.qr.service;

import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.dto.QrScanAnalyticsDto;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.entity.QrScanEntity;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.repository.QrScanRepository;
import com.code.acklet.tool.tools.qr.util.UserAgentParser;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class QrAnalyticsService {

    private final QrScanRepository scanRepository;
    private final QrCodeRepository qrCodeRepository;
    private final QrProperties properties;

    @Transactional
    public void recordScan(QrCodeEntity qrCode, HttpServletRequest request) {
        try {
            // Respect user privacy signals: Do Not Track (DNT) or Global Privacy Control (GPC)
            String dnt = request.getHeader("DNT");
            String gpc = request.getHeader("Sec-GPC");
            boolean suppressTracking = "1".equals(dnt) || "1".equals(gpc);

            String userAgent = request.getHeader("User-Agent");
            UserAgentParser.ParsedUserAgent parsedUa = UserAgentParser.parse(userAgent);

            String countryCode = null;
            String visitorHash = null;

            if (!suppressTracking) {
                // Determine country safely from Cloudflare / proxy headers
                countryCode = request.getHeader("CF-IPCountry");
                if (countryCode == null || countryCode.isBlank()) {
                    countryCode = request.getHeader("X-Country-Code");
                }
                if (countryCode != null && countryCode.length() > 8) {
                    countryCode = countryCode.substring(0, 8);
                }

                // Compute daily salted visitor hash (no raw IP is stored)
                String clientIp = extractClientIp(request);
                String dailySalt = properties.getSalt() + "_" + LocalDate.now(ZoneOffset.UTC);
                visitorHash = hashWithSalt(clientIp, dailySalt);
            }

            QrScanEntity scan = QrScanEntity.builder()
                    .qrCode(qrCode)
                    .scannedAt(Instant.now())
                    .countryCode(countryCode)
                    .deviceType(parsedUa.deviceType())
                    .os(parsedUa.os())
                    .browser(parsedUa.browser())
                    .referrer(sanitizeReferrer(request.getHeader("Referer")))
                    .visitorHash(visitorHash)
                    .build();

            scanRepository.save(scan);

            // Update cached counts on qr_codes
            qrCode.setScanCount(qrCode.getScanCount() + 1);
            long uniqueVisitors = scanRepository.countDistinctVisitorHashByQrCode(qrCode);
            qrCode.setUniqueScanCount(uniqueVisitors);
            qrCodeRepository.save(qrCode);
        } catch (Exception e) {
            log.warn("[QrAnalytics] Error recording scan for QR {}: {}", qrCode.getCode(), e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public QrScanAnalyticsDto getAnalytics(QrCodeEntity qrCode) {
        long totalScans = scanRepository.countByQrCode(qrCode);
        long uniqueVisitors = scanRepository.countDistinctVisitorHashByQrCode(qrCode);

        List<QrScanAnalyticsDto.MetricEntry> daily = scanRepository.findDailyScans(qrCode).stream()
                .map(m -> new QrScanAnalyticsDto.MetricEntry(m.getKey(), m.getCount()))
                .toList();

        List<QrScanAnalyticsDto.MetricEntry> countries = scanRepository.findCountryScans(qrCode).stream()
                .map(m -> new QrScanAnalyticsDto.MetricEntry(m.getKey(), m.getCount()))
                .toList();

        List<QrScanAnalyticsDto.MetricEntry> devices = scanRepository.findDeviceScans(qrCode).stream()
                .map(m -> new QrScanAnalyticsDto.MetricEntry(m.getKey(), m.getCount()))
                .toList();

        List<QrScanAnalyticsDto.MetricEntry> osList = scanRepository.findOsScans(qrCode).stream()
                .map(m -> new QrScanAnalyticsDto.MetricEntry(m.getKey(), m.getCount()))
                .toList();

        List<QrScanAnalyticsDto.MetricEntry> browsers = scanRepository.findBrowserScans(qrCode).stream()
                .map(m -> new QrScanAnalyticsDto.MetricEntry(m.getKey(), m.getCount()))
                .toList();

        return QrScanAnalyticsDto.builder()
                .code(qrCode.getCode())
                .totalScans(totalScans)
                .uniqueVisitors(uniqueVisitors)
                .dailyScans(daily)
                .byCountry(countries)
                .byDevice(devices)
                .byOs(osList)
                .byBrowser(browsers)
                .build();
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }

    private String hashWithSalt(String raw, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] digest = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String sanitizeReferrer(String referrer) {
        if (referrer == null) return null;
        if (referrer.length() > 500) {
            return referrer.substring(0, 500);
        }
        return referrer;
    }
}
