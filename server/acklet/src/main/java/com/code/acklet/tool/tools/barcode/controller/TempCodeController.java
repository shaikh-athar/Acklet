package com.code.acklet.tool.tools.barcode.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.tools.barcode.dto.*;
import com.code.acklet.tool.tools.barcode.service.TempCodeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/temp-codes")
@RequiredArgsConstructor
public class TempCodeController {

    private final TempCodeService tempCodeService;

    @PostMapping
    public ResponseEntity<ApiResponse<TempCodeResponse>> createCode(
            @Valid @RequestBody CreateTempCodeRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        TempCodeResponse response = tempCodeService.createCode(request, ownerTokenHeader, clientIp);

        HttpHeaders headers = createSecureHeaders();
        if (response.getOwnerToken() != null) {
            headers.set("X-Owner-Token", response.getOwnerToken());
        }
        return ResponseEntity.ok()
                .headers(headers)
                .body(ApiResponse.success(response, "Temporary barcode created successfully"));
    }

    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<BatchTempCodeResponse>> createBatch(
            @Valid @RequestBody BatchCreateTempCodeRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        BatchTempCodeResponse response = tempCodeService.createBatch(request, ownerTokenHeader, clientIp);

        HttpHeaders headers = createSecureHeaders();
        if (response.getOwnerToken() != null) {
            headers.set("X-Owner-Token", response.getOwnerToken());
        }
        return ResponseEntity.ok()
                .headers(headers)
                .body(ApiResponse.success(response, "Batch of temporary barcodes created successfully"));
    }

    @PatchMapping("/batch/{batchId}")
    public ResponseEntity<ApiResponse<java.util.List<TempCodeResponse>>> updateBatch(
            @PathVariable UUID batchId,
            @Valid @RequestBody UpdateTempCodeRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        java.util.List<TempCodeResponse> response = tempCodeService.updateBatch(batchId, request, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Batch updated successfully"));
    }

    @DeleteMapping("/batch/{batchId}")
    public ResponseEntity<ApiResponse<Void>> deleteBatch(
            @PathVariable UUID batchId,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        tempCodeService.deleteBatch(batchId, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(null, "Batch deleted successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<TempCodeListResponse>> listCodes(
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        TempCodeListResponse response = tempCodeService.listOwnerCodes(ownerTokenHeader, search, status, sort, page, size);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Temporary codes retrieved successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TempCodeResponse>> getCode(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        TempCodeResponse response = tempCodeService.getOwnerCode(id, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Code retrieved successfully"));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<TempCodeResponse>> updateCode(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTempCodeRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        TempCodeResponse response = tempCodeService.updateCode(id, request, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Code updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCode(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        tempCodeService.deleteCode(id, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(null, "Code deleted successfully"));
    }

    @GetMapping("/verify/{token}")
    public ResponseEntity<ApiResponse<TempCodeVerifyResponse>> verifyCode(
            @PathVariable String token,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        TempCodeVerifyResponse response = tempCodeService.verifyCode(token, clientIp);

        HttpHeaders headers = createSecureHeaders();
        // Mandatory Cache-Control: no-store for all verification responses
        headers.set(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0");
        headers.set(HttpHeaders.PRAGMA, "no-cache");

        return ResponseEntity.ok()
                .headers(headers)
                .body(ApiResponse.success(response, "Code verification processed"));
    }

    @PostMapping("/report/{token}")
    public ResponseEntity<ApiResponse<Void>> reportCode(
            @PathVariable String token,
            @Valid @RequestBody ReportTempCodeRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        tempCodeService.reportCode(token, request, clientIp);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(null, "Report submitted successfully"));
    }

    private HttpHeaders createSecureHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Frame-Options", "DENY");
        headers.set("X-XSS-Protection", "1; mode=block");
        headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        return headers;
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";
        String[] headersToCheck = {
                "CF-Connecting-IP",
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP"
        };
        for (String header : headersToCheck) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}

