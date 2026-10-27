package com.code.acklet.tool.tools.qr.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.tools.qr.dto.*;
import com.code.acklet.tool.tools.qr.service.QrLinkService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/qr-links")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class QrLinkController {

    private final QrLinkService qrLinkService;

    @PostMapping
    public ResponseEntity<ApiResponse<QrLinkResponse>> createLink(
            @Valid @RequestBody CreateQrLinkRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        QrLinkResponse response = qrLinkService.createLink(request, clientIp);
        return ResponseEntity.ok(ApiResponse.success(response, "QR link created successfully"));
    }

    @RequestMapping(value = "/{code}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<QrLinkResponse>> updateLink(
            @PathVariable String code,
            @Valid @RequestBody UpdateQrLinkRequest request,
            @RequestHeader(value = "X-Manage-Token", required = false) String manageTokenHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = resolveToken(manageTokenHeader, authHeader);
        QrLinkResponse response = qrLinkService.updateLink(code, request, token);
        return ResponseEntity.ok(ApiResponse.success(response, "QR link updated successfully"));
    }

    @GetMapping("/{code}/stats")
    public ResponseEntity<ApiResponse<QrLinkStatsDto>> getStats(
            @PathVariable String code,
            @RequestHeader(value = "X-Manage-Token", required = false) String manageTokenHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = resolveToken(manageTokenHeader, authHeader);
        QrLinkStatsDto stats = qrLinkService.getStats(code, token);
        return ResponseEntity.ok(ApiResponse.success(stats, "QR link stats retrieved"));
    }

    @PostMapping("/{code}/disable")
    public ResponseEntity<ApiResponse<QrLinkResponse>> disableLink(
            @PathVariable String code,
            @RequestHeader(value = "X-Manage-Token", required = false) String manageTokenHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = resolveToken(manageTokenHeader, authHeader);
        QrLinkResponse response = qrLinkService.setStatus(code, "DISABLED", token);
        return ResponseEntity.ok(ApiResponse.success(response, "QR link disabled"));
    }

    @PostMapping("/{code}/enable")
    public ResponseEntity<ApiResponse<QrLinkResponse>> enableLink(
            @PathVariable String code,
            @RequestHeader(value = "X-Manage-Token", required = false) String manageTokenHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = resolveToken(manageTokenHeader, authHeader);
        QrLinkResponse response = qrLinkService.setStatus(code, "ACTIVE", token);
        return ResponseEntity.ok(ApiResponse.success(response, "QR link enabled"));
    }

    @PostMapping("/{code}/extend")
    public ResponseEntity<ApiResponse<QrLinkResponse>> extendLink(
            @PathVariable String code,
            @RequestHeader(value = "X-Manage-Token", required = false) String manageTokenHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = resolveToken(manageTokenHeader, authHeader);
        QrLinkResponse response = qrLinkService.extendExpiry(code, token);
        return ResponseEntity.ok(ApiResponse.success(response, "QR link retention extended"));
    }

    @PostMapping("/{code}/mark-downloaded")
    public ResponseEntity<ApiResponse<Void>> markDownloaded(@PathVariable String code) {
        qrLinkService.markDownloaded(code);
        return ResponseEntity.ok(ApiResponse.success(null, "QR marked as downloaded"));
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<ApiResponse<Void>> deleteLink(
            @PathVariable String code,
            @RequestHeader(value = "X-Manage-Token", required = false) String manageTokenHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = resolveToken(manageTokenHeader, authHeader);
        qrLinkService.deleteLink(code, token);
        return ResponseEntity.ok(ApiResponse.success(null, "QR link deleted"));
    }

    @PostMapping("/lookup")
    public ResponseEntity<ApiResponse<List<QrLinkSummaryDto>>> lookup(
            @RequestBody QrLinkLookupRequest request) {
        List<QrLinkSummaryDto> summaries = qrLinkService.lookupSummaries(request);
        return ResponseEntity.ok(ApiResponse.success(summaries, "QR links lookup completed"));
    }

    private String resolveToken(String manageTokenHeader, String authHeader) {
        if (manageTokenHeader != null && !manageTokenHeader.isBlank()) {
            return manageTokenHeader.trim();
        }
        if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return authHeader.substring(7).trim();
        }
        return null;
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "unknown";
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
