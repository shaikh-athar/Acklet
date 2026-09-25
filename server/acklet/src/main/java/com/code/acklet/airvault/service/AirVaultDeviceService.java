package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultDeviceDto;
import com.code.acklet.airvault.dto.RegisterDeviceRequest;
import com.code.acklet.airvault.entity.AirVaultDevice;
import com.code.acklet.airvault.entity.AirVaultDevicePairing;
import com.code.acklet.airvault.entity.AirVaultIdentity;
import com.code.acklet.airvault.repository.AirVaultDevicePairingRepository;
import com.code.acklet.airvault.repository.AirVaultDeviceRepository;
import com.code.acklet.airvault.repository.AirVaultIdentityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultDeviceService {

    private final AirVaultDeviceRepository repo;
    private final AirVaultIdentityRepository identityRepository;
    private final AirVaultDevicePairingRepository devicePairingRepository;
    private final PasswordEncoder passwordEncoder;
    private final AirVaultRedisTracker redisTracker;
    private final AirVaultAuditService auditService;

    /**
     * Returns all non-revoked devices for the given user.
     */
    @Transactional(readOnly = true)
    public List<AirVaultDeviceDto> getDevices(UUID userId) {
        if (userId == null) {
            return repo.findAll().stream()
                    .filter(d -> !"revoked".equals(d.getStatus()))
                    .map(this::toDto).toList();
        }
        return repo.findByUserIdAndStatusNot(userId, "revoked")
                .stream().map(this::toDto).toList();
    }

    /**
     * Register a new device or re-activate an existing one.
     * Idempotent on clientDeviceId.
     */
    @Transactional
    public AirVaultDeviceDto registerDevice(UUID userId, RegisterDeviceRequest req) {
        Optional<AirVaultDevice> existing = repo.findByClientDeviceId(req.getClientDeviceId());

        String username = (req.getUsername() != null && !req.getUsername().isBlank()) ? req.getUsername().trim().toLowerCase() : null;
        String rawPin = (req.getDeviceKeyword() != null && !req.getDeviceKeyword().isBlank()) ? req.getDeviceKeyword().trim() : null;

        AirVaultIdentity identity = null;
        if (username != null) {
            Optional<AirVaultIdentity> existingIdent = identityRepository.findByUsernameIgnoreCase(username);
            if (existingIdent.isPresent()) {
                AirVaultIdentity existingTarget = existingIdent.get();
                // If existing device with this clientDeviceId already has this identity, keep it
                if (existing.isPresent() && existing.get().getIdentity() != null && existing.get().getIdentity().getId().equals(existingTarget.getId())) {
                    identity = existingTarget;
                    if (rawPin != null && (identity.getPinHash() == null || passwordEncoder.matches(rawPin, identity.getPinHash()))) {
                        // Valid existing session
                    }
                } else if (rawPin != null && existingTarget.getPinHash() != null && passwordEncoder.matches(rawPin, existingTarget.getPinHash())) {
                    // Valid PIN match -> attach device to this identity
                    identity = existingTarget;
                } else {
                    // PIN did not match OR new device attempting to use an already taken username without correct PIN -> assign unique username
                    String uniqueUsername = generateUniqueUsername(username);
                    String pinHash = rawPin != null ? passwordEncoder.encode(rawPin) : passwordEncoder.encode("1234");
                    AirVaultIdentity newIdent = AirVaultIdentity.builder()
                            .username(uniqueUsername)
                            .pinHash(pinHash)
                            .isCustomized(false)
                            .build();
                    identity = identityRepository.saveAndFlush(newIdent);
                    username = uniqueUsername;
                }
            } else {
                String pinHash = rawPin != null ? passwordEncoder.encode(rawPin) : passwordEncoder.encode("1234");
                AirVaultIdentity newIdent = AirVaultIdentity.builder()
                        .username(username)
                        .pinHash(pinHash)
                        .isCustomized(false)
                        .build();
                try {
                    identity = identityRepository.saveAndFlush(newIdent);
                } catch (Exception ex) {
                    identity = identityRepository.findByUsernameIgnoreCase(username).orElse(null);
                }
            }
        }

        String resolvedDeviceName = req.getDeviceName();
        if (resolvedDeviceName == null || resolvedDeviceName.isBlank() || resolvedDeviceName.startsWith("@")) {
            resolvedDeviceName = username != null ? "@" + username : "@device";
        }

        AirVaultDevice device;
        if (existing.isPresent()) {
            device = existing.get();
            device.setDeviceName(resolvedDeviceName);
            if (userId != null) {
                device.setUserId(userId);
            }
            if (username != null) {
                device.setUsername(username);
            }
            if (identity != null) {
                device.setIdentity(identity);
                device.setPinHash(identity.getPinHash());
            } else if (rawPin != null) {
                device.setPinHash(passwordEncoder.encode(rawPin));
            }
            device.setDeviceType(req.getDeviceType());
            device.setOs(req.getOs());
            device.setBrowser(req.getBrowser());
            device.setThumbprint(req.getThumbprint());
            device.setIpHint(req.getIpHint());
            device.setStatus("active");
            device.setLastActiveAt(Instant.now());
            log.info("AirVault device re-activated: deviceId={}, username={}", req.getClientDeviceId(), username);
        } else {
            device = AirVaultDevice.builder()
                    .userId(userId)
                    .clientDeviceId(req.getClientDeviceId())
                    .deviceName(resolvedDeviceName)
                    .username(username)
                    .pinHash(identity != null ? identity.getPinHash() : (rawPin != null ? passwordEncoder.encode(rawPin) : null))
                    .identity(identity)
                    .deviceType(req.getDeviceType())
                    .os(req.getOs())
                    .browser(req.getBrowser())
                    .thumbprint(req.getThumbprint())
                    .ipHint(req.getIpHint())
                    .status("active")
                    .lastActiveAt(Instant.now())
                    .build();
            log.info("AirVault device registered: deviceId={}, username={}", req.getClientDeviceId(), username);
        }

        AirVaultDevice saved = repo.save(device);
        auditService.recordEvent(
                "device_online",
                identity != null ? identity.getId() : null,
                username,
                req.getClientDeviceId(),
                req.getIpHint(),
                null,
                "SUCCESS",
                null,
                null,
                Map.of("deviceName", req.getDeviceName() != null ? req.getDeviceName() : "AirVault Client", "deviceType", req.getDeviceType() != null ? req.getDeviceType() : "laptop")
        );
        return toDto(saved);
    }

    /**
     * Soft-revoke: sets status to "revoked" so the device can no longer sync.
     */
    @Transactional
    public void revokeDevice(UUID userId, String clientDeviceId) {
        repo.findByClientDeviceId(clientDeviceId).ifPresent(d -> {
            d.setStatus("revoked");
            d.setLastActiveAt(Instant.now());
            repo.save(d);

            // Update explicit pairings to REVOKED
            List<AirVaultDevicePairing> pairings = devicePairingRepository.findAllPairingsForClientDevice(clientDeviceId);
            for (AirVaultDevicePairing p : pairings) {
                p.setPairingState("REVOKED");
                devicePairingRepository.save(p);
            }

            log.info("AirVault device revoked: deviceId={}", clientDeviceId);
            auditService.recordEvent(
                    "device_unpaired",
                    d.getIdentity() != null ? d.getIdentity().getId() : null,
                    d.getUsername(),
                    clientDeviceId,
                    d.getIpHint(),
                    null,
                    "SUCCESS",
                    null,
                    null,
                    Map.of("action", "revoked")
            );
        });
    }

    /**
     * Heartbeat: updates lastActiveAt, ensures status is "active", and refreshes the 90s Redis presence key.
     */
    @Transactional
    public void heartbeat(UUID userId, String clientDeviceId) {
        // Refresh Redis presence key (90s TTL, expires naturally when browser closes)
        redisTracker.recordDeviceOnline(clientDeviceId);

        repo.findByClientDeviceId(clientDeviceId).ifPresent(d -> {
            d.setLastActiveAt(Instant.now());
            if (!"active".equals(d.getStatus()) && !"revoked".equals(d.getStatus())) {
                d.setStatus("active");
            }
            repo.save(d);
        });
    }

    /**
     * Presence endpoint: returns the real-time online/offline status for a device.
     * Source of truth is the Redis 90s TTL key refreshed by heartbeat.
     * Falls back to lastActiveAt comparison if Redis is unavailable.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDevicePresence(String clientDeviceId) {
        boolean online = redisTracker.isDeviceOnline(clientDeviceId);
        String status = online ? "active" : "offline";

        Instant lastActiveAt = repo.findByClientDeviceId(clientDeviceId)
                .map(AirVaultDevice::getLastActiveAt)
                .orElse(null);

        long secondsSinceActive = lastActiveAt != null
                ? Instant.now().getEpochSecond() - lastActiveAt.getEpochSecond()
                : Long.MAX_VALUE;

        return Map.of(
                "clientDeviceId", clientDeviceId,
                "status", status,
                "lastActiveAt", lastActiveAt != null ? lastActiveAt.toString() : "",
                "secondsSinceActive", secondsSinceActive
        );
    }

    /**
     * Batch presence endpoint: returns real-time online/offline status for multiple devices in a single call.
     */
    @Transactional(readOnly = true)
    public Map<String, Map<String, Object>> getMultipleDevicePresence(List<String> clientDeviceIds) {
        Map<String, Map<String, Object>> result = new HashMap<>();
        if (clientDeviceIds == null || clientDeviceIds.isEmpty()) {
            return result;
        }
        for (String id : clientDeviceIds) {
            if (id != null && !id.isBlank()) {
                result.put(id, getDevicePresence(id));
            }
        }
        return result;
    }

    /**
     * Explicit offline: called when device sends a clean DEVICE_OFFLINE beacon.
     */
    @Transactional
    public void recordDeviceOffline(UUID userId, String clientDeviceId) {
        redisTracker.recordDeviceOffline(clientDeviceId);
        repo.findByClientDeviceId(clientDeviceId).ifPresent(d -> {
            if (!"revoked".equals(d.getStatus())) {
                d.setStatus("offline");
                d.setLastActiveAt(Instant.now());
                repo.save(d);
            }
            auditService.recordEvent(
                    "device_offline",
                    d.getIdentity() != null ? d.getIdentity().getId() : null,
                    d.getUsername(),
                    clientDeviceId,
                    d.getIpHint(),
                    null,
                    "SUCCESS",
                    null,
                    null,
                    Map.of("reason", "Clean beacon offline")
            );
        });
        log.info("AirVault device marked offline (clean disconnect): deviceId={}", clientDeviceId);
    }

    /**
     * Rename device.
     */
    @Transactional
    public AirVaultDeviceDto renameDevice(UUID userId, String clientDeviceId, String newName) {
        AirVaultDevice device = repo.findByClientDeviceId(clientDeviceId)
                .orElseThrow(() -> new com.code.acklet.shared.exception.ResourceNotFoundException("Device not found: " + clientDeviceId));
        String oldName = device.getDeviceName();
        device.setDeviceName(newName.trim());
        device.setLastActiveAt(Instant.now());
        AirVaultDevice saved = repo.save(device);

        auditService.recordEvent(
                "device_renamed",
                device.getIdentity() != null ? device.getIdentity().getId() : null,
                device.getUsername(),
                clientDeviceId,
                device.getIpHint(),
                null,
                "SUCCESS",
                oldName,
                newName.trim(),
                Map.of("oldName", oldName != null ? oldName : "", "newName", newName.trim())
        );

        return toDto(saved);
    }

    /**
     * Update device sync permission.
     */
    @Transactional
    public AirVaultDeviceDto updateSyncPermission(UUID userId, String clientDeviceId, boolean enabled) {
        AirVaultDevice device = repo.findByClientDeviceId(clientDeviceId)
                .orElseThrow(() -> new com.code.acklet.shared.exception.ResourceNotFoundException("Device not found: " + clientDeviceId));
        device.setSyncEnabled(enabled);
        device.setLastActiveAt(Instant.now());
        return toDto(repo.save(device));
    }

    /**
     * Unpair: Dissolves only the specific pairing between sourceClientDeviceId and targetClientDeviceId.
     * Does NOT revoke or delete the target device record itself.
     */
    @Transactional
    public void unpairDevice(String sourceClientDeviceId, String targetClientDeviceId) {
        devicePairingRepository.findBySourceClientDeviceIdAndTargetClientDeviceId(sourceClientDeviceId, targetClientDeviceId)
                .ifPresent(p -> {
                    p.setPairingState("REVOKED");
                    devicePairingRepository.save(p);
                    log.info("AirVault device unpair: {} -> {} link marked REVOKED", sourceClientDeviceId, targetClientDeviceId);
                });
    }

    private String generateUniqueUsername(String base) {
        String clean = (base != null && !base.isBlank()) ? base.replaceAll("[^a-zA-Z0-9_-]", "").toLowerCase() : "user";
        if (clean.isBlank()) clean = "user";
        String candidate = clean;
        int attempts = 0;
        while (identityRepository.findByUsernameIgnoreCase(candidate).isPresent() && attempts < 50) {
            int randomSuffix = (int)(Math.random() * 9000) + 1000;
            candidate = clean + "-" + randomSuffix;
            attempts++;
        }
        return candidate;
    }

    private AirVaultDeviceDto toDto(AirVaultDevice d) {
        return AirVaultDeviceDto.builder()
                .id(d.getId())
                .clientDeviceId(d.getClientDeviceId())
                .name(d.getDeviceName())
                .username(d.getUsername())
                .type(d.getDeviceType())
                .os(d.getOs())
                .browser(d.getBrowser())
                .thumbprint(d.getThumbprint())
                .ipHint(d.getIpHint())
                .status(d.getStatus())
                .syncEnabled(d.getSyncEnabled())
                .accentColor(d.getAccentColor())
                .lastActiveAt(d.getLastActiveAt())
                .build();
    }
}
