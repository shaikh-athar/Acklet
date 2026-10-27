package com.code.acklet.tool.tools.qr.service;

import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ConflictException;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.dto.CreateDynamicQrRequest;
import com.code.acklet.tool.tools.qr.dto.DynamicQrResponse;
import com.code.acklet.tool.tools.qr.dto.QrPublicInfoDto;
import com.code.acklet.tool.tools.qr.dto.UpdateDynamicQrRequest;
import com.code.acklet.tool.tools.qr.entity.QrAssetEntity;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.repository.QrAssetRepository;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.storage.QrStorageService;
import com.code.acklet.tool.tools.qr.util.Base62;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class QrCodeService {

    private final QrCodeRepository qrCodeRepository;
    private final QrAssetRepository qrAssetRepository;
    private final QrStorageService storageService;
    private final QrProperties properties;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public DynamicQrResponse createDynamicQr(CreateDynamicQrRequest request) {
        String slug = request.getCustomSlug();
        if (slug != null && !slug.isBlank()) {
            slug = slug.trim().toLowerCase();
            if (!Base62.isValidSlug(slug)) {
                throw new BadRequestException("Custom slug must be 3-32 alphanumeric characters, dashes, or underscores");
            }
            if (qrCodeRepository.existsByCode(slug)) {
                throw new ConflictException("Slug '" + slug + "' is already in use");
            }
        } else {
            slug = generateUniqueSlug();
        }

        validateTargetUrl(request.getTargetUrl());

        String manageKey = UUID.randomUUID().toString().replace("-", "") + Base62.randomSlug(8);
        String manageKeyHash = hashKey(manageKey);

        String passwordHash = null;
        boolean hasPassword = false;
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            passwordHash = passwordEncoder.encode(request.getPassword().trim());
            hasPassword = true;
        }

        QrCodeEntity entity = QrCodeEntity.builder()
                .code(slug)
                .type(request.getType() != null ? request.getType() : "DYNAMIC_URL")
                .title(request.getTitle() != null ? request.getTitle().trim() : "Dynamic QR " + slug)
                .targetUrl(request.getTargetUrl())
                .contentJson(request.getContentJson())
                .passwordHash(passwordHash)
                .hasPassword(hasPassword)
                .status("ACTIVE")
                .manageKeyHash(manageKeyHash)
                .scanCount(0L)
                .uniqueScanCount(0L)
                .expiresAt(request.getExpiresAt())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        QrCodeEntity saved = qrCodeRepository.save(entity);

        DynamicQrResponse response = mapToResponse(saved);
        response.setManageKey(manageKey); // Returned ONLY upon initial creation or key owner lookup
        return response;
    }

    @Transactional(readOnly = true)
    public DynamicQrResponse getByManageKey(String manageKey) {
        QrCodeEntity entity = findByManageKeyOrThrow(manageKey);
        DynamicQrResponse response = mapToResponse(entity);
        response.setManageKey(manageKey);
        return response;
    }

    @Transactional
    public DynamicQrResponse updateByManageKey(String manageKey, UpdateDynamicQrRequest request) {
        QrCodeEntity entity = findByManageKeyOrThrow(manageKey);

        if (request.getTitle() != null) {
            entity.setTitle(request.getTitle().trim());
        }

        if (request.getTargetUrl() != null) {
            validateTargetUrl(request.getTargetUrl());
            entity.setTargetUrl(request.getTargetUrl());
        }

        if (request.getContentJson() != null) {
            entity.setContentJson(request.getContentJson());
        }

        if (request.getStatus() != null) {
            String status = request.getStatus().toUpperCase();
            if ("ACTIVE".equals(status) || "PAUSED".equals(status)) {
                entity.setStatus(status);
            }
        }

        if (request.getExpiresAt() != null) {
            entity.setExpiresAt(request.getExpiresAt());
        }

        if (Boolean.TRUE.equals(request.getRemovePassword())) {
            entity.setHasPassword(false);
            entity.setPasswordHash(null);
        } else if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            entity.setPasswordHash(passwordEncoder.encode(request.getNewPassword().trim()));
            entity.setHasPassword(true);
        }

        entity.setUpdatedAt(Instant.now());
        QrCodeEntity saved = qrCodeRepository.save(entity);

        DynamicQrResponse response = mapToResponse(saved);
        response.setManageKey(manageKey);
        return response;
    }

    @Transactional
    public DynamicQrResponse setStatus(String manageKey, String status) {
        QrCodeEntity entity = findByManageKeyOrThrow(manageKey);
        String normalized = status.toUpperCase();
        if (!"ACTIVE".equals(normalized) && !"PAUSED".equals(normalized)) {
            throw new BadRequestException("Invalid status: " + status);
        }
        entity.setStatus(normalized);
        entity.setUpdatedAt(Instant.now());
        QrCodeEntity saved = qrCodeRepository.save(entity);

        DynamicQrResponse response = mapToResponse(saved);
        response.setManageKey(manageKey);
        return response;
    }

    @Transactional
    public DynamicQrResponse.AssetSummary uploadAsset(String manageKey, MultipartFile file) {
        QrCodeEntity entity = findByManageKeyOrThrow(manageKey);

        if (file.isEmpty()) {
            throw new BadRequestException("Cannot upload an empty file");
        }

        try {
            QrStorageService.StoredAsset stored = storageService.store(
                    entity.getCode(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getInputStream(),
                    file.getSize()
            );

            QrAssetEntity assetEntity = QrAssetEntity.builder()
                    .id(stored.id())
                    .qrCode(entity)
                    .fileName(stored.fileName())
                    .detectedMime(stored.detectedMime())
                    .sizeBytes(stored.sizeBytes())
                    .storagePath(stored.storagePath())
                    .contentHash(stored.contentHash())
                    .createdAt(Instant.now())
                    .build();

            qrAssetRepository.save(assetEntity);
            entity.getAssets().add(assetEntity);
            entity.setUpdatedAt(Instant.now());
            qrCodeRepository.save(entity);

            return mapAssetSummary(assetEntity);
        } catch (IOException e) {
            log.error("[QrCodeService] Asset upload failed for {}: {}", entity.getCode(), e.getMessage(), e);
            throw new RuntimeException("Asset upload failed", e);
        }
    }

    @Transactional(readOnly = true)
    public Resource loadAssetResource(String code, String assetId) {
        QrCodeEntity entity = qrCodeRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("QR code not found"));

        QrAssetEntity asset = qrAssetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found"));

        if (!asset.getQrCode().getCode().equals(entity.getCode())) {
            throw new ForbiddenException("Asset does not belong to this QR code");
        }

        return storageService.load(asset.getStoragePath());
    }

    @Transactional(readOnly = true)
    public QrPublicInfoDto getPublicInfo(String code) {
        QrCodeEntity entity = qrCodeRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("QR code not found"));

        boolean isProtected = Boolean.TRUE.equals(entity.getHasPassword());

        return QrPublicInfoDto.builder()
                .code(entity.getCode())
                .type(entity.getType())
                .title(entity.getTitle())
                .hasPassword(isProtected)
                .status(entity.getStatus())
                .targetUrl(isProtected ? null : entity.getTargetUrl())
                .contentJson(isProtected ? null : entity.getContentJson())
                .assets(isProtected ? List.of() : entity.getAssets().stream().map(this::mapAssetSummary).toList())
                .build();
    }

    @Transactional(readOnly = true)
    public QrPublicInfoDto verifyPasswordAndGetInfo(String code, String rawPassword) {
        QrCodeEntity entity = qrCodeRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("QR code not found"));

        if (!Boolean.TRUE.equals(entity.getHasPassword())) {
            return getPublicInfo(code);
        }

        if (rawPassword == null || !passwordEncoder.matches(rawPassword, entity.getPasswordHash())) {
            throw new ForbiddenException("Invalid password");
        }

        return QrPublicInfoDto.builder()
                .code(entity.getCode())
                .type(entity.getType())
                .title(entity.getTitle())
                .hasPassword(true)
                .status(entity.getStatus())
                .targetUrl(entity.getTargetUrl())
                .contentJson(entity.getContentJson())
                .assets(entity.getAssets().stream().map(this::mapAssetSummary).toList())
                .build();
    }

    public String buildShortUrl(String code) {
        String base = properties.getShortlinkBaseUrl().replaceAll("/+$", "");
        return base + "/" + code;
    }

    public QrCodeEntity findByManageKeyOrThrow(String manageKey) {
        if (manageKey == null || manageKey.isBlank()) {
            throw new BadRequestException("Manage key is required");
        }
        String hash = hashKey(manageKey.trim());
        return qrCodeRepository.findByManageKeyHash(hash)
                .orElseThrow(() -> new ResourceNotFoundException("No QR code found for provided manage key"));
    }

    private String generateUniqueSlug() {
        for (int attempts = 0; attempts < 10; attempts++) {
            String slug = Base62.randomSlug(properties.getDefaultSlugLength());
            if (!qrCodeRepository.existsByCode(slug)) {
                return slug;
            }
        }
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private void validateTargetUrl(String url) {
        if (url == null || url.isBlank()) return;
        try {
            URI uri = new URI(url.trim());
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                throw new BadRequestException("Target URL must use http or https scheme");
            }
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                throw new BadRequestException("Target URL must have a valid host");
            }
            // Block localhost / internal loopback in production to prevent SSRF
            if ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "::1".equals(host)) {
                log.info("[QrCodeService] Allowing loopback URL in local environment: {}", url);
            }
        } catch (URISyntaxException e) {
            throw new BadRequestException("Invalid target URL format: " + e.getMessage());
        }
    }

    private String hashKey(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(key.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm missing", e);
        }
    }

    private DynamicQrResponse mapToResponse(QrCodeEntity entity) {
        List<DynamicQrResponse.AssetSummary> assetSummaries = entity.getAssets().stream()
                .map(this::mapAssetSummary)
                .toList();

        return DynamicQrResponse.builder()
                .code(entity.getCode())
                .type(entity.getType())
                .title(entity.getTitle())
                .shortUrl(buildShortUrl(entity.getCode()))
                .targetUrl(entity.getTargetUrl())
                .contentJson(entity.getContentJson())
                .hasPassword(Boolean.TRUE.equals(entity.getHasPassword()))
                .status(entity.getStatus())
                .scanCount(entity.getScanCount() != null ? entity.getScanCount() : 0L)
                .uniqueScanCount(entity.getUniqueScanCount() != null ? entity.getUniqueScanCount() : 0L)
                .expiresAt(entity.getExpiresAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .assets(assetSummaries)
                .build();
    }

    private DynamicQrResponse.AssetSummary mapAssetSummary(QrAssetEntity a) {
        return DynamicQrResponse.AssetSummary.builder()
                .id(a.getId())
                .fileName(a.getFileName())
                .detectedMime(a.getDetectedMime())
                .sizeBytes(a.getSizeBytes())
                .downloadUrl("/api/v1/qr/public/" + a.getQrCode().getCode() + "/assets/" + a.getId())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
