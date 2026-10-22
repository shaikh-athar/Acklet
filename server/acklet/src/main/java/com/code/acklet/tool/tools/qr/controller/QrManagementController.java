package com.code.acklet.tool.tools.qr.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.tools.qr.dto.*;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.service.QrAnalyticsService;
import com.code.acklet.tool.tools.qr.service.QrCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/qr")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class QrManagementController {

    private final QrCodeService qrCodeService;
    private final QrAnalyticsService analyticsService;

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<DynamicQrResponse>> create(@Valid @RequestBody CreateDynamicQrRequest request) {
        DynamicQrResponse response = qrCodeService.createDynamicQr(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Dynamic QR code created successfully"));
    }

    @GetMapping("/manage/{manageKey}")
    public ResponseEntity<ApiResponse<DynamicQrResponse>> getByManageKey(@PathVariable String manageKey) {
        DynamicQrResponse response = qrCodeService.getByManageKey(manageKey);
        return ResponseEntity.ok(ApiResponse.success(response, "QR code details retrieved"));
    }

    @PutMapping("/manage/{manageKey}")
    public ResponseEntity<ApiResponse<DynamicQrResponse>> updateByManageKey(
            @PathVariable String manageKey,
            @Valid @RequestBody UpdateDynamicQrRequest request) {
        DynamicQrResponse response = qrCodeService.updateByManageKey(manageKey, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Dynamic QR code updated successfully"));
    }

    @PostMapping("/manage/{manageKey}/pause")
    public ResponseEntity<ApiResponse<DynamicQrResponse>> pause(@PathVariable String manageKey) {
        DynamicQrResponse response = qrCodeService.setStatus(manageKey, "PAUSED");
        return ResponseEntity.ok(ApiResponse.success(response, "QR code paused"));
    }

    @PostMapping("/manage/{manageKey}/resume")
    public ResponseEntity<ApiResponse<DynamicQrResponse>> resume(@PathVariable String manageKey) {
        DynamicQrResponse response = qrCodeService.setStatus(manageKey, "ACTIVE");
        return ResponseEntity.ok(ApiResponse.success(response, "QR code resumed"));
    }

    @GetMapping("/manage/{manageKey}/analytics")
    public ResponseEntity<ApiResponse<QrScanAnalyticsDto>> getAnalytics(@PathVariable String manageKey) {
        QrCodeEntity entity = qrCodeService.findByManageKeyOrThrow(manageKey);
        QrScanAnalyticsDto analytics = analyticsService.getAnalytics(entity);
        return ResponseEntity.ok(ApiResponse.success(analytics, "Analytics retrieved"));
    }

    @PostMapping(value = "/manage/{manageKey}/upload-asset", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DynamicQrResponse.AssetSummary>> uploadAsset(
            @PathVariable String manageKey,
            @RequestParam("file") MultipartFile file) {
        DynamicQrResponse.AssetSummary asset = qrCodeService.uploadAsset(manageKey, file);
        return ResponseEntity.ok(ApiResponse.success(asset, "Asset uploaded successfully"));
    }

    @GetMapping("/public/{code}")
    public ResponseEntity<ApiResponse<QrPublicInfoDto>> getPublicInfo(@PathVariable String code) {
        QrPublicInfoDto info = qrCodeService.getPublicInfo(code);
        return ResponseEntity.ok(ApiResponse.success(info, "Public info retrieved"));
    }

    @PostMapping("/public/{code}/verify-password")
    public ResponseEntity<ApiResponse<QrPublicInfoDto>> verifyPassword(
            @PathVariable String code,
            @Valid @RequestBody QrPasswordVerifyRequest request) {
        QrPublicInfoDto info = qrCodeService.verifyPasswordAndGetInfo(code, request.getPassword());
        return ResponseEntity.ok(ApiResponse.success(info, "Password verified"));
    }

    @GetMapping("/public/{code}/assets/{assetId}")
    public ResponseEntity<Resource> downloadAsset(
            @PathVariable String code,
            @PathVariable String assetId) throws IOException {
        Resource resource = qrCodeService.loadAssetResource(code, assetId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
