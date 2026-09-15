package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultAuthDtos.*;
import com.code.acklet.airvault.entity.AirVaultDevice;
import com.code.acklet.airvault.entity.AirVaultDevicePairing;
import com.code.acklet.airvault.entity.AirVaultIdentity;
import com.code.acklet.airvault.repository.AirVaultDevicePairingRepository;
import com.code.acklet.airvault.repository.AirVaultDeviceRepository;
import com.code.acklet.airvault.repository.AirVaultIdentityRepository;
import com.code.acklet.airvault.controller.AirVaultSyncController;
import com.code.acklet.airvault.dto.SignalMessageDto;
import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultAuthService {

    private final AirVaultIdentityRepository identityRepository;
    private final AirVaultDeviceRepository deviceRepository;
    private final AirVaultDevicePairingRepository devicePairingRepository;
    private final AirVaultRedisTracker redisTracker;
    private final PasswordEncoder passwordEncoder;
    private final com.code.acklet.airvault.websocket.AirVaultWebSocketHandler webSocketHandler;
    private final AirVaultSyncRelayService syncRelayService;
    private final AirVaultAuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String[] ADJECTIVES = {
        "swift", "apex", "turbo", "hyper", "nova", "cyber", "solar",
        "echo", "shadow", "frost", "vortex", "pulse", "sonic", "alpha",
        "prime", "zenith", "quantum", "stellar", "neon", "blaze"
    };

    private static final String[] NOUNS = {
        "vault", "core", "beam", "node", "pulse", "dock", "link",
        "matrix", "mesh", "shard", "relay", "wave", "spark", "grid",
        "haven", "beacon", "forge", "orbit", "prism", "nexus"
    };


    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * 1. Auto-generate or backfill guest identity immediately to airvault_identities table.
     */
    @Transactional
    public GuestAuthResponse autoGenerateGuest(String clientDeviceId, String ip) {
        Optional<AirVaultDevice> existingDevice = deviceRepository.findByClientDeviceId(clientDeviceId);

        String username;
        String pin;
        String pinHash;
        AirVaultIdentity identity;

        if (existingDevice.isPresent() && existingDevice.get().getIdentity() != null) {
            identity = existingDevice.get().getIdentity();
            username = identity.getUsername();
            pin = generateStrongPin();
            identity.setPinHash(passwordEncoder.encode(pin));
            identity = identityRepository.saveAndFlush(identity);
        } else if (existingDevice.isPresent() && existingDevice.get().getUsername() != null && identityRepository.existsByUsernameIgnoreCase(existingDevice.get().getUsername())) {
            identity = identityRepository.findByUsernameIgnoreCase(existingDevice.get().getUsername()).get();
            username = identity.getUsername();
            pin = generateStrongPin();
            identity.setPinHash(passwordEncoder.encode(pin));
            identity = identityRepository.saveAndFlush(identity);
            existingDevice.get().setIdentity(identity);
            deviceRepository.save(existingDevice.get());
        } else {
            username = generateUniqueUsername();
            pin = generateStrongPin();
            pinHash = passwordEncoder.encode(pin);

            identity = AirVaultIdentity.builder()
                    .username(username)
                    .pinHash(pinHash)
                    .isCustomized(false)
                    .build();
            try {
                identity = identityRepository.saveAndFlush(identity);
            } catch (org.springframework.dao.DataIntegrityViolationException dive) {
                // If concurrent collision, regenerate next unique username
                username = generateUniqueUsername();
                identity.setUsername(username);
                identity = identityRepository.saveAndFlush(identity);
            }
        }

        AirVaultDevice device = existingDevice.orElseGet(() -> AirVaultDevice.builder()
                .clientDeviceId(clientDeviceId)
                .deviceName("AirVault Guest")
                .deviceType("laptop")
                .status("active")
                .build());

        device.setIdentity(identity);
        device.setUsername(username);
        device.setPinHash(identity.getPinHash());
        device.setIsCustomized(Boolean.TRUE.equals(identity.getIsCustomized()));
        device.setLastActiveAt(Instant.now());
        deviceRepository.save(device);

        String sessionToken = UUID.randomUUID().toString();
        redisTracker.storeDeviceSession(sessionToken, username, clientDeviceId, Duration.ofDays(30));

        log.info("[AirVault Auth] 👤 Generated/Persisted guest identity: username={} for deviceId={}, ip={}", username, clientDeviceId, ip);

        // Audit Event: guest_created
        auditService.recordEvent(
                "guest_created",
                identity.getId(),
                username,
                clientDeviceId,
                ip,
                null,
                "SUCCESS",
                null,
                username,
                Map.of("isCustomized", false)
        );

        return GuestAuthResponse.builder()
                .username(username)
                .pin(pin)
                .sessionToken(sessionToken)
                .clientDeviceId(clientDeviceId)
                .build();
    }

    /**
     * 2. Verify 4-digit PIN against airvault_identities table with Redis rate limiting.
     */
    @Transactional
    public AuthResponse verifyPin(VerifyPinRequest req, String ip) {
        String username = req.getUsername().toLowerCase().trim();
        String enteredPin = req.getPin() != null ? req.getPin().trim() : "";

        // Check Redis rate limits
        if (!redisTracker.checkAndIncrementAuthAttempts(username, ip)) {
            log.warn("[AirVault Auth] 🚫 Rate-limit lockout triggered for username={}, ip={}", username, ip);
            auditService.recordEvent(
                    "lockout_triggered",
                    null,
                    username,
                    req.getClientDeviceId(),
                    ip,
                    null,
                    "FAILURE",
                    null,
                    null,
                    Map.of("reason", "Rate-limit lockout triggered (5 attempts per 15 min)")
            );
            throw new BadRequestException("Too many failed attempts. Please try again in 15 minutes.");
        }

        // Query airvault_identities table (ground truth)
        AirVaultIdentity identity = identityRepository.findByUsername(username)
                .orElseThrow(() -> {
                    redisTracker.recordFailedAuthAttempt(username, ip);
                    log.warn("[AirVault Auth] ❌ Auth failed: Username '@{}' not found in airvault_identities table", username);
                    auditService.recordEvent(
                            "login_failure",
                            null,
                            username,
                            req.getClientDeviceId(),
                            ip,
                            null,
                            "FAILURE",
                            null,
                            null,
                            Map.of("reason", "Username not found")
                    );
                    return new ResourceNotFoundException("Username '@" + username + "' not found");
                });

        boolean matches = identity.getPinHash() != null && passwordEncoder.matches(enteredPin, identity.getPinHash());

        // Diagnostic log showing comparison details
        log.debug("[AirVault Auth Diagnostic] 🔍 Verifying PIN for user='@{}' -> match={}",
                username, matches);

        if (!matches) {
            redisTracker.recordFailedAuthAttempt(username, ip);
            log.warn("[AirVault Auth] ❌ Auth failed: Incorrect PIN for user='@{}'", username);
            // Record failure WITHOUT storing the attempted PIN itself
            auditService.recordEvent(
                    "login_failure",
                    identity.getId(),
                    username,
                    req.getClientDeviceId(),
                    ip,
                    null,
                    "FAILURE",
                    null,
                    null,
                    Map.of("reason", "Incorrect PIN")
            );
            throw new BadRequestException("Incorrect PIN for @" + username);
        }

        // Reset rate limiter on success
        redisTracker.clearAuthAttempts(username);

        auditService.recordEvent(
                "login_success",
                identity.getId(),
                username,
                req.getClientDeviceId(),
                ip,
                null,
                "SUCCESS",
                null,
                null,
                Map.of("deviceName", req.getDeviceName() != null ? req.getDeviceName() : "AirVault Client")
        );

        String sessionToken = UUID.randomUUID().toString();
        redisTracker.storeDeviceSession(sessionToken, username, req.getClientDeviceId(), Duration.ofDays(30));

        // Update caller device lastActiveAt without changing its own username/identity
        AirVaultDevice callerDevice = deviceRepository.findByClientDeviceId(req.getClientDeviceId())
                .orElseGet(() -> AirVaultDevice.builder()
                        .clientDeviceId(req.getClientDeviceId())
                        .deviceName(req.getDeviceName() != null ? req.getDeviceName() : "AirVault Client")
                        .deviceType(req.getDeviceType() != null ? req.getDeviceType() : "laptop")
                        .os(req.getOs())
                        .browser(req.getBrowser())
                        .thumbprint(req.getThumbprint())
                        .ipHint(req.getIpHint() != null ? req.getIpHint() : ip)
                        .status("active")
                        .build());

        callerDevice.setLastActiveAt(Instant.now());
        deviceRepository.save(callerDevice);

        // 1. Resolve or establish caller's own AirVaultIdentity
        AirVaultIdentity callerIdentity = callerDevice.getIdentity();
        if (callerIdentity == null) {
            String callerUsername = callerDevice.getUsername();
            if (callerUsername != null && !callerUsername.isBlank()) {
                callerIdentity = identityRepository.findByUsernameIgnoreCase(callerUsername).orElse(null);
            }
            if (callerIdentity == null) {
                String genUser = generateUniqueUsername();
                String genPin = generateStrongPin();
                callerIdentity = AirVaultIdentity.builder()
                        .username(genUser)
                        .pinHash(passwordEncoder.encode(genPin))
                        .isCustomized(false)
                        .build();
                callerIdentity = identityRepository.saveAndFlush(callerIdentity);
            }
            callerDevice.setIdentity(callerIdentity);
            callerDevice.setUsername(callerIdentity.getUsername());
        }

        // 2. Transactionally establish bidirectional pairing between caller and target identities
        if (!callerIdentity.getId().equals(identity.getId())) {
            callerIdentity.setPairedIdentity(identity);
            identity.setPairedIdentity(callerIdentity);
            identityRepository.save(callerIdentity);
            identityRepository.save(identity);
            log.info("[AirVault Pairing] 🔗 Mutual pairing established: callerIdentity=@{} ({}) <---> targetIdentity=@{} ({})",
                    callerIdentity.getUsername(), callerIdentity.getId(), identity.getUsername(), identity.getId());
        }

        // Find target device for meta return by target username/identity
        Optional<AirVaultDevice> targetDevOpt = deviceRepository.findByIdentity(identity).stream()
                .filter(d -> !d.getClientDeviceId().equals(req.getClientDeviceId()))
                .findFirst()
                .or(() -> deviceRepository.findByUsername(username));

        AirVaultDevice targetDev = targetDevOpt.orElse(null);
        String pairingId = null;

        // 2.5 Persist explicit bidirectional DevicePairing rows in airvault_device_pairings
        if (targetDev != null) {
            AirVaultDevicePairing p1 = devicePairingRepository.findBySourceDeviceAndTargetDevice(callerDevice, targetDev)
                    .orElseGet(() -> AirVaultDevicePairing.builder()
                            .sourceDevice(callerDevice)
                            .targetDevice(targetDev)
                            .sourceClientDeviceId(callerDevice.getClientDeviceId())
                            .targetClientDeviceId(targetDev.getClientDeviceId())
                            .pairingState("CONNECTED")
                            .syncEnabled(true)
                            .build());
            p1.setPairingState("CONNECTED");
            p1 = devicePairingRepository.save(p1);
            pairingId = p1.getId().toString();

            AirVaultDevicePairing p2 = devicePairingRepository.findBySourceDeviceAndTargetDevice(targetDev, callerDevice)
                    .orElseGet(() -> AirVaultDevicePairing.builder()
                            .sourceDevice(targetDev)
                            .targetDevice(callerDevice)
                            .sourceClientDeviceId(targetDev.getClientDeviceId())
                            .targetClientDeviceId(callerDevice.getClientDeviceId())
                            .pairingState("CONNECTED")
                            .syncEnabled(true)
                            .build());
            p2.setPairingState("CONNECTED");
            devicePairingRepository.save(p2);
        }

        String targetDeviceId = targetDevOpt.map(AirVaultDevice::getClientDeviceId).orElse("dev-" + username);
        String targetDeviceName = targetDevOpt.map(AirVaultDevice::getDeviceName).orElse("@" + username);
        String targetDeviceType = targetDevOpt.map(AirVaultDevice::getDeviceType).orElse("smartphone");
        String targetThumbprint = targetDevOpt.map(AirVaultDevice::getThumbprint).orElse("AV-" + username.toUpperCase());

        // 3. Dual Notification: Publish PAIR_CONFIRM events to BOTH parties
        try {
            // Confirmation to Target Device (B): "Paired with caller <A's device/username>"
            Map<String, Object> callerDevMap = new HashMap<>();
            callerDevMap.put("id", callerDevice.getClientDeviceId());
            callerDevMap.put("name", callerDevice.getDeviceName());
            callerDevMap.put("username", callerIdentity.getUsername());
            callerDevMap.put("type", callerDevice.getDeviceType());
            callerDevMap.put("os", callerDevice.getOs() != null ? callerDevice.getOs() : "Remote OS");
            callerDevMap.put("browser", callerDevice.getBrowser() != null ? callerDevice.getBrowser() : "Remote Browser");
            callerDevMap.put("thumbprint", callerDevice.getThumbprint() != null ? callerDevice.getThumbprint() : "AV-DEV");
            callerDevMap.put("ipHint", callerDevice.getIpHint() != null ? callerDevice.getIpHint() : "192.168.1.50");
            callerDevMap.put("status", "active");
            callerDevMap.put("lastActive", System.currentTimeMillis());
            callerDevMap.put("isCurrent", false);
            callerDevMap.put("syncEnabled", true);
            callerDevMap.put("accentColor", callerDevice.getAccentColor() != null ? callerDevice.getAccentColor() : "#10B981");

            Map<String, Object> targetConfirmPayload = new HashMap<>();
            targetConfirmPayload.put("targetDeviceId", targetDeviceId);
            targetConfirmPayload.put("targetUsername", identity.getUsername());
            targetConfirmPayload.put("pairingId", pairingId);
            targetConfirmPayload.put("device", callerDevMap);

            String targetPayloadJson = objectMapper.writeValueAsString(targetConfirmPayload);
            SignalMessageDto targetSignal = SignalMessageDto.builder()
                    .id(UUID.randomUUID().toString())
                    .senderDeviceId(callerDevice.getClientDeviceId())
                    .targetDeviceId(targetDeviceId)
                    .signalType("PAIR_CONFIRM")
                    .payload(targetPayloadJson)
                    .pairingId(pairingId)
                    .timestamp(Instant.now())
                    .build();
            com.code.acklet.airvault.websocket.dto.AirVaultWsMessage wsTargetMsg = com.code.acklet.airvault.websocket.dto.AirVaultWsMessage.builder()
                    .type("PAIR_CONFIRM")
                    .senderDeviceId(callerDevice.getClientDeviceId())
                    .targetDeviceId(targetDeviceId)
                    .payload(targetPayloadJson)
                    .timestamp(System.currentTimeMillis())
                    .build();
            webSocketHandler.sendToDevice(targetDeviceId, wsTargetMsg);
            syncRelayService.publishSyncEvent(targetSignal);

            // Confirmation to Caller Device (A): "Paired with target <B's device/username>"
            Map<String, Object> targetDevMap = new HashMap<>();
            targetDevMap.put("id", targetDeviceId);
            targetDevMap.put("name", targetDeviceName);
            targetDevMap.put("username", identity.getUsername());
            targetDevMap.put("type", targetDeviceType);
            targetDevMap.put("os", targetDevOpt.map(AirVaultDevice::getOs).orElse("Remote OS"));
            targetDevMap.put("browser", targetDevOpt.map(AirVaultDevice::getBrowser).orElse("Remote Browser"));
            targetDevMap.put("thumbprint", targetThumbprint);
            targetDevMap.put("ipHint", targetDevOpt.map(AirVaultDevice::getIpHint).orElse("192.168.1.50"));
            targetDevMap.put("status", "active");
            targetDevMap.put("lastActive", System.currentTimeMillis());
            targetDevMap.put("isCurrent", false);
            targetDevMap.put("syncEnabled", true);
            targetDevMap.put("accentColor", targetDevOpt.map(AirVaultDevice::getAccentColor).orElse("#10B981"));

            Map<String, Object> callerConfirmPayload = new HashMap<>();
            callerConfirmPayload.put("targetDeviceId", callerDevice.getClientDeviceId());
            callerConfirmPayload.put("targetUsername", callerIdentity.getUsername());
            callerConfirmPayload.put("pairingId", pairingId);
            callerConfirmPayload.put("device", targetDevMap);

            String callerPayloadJson = objectMapper.writeValueAsString(callerConfirmPayload);
            SignalMessageDto callerSignal = SignalMessageDto.builder()
                    .id(UUID.randomUUID().toString())
                    .senderDeviceId(targetDeviceId)
                    .targetDeviceId(callerDevice.getClientDeviceId())
                    .signalType("PAIR_CONFIRM")
                    .payload(callerPayloadJson)
                    .pairingId(pairingId)
                    .timestamp(Instant.now())
                    .build();
            com.code.acklet.airvault.websocket.dto.AirVaultWsMessage wsCallerMsg = com.code.acklet.airvault.websocket.dto.AirVaultWsMessage.builder()
                    .type("PAIR_CONFIRM")
                    .senderDeviceId(targetDeviceId)
                    .targetDeviceId(callerDevice.getClientDeviceId())
                    .payload(callerPayloadJson)
                    .timestamp(System.currentTimeMillis())
                    .build();
            webSocketHandler.sendToDevice(callerDevice.getClientDeviceId(), wsCallerMsg);
            syncRelayService.publishSyncEvent(callerSignal);

            log.info("[AirVault Pairing] 🚀 Published bidirectional PAIR_CONFIRM signals to initiator={} and target={}",
                    callerDevice.getClientDeviceId(), targetDeviceId);
        } catch (Exception ex) {
            log.warn("[AirVault Pairing] ⚠️ Non-fatal exception publishing PAIR_CONFIRM signals: {}", ex.getMessage());
        }

        log.info("[AirVault Auth] ✅ Successful PIN auth/login: callerDevice={}, callerIdentity=@{}, targetDevice={}, targetDeviceId={}",
                req.getClientDeviceId(), callerIdentity.getUsername(), targetDeviceName, targetDeviceId);

        return AuthResponse.builder()
                .username(username)
                .sessionToken(sessionToken)
                .clientDeviceId(req.getClientDeviceId())
                .isCustomized(Boolean.TRUE.equals(identity.getIsCustomized()))
                .targetDeviceId(targetDeviceId)
                .targetDeviceName(targetDeviceName)
                .targetDeviceType(targetDeviceType)
                .targetThumbprint(targetThumbprint)
                .pairingId(pairingId)
                .pairingState("CONNECTED")
                .build();
    }

    /**
     * 2.5 Login with Existing Identity: Attaches calling device to an existing identity with matching PIN.
     */
    @Transactional
    public AuthResponse loginExistingIdentity(VerifyPinRequest req, String ip) {
        String username = req.getUsername().toLowerCase().trim();
        String enteredPin = req.getPin() != null ? req.getPin().trim() : "";

        // 1. Check Redis rate limits
        if (!redisTracker.checkAndIncrementAuthAttempts(username, ip)) {
            log.warn("[AirVault Auth] 🚫 Rate-limit lockout triggered for username={}, ip={}", username, ip);
            throw new BadRequestException("Too many failed attempts. Please try again in 15 minutes.");
        }

        // 2. Query airvault_identities table (ground truth)
        AirVaultIdentity identity = identityRepository.findByUsername(username)
                .orElseThrow(() -> {
                    redisTracker.recordFailedAuthAttempt(username, ip);
                    log.warn("[AirVault Auth] ❌ Login failed: Username '@{}' not found", username);
                    return new ResourceNotFoundException("Username '@" + username + "' not found");
                });

        boolean matches = identity.getPinHash() != null && passwordEncoder.matches(enteredPin, identity.getPinHash());
        if (!matches) {
            redisTracker.recordFailedAuthAttempt(username, ip);
            log.warn("[AirVault Auth] ❌ Login failed: Incorrect PIN for user='@{}'", username);
            throw new BadRequestException("Incorrect PIN for @" + username);
        }

        // Reset rate limiter on success
        redisTracker.clearAuthAttempts(username);

        // 3. Attach calling device to this identity
        Optional<AirVaultDevice> existingDevOpt = deviceRepository.findByClientDeviceId(req.getClientDeviceId());
        AirVaultDevice callerDevice;
        if (existingDevOpt.isPresent()) {
            callerDevice = existingDevOpt.get();
            AirVaultIdentity oldIdent = callerDevice.getIdentity();
            // If previous identity was a temporary uncustomized guest with no other devices, clean it up
            if (oldIdent != null && !oldIdent.getId().equals(identity.getId()) && !Boolean.TRUE.equals(oldIdent.getIsCustomized())) {
                List<AirVaultDevice> devicesUnderOld = deviceRepository.findByIdentity(oldIdent);
                if (devicesUnderOld.size() <= 1) {
                    callerDevice.setIdentity(null);
                    deviceRepository.saveAndFlush(callerDevice);
                    try {
                        identityRepository.delete(oldIdent);
                    } catch (Exception ignored) {}
                }
            }
        } else {
            callerDevice = AirVaultDevice.builder()
                    .clientDeviceId(req.getClientDeviceId())
                    .deviceName(req.getDeviceName() != null ? req.getDeviceName() : "@" + username)
                    .deviceType(req.getDeviceType() != null ? req.getDeviceType() : "laptop")
                    .os(req.getOs())
                    .browser(req.getBrowser())
                    .thumbprint(req.getThumbprint())
                    .ipHint(req.getIpHint() != null ? req.getIpHint() : ip)
                    .build();
        }

        callerDevice.setIdentity(identity);
        callerDevice.setUsername(identity.getUsername());
        callerDevice.setPinHash(identity.getPinHash());
        callerDevice.setIsCustomized(true);
        callerDevice.setStatus("active");
        callerDevice.setLastActiveAt(Instant.now());
        deviceRepository.save(callerDevice);

        String sessionToken = UUID.randomUUID().toString();
        redisTracker.storeDeviceSession(sessionToken, username, req.getClientDeviceId(), Duration.ofDays(30));

        // 4. Resolve paired identity and explicit pairings
        AirVaultIdentity pairedIdent = identity.getPairedIdentity();
        String targetDeviceId = null;
        String targetDeviceName = null;
        String targetDeviceType = null;
        String targetThumbprint = null;
        String pairingId = null;

        // Authoritatively check if caller device already has an explicit pairing
        List<AirVaultDevicePairing> activePairings = devicePairingRepository.findBySourceClientDeviceIdAndPairingStateNot(callerDevice.getClientDeviceId(), "REVOKED");
        if (!activePairings.isEmpty()) {
            AirVaultDevicePairing pairing = activePairings.get(0);
            AirVaultDevice pairedDev = pairing.getTargetDevice();
            if (pairedDev != null && !"revoked".equals(pairedDev.getStatus())) {
                targetDeviceId = pairedDev.getClientDeviceId();
                targetDeviceName = pairedDev.getDeviceName();
                targetDeviceType = pairedDev.getDeviceType();
                targetThumbprint = pairedDev.getThumbprint();
                pairingId = pairing.getId().toString();

                // Notify explicitly paired peer that this device is online
                try {
                    Map<String, Object> callerDevMap = new HashMap<>();
                    callerDevMap.put("id", callerDevice.getClientDeviceId());
                    callerDevMap.put("name", callerDevice.getDeviceName());
                    callerDevMap.put("username", identity.getUsername());
                    callerDevMap.put("type", callerDevice.getDeviceType());
                    callerDevMap.put("status", "active");
                    callerDevMap.put("lastActive", System.currentTimeMillis());
                    callerDevMap.put("isCurrent", false);
                    callerDevMap.put("syncEnabled", true);

                    String onlinePayloadJson = objectMapper.writeValueAsString(Map.of("deviceId", callerDevice.getClientDeviceId(), "senderDevice", callerDevMap));
                    SignalMessageDto signal = SignalMessageDto.builder()
                            .id(UUID.randomUUID().toString())
                            .senderDeviceId(callerDevice.getClientDeviceId())
                            .targetDeviceId(targetDeviceId)
                            .signalType("DEVICE_ONLINE")
                            .payload(onlinePayloadJson)
                            .timestamp(Instant.now())
                            .build();
                    com.code.acklet.airvault.websocket.dto.AirVaultWsMessage wsOnlineMsg = com.code.acklet.airvault.websocket.dto.AirVaultWsMessage.builder()
                            .type("DEVICE_ONLINE")
                            .senderDeviceId(callerDevice.getClientDeviceId())
                            .targetDeviceId(targetDeviceId)
                            .payload(onlinePayloadJson)
                            .timestamp(System.currentTimeMillis())
                            .build();
                    webSocketHandler.sendToDevice(targetDeviceId, wsOnlineMsg);
                    syncRelayService.publishSyncEvent(signal);
                } catch (Exception ex) {
                    log.warn("[AirVault Auth] Non-fatal error dispatching signal to paired peer: {}", ex.getMessage());
                }
            }
        }

        log.info("[AirVault Auth] 🔑 Device '{}' successfully logged into existing identity '@{}'", req.getClientDeviceId(), username);

        return AuthResponse.builder()
                .username(username)
                .sessionToken(sessionToken)
                .clientDeviceId(req.getClientDeviceId())
                .isCustomized(true)
                .targetDeviceId(targetDeviceId)
                .targetDeviceName(targetDeviceName)
                .targetDeviceType(targetDeviceType)
                .targetThumbprint(targetThumbprint)
                .pairingId(pairingId)
                .pairingState(!activePairings.isEmpty() ? activePairings.get(0).getPairingState() : null)
                .build();
    }

    /**
     * 3. Customize username and PIN: updates existing identity row or registers phantom identities.
     */
    @Transactional
    public AuthResponse customizeIdentity(CustomizeIdentityRequest req, String ip) {
        String newUsername = req.getUsername().toLowerCase().trim();
        validatePin(req.getPin());

        AirVaultDevice device = deviceRepository.findByClientDeviceId(req.getClientDeviceId())
                .orElseGet(() -> AirVaultDevice.builder()
                        .clientDeviceId(req.getClientDeviceId())
                        .deviceName(req.getDeviceName() != null ? req.getDeviceName() : "AirVault Client")
                        .deviceType(req.getDeviceType() != null ? req.getDeviceType() : "laptop")
                        .status("active")
                        .build());

        AirVaultIdentity identity = device.getIdentity();
        String newPinHash = passwordEncoder.encode(req.getPin());

        Optional<AirVaultIdentity> existingWithNewName = identityRepository.findByUsernameIgnoreCase(newUsername);

        if (identity == null) {
            // If device had no identity, attach to existing one or create new
            identity = existingWithNewName.orElseGet(() ->
                    AirVaultIdentity.builder()
                            .username(newUsername)
                            .pinHash(newPinHash)
                            .isCustomized(true)
                            .build());
        } else {
            // Device already has an identity
            if (!newUsername.equalsIgnoreCase(identity.getUsername())) {
                if (existingWithNewName.isPresent() && !existingWithNewName.get().getId().equals(identity.getId())) {
                    // Check if PIN matches existing identity (claiming / re-attaching this device to existing identity)
                    AirVaultIdentity existingTarget = existingWithNewName.get();
                    if (existingTarget.getPinHash() != null && passwordEncoder.matches(req.getPin(), existingTarget.getPinHash())) {
                        log.info("[AirVault Auth] 🔄 Device '{}' re-attaching to existing identity '@{}' with matching PIN in customize",
                                req.getClientDeviceId(), newUsername);
                        identity = existingTarget;
                    } else {
                        throw new BadRequestException("Username '@" + newUsername + "' is already taken. Please choose another.");
                    }
                } else {
                    String oldUsername = identity.getUsername();
                    if (oldUsername != null) {
                        redisTracker.invalidateAllUserSessions(oldUsername);
                    }
                    identity.setUsername(newUsername);
                }
            }
        }

        identity.setPinHash(newPinHash);
        identity.setIsCustomized(true);

        try {
            identity = identityRepository.saveAndFlush(identity);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            log.warn("[AirVault Auth] ⚠️ Concurrent collision on unique username '@{}': {}", newUsername, dive.getMessage());
            throw new BadRequestException("Username '@" + newUsername + "' is already taken. Please choose another.");
        }

        device.setIdentity(identity);
        device.setUsername(newUsername);
        device.setPinHash(newPinHash);
        device.setIsCustomized(true);
        device.setLastActiveAt(Instant.now());
        deviceRepository.save(device);

        // Update all other devices associated with this identity so they reflect the new username
        List<AirVaultDevice> siblingDevices = deviceRepository.findByIdentity(identity);
        for (AirVaultDevice sibling : siblingDevices) {
            if (!sibling.getClientDeviceId().equals(device.getClientDeviceId())) {
                sibling.setUsername(newUsername);
                sibling.setPinHash(newPinHash);
                sibling.setIsCustomized(true);
                deviceRepository.save(sibling);
            }
        }

        String newSessionToken = UUID.randomUUID().toString();
        redisTracker.storeDeviceSession(newSessionToken, newUsername, req.getClientDeviceId(), Duration.ofDays(30));

        log.info("[AirVault Auth] 💎 Identity customized & reserved in DB: username={}, deviceId={}, ip={}", newUsername, req.getClientDeviceId(), ip);

        // Audit Event: username_renamed or pin_changed
        String priorUsername = (identity != null && identity.getUsername() != null) ? identity.getUsername() : "";
        if (!priorUsername.equalsIgnoreCase(newUsername)) {
            auditService.recordEvent(
                    "username_renamed",
                    identity.getId(),
                    newUsername,
                    req.getClientDeviceId(),
                    ip,
                    null,
                    "SUCCESS",
                    priorUsername,
                    newUsername,
                    Map.of("oldUsername", priorUsername, "newUsername", newUsername)
            );
        }
        auditService.recordEvent(
                "pin_changed",
                identity.getId(),
                newUsername,
                req.getClientDeviceId(),
                ip,
                null,
                "SUCCESS",
                "***PROTECTED***",
                "***PROTECTED***",
                Map.of("updated", true)
        );

        return AuthResponse.builder()
                .username(newUsername)
                .sessionToken(newSessionToken)
                .clientDeviceId(req.getClientDeviceId())
                .isCustomized(true)
                .build();
    }

    /**
     * 4. Generate short-lived QR Pairing Token (60-120s).
     */
    public QrPairingInitResponse generateQrPairingToken(String username, String clientDeviceId) {
        String qrToken = "qr_" + UUID.randomUUID().toString().replace("-", "");
        redisTracker.createQrPairingToken(qrToken, username, clientDeviceId, Duration.ofSeconds(90));
        log.info("[AirVault Auth] 📱 Issued QR pairing token for username={}, deviceId={}", username, clientDeviceId);

        auditService.recordEvent(
                "qr_initiated",
                null,
                username,
                clientDeviceId,
                null,
                null,
                "SUCCESS",
                null,
                null,
                Map.of("qrTokenPrefix", qrToken.substring(0, 8), "expiresInSeconds", 90)
        );

        return QrPairingInitResponse.builder()
                .qrToken(qrToken)
                .expiresInSeconds(90)
                .build();
    }

    /**
     * 5. Confirm QR Pairing & Issue Session Token to new device.
     */
    @Transactional
    public AuthResponse confirmQrPairing(QrPairingConfirmRequest req, String ip) {
        String sessionPayload = redisTracker.consumeQrPairingToken(req.getQrToken());
        if (sessionPayload == null) {
            auditService.recordEvent(
                    "qr_expired",
                    null,
                    null,
                    req.getClientDeviceId(),
                    ip,
                    null,
                    "FAILURE",
                    null,
                    null,
                    Map.of("reason", "QR pairing token expired or consumed")
            );
            throw new BadRequestException("QR pairing token has expired or already been used.");
        }

        String[] parts = sessionPayload.split(":");
        String username = parts[0];

        AirVaultIdentity identity = identityRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Identity not found: " + username));

        AirVaultDevice newDevice = deviceRepository.findByClientDeviceId(req.getClientDeviceId())
                .orElseGet(() -> AirVaultDevice.builder()
                        .clientDeviceId(req.getClientDeviceId())
                        .deviceName(req.getDeviceName())
                        .deviceType(req.getDeviceType())
                        .username(username)
                        .status("active")
                        .build());

        newDevice.setIdentity(identity);
        newDevice.setUsername(username);
        newDevice.setLastActiveAt(Instant.now());
        deviceRepository.save(newDevice);

        String sessionToken = UUID.randomUUID().toString();
        redisTracker.storeDeviceSession(sessionToken, username, req.getClientDeviceId(), Duration.ofDays(30));

        log.info("[AirVault Auth] 🔗 QR Pairing successful: username={}, newDeviceId={}, ip={}", username, req.getClientDeviceId(), ip);

        auditService.recordEvent(
                "qr_confirmed",
                identity.getId(),
                username,
                req.getClientDeviceId(),
                ip,
                null,
                "SUCCESS",
                null,
                null,
                Map.of("deviceName", req.getDeviceName() != null ? req.getDeviceName() : "AirVault Client")
        );

        return AuthResponse.builder()
                .username(username)
                .sessionToken(sessionToken)
                .clientDeviceId(req.getClientDeviceId())
                .isCustomized(true)
                .build();
    }

    /**
     * 6. Live check if a username is available.
     */
    @Transactional(readOnly = true)
    public UsernameAvailabilityResponse checkUsernameAvailability(String username) {
        if (username == null || username.trim().isEmpty()) {
            return UsernameAvailabilityResponse.builder()
                    .username("")
                    .available(false)
                    .message("Username cannot be empty")
                    .build();
        }

        String normalized = username.trim().toLowerCase();
        if (normalized.length() < 3 || normalized.length() > 30) {
            return UsernameAvailabilityResponse.builder()
                    .username(normalized)
                    .available(false)
                    .message("Must be between 3 and 30 characters")
                    .build();
        }

        if (!normalized.matches("^[a-z0-9_.-]+$")) {
            return UsernameAvailabilityResponse.builder()
                    .username(normalized)
                    .available(false)
                    .message("Only lowercase letters, numbers, hyphens, underscores, and dots allowed")
                    .build();
        }

        boolean exists = identityRepository.existsByUsernameIgnoreCase(normalized);
        return UsernameAvailabilityResponse.builder()
                .username(normalized)
                .available(!exists)
                .message(exists ? "Username is already taken" : "Username is available")
                .build();
    }

    /**
     * 7. Reconcile Pairing State: Queries database to check if calling device has an active paired device.
     */
    @Transactional(readOnly = true)
    public ReconcilePairingResponse reconcilePairing(String clientDeviceId) {
        Optional<AirVaultDevice> devOpt = deviceRepository.findByClientDeviceId(clientDeviceId);
        if (devOpt.isEmpty() || devOpt.get().getIdentity() == null) {
            return ReconcilePairingResponse.builder()
                    .isPaired(false)
                    .build();
        }

        AirVaultDevice callerDev = devOpt.get();
        AirVaultIdentity selfIdent = callerDev.getIdentity();

        // 1. Authoritative check: airvault_device_pairings table
        List<AirVaultDevicePairing> activePairings = devicePairingRepository.findBySourceClientDeviceIdAndPairingStateNot(clientDeviceId, "REVOKED");
        if (!activePairings.isEmpty()) {
            AirVaultDevicePairing pairing = activePairings.get(0);
            AirVaultDevice pairedDev = pairing.getTargetDevice();
            if (pairedDev != null && !"revoked".equals(pairedDev.getStatus())) {
                String pairedUsername = pairedDev.getUsername() != null ? pairedDev.getUsername() : (pairedDev.getIdentity() != null ? pairedDev.getIdentity().getUsername() : "peer");
                return ReconcilePairingResponse.builder()
                        .isPaired(true)
                        .selfUsername(selfIdent.getUsername())
                        .pairedUsername(pairedUsername)
                        .pairedDeviceId(pairedDev.getClientDeviceId())
                        .pairedDeviceName(pairedDev.getDeviceName())
                        .pairedDeviceType(pairedDev.getDeviceType())
                        .pairedThumbprint(pairedDev.getThumbprint())
                        .pairingId(pairing.getId().toString())
                        .pairingState(pairing.getPairingState())
                        .build();
            }
        }

        // 2. Backward-compatible fallback: identity.getPairedIdentity()
        AirVaultIdentity pairedIdent = selfIdent.getPairedIdentity();
        if (pairedIdent == null) {
            return ReconcilePairingResponse.builder()
                    .isPaired(false)
                    .selfUsername(selfIdent.getUsername())
                    .build();
        }

        // Lookup paired identity's active device
        Optional<AirVaultDevice> pairedDevOpt = deviceRepository.findByIdentity(pairedIdent).stream()
                .filter(d -> !"revoked".equals(d.getStatus()))
                .findFirst()
                .or(() -> deviceRepository.findByUsername(pairedIdent.getUsername()));

        String pairedDeviceId = pairedDevOpt.map(AirVaultDevice::getClientDeviceId).orElse("dev-" + pairedIdent.getUsername());
        String pairedDeviceName = pairedDevOpt.map(AirVaultDevice::getDeviceName).orElse("@" + pairedIdent.getUsername());
        String pairedDeviceType = pairedDevOpt.map(AirVaultDevice::getDeviceType).orElse("smartphone");
        String pairedThumbprint = pairedDevOpt.map(AirVaultDevice::getThumbprint).orElse("AV-" + pairedIdent.getUsername().toUpperCase());

        return ReconcilePairingResponse.builder()
                .isPaired(true)
                .selfUsername(selfIdent.getUsername())
                .pairedUsername(pairedIdent.getUsername())
                .pairedDeviceId(pairedDeviceId)
                .pairedDeviceName(pairedDeviceName)
                .pairedDeviceType(pairedDeviceType)
                .pairedThumbprint(pairedThumbprint)
                .build();
    }

    /**
     * 8. Erase Device Data: Wipes local device data, unlinks caller device, and clears device session,
     * while preserving the AirVaultIdentity credentials (username and hashed PIN) so the user can re-authenticate anytime.
     */
    @Transactional
    public void eraseEverything(String clientDeviceId, String username) {
        log.warn("[AirVault Erase] 🧹 Executing device data erase for clientDeviceId={}, username={}", clientDeviceId, username);

        // 1. Invalidate Redis rate limits for the user
        if (username != null && !username.isBlank()) {
            String norm = username.trim().toLowerCase();
            redisTracker.clearAuthAttempts(norm);
        }

        // 2. Unlink device pairings and remove device registration
        List<AirVaultDevicePairing> pairings = devicePairingRepository.findAllPairingsForClientDevice(clientDeviceId);
        if (!pairings.isEmpty()) {
            devicePairingRepository.deleteAll(pairings);
            devicePairingRepository.flush();
        }

        deviceRepository.findByClientDeviceId(clientDeviceId).ifPresent(d -> {
            d.setIdentity(null);
            deviceRepository.delete(d);
            deviceRepository.flush();
            log.info("[AirVault Erase] 🗑️ Cleaned up device registration: {}", clientDeviceId);
        });
    }

    private String generateUniqueUsername() {
        for (int i = 0; i < 30; i++) {
            String adj = ADJECTIVES[secureRandom.nextInt(ADJECTIVES.length)];
            String noun = NOUNS[secureRandom.nextInt(NOUNS.length)];
            String base = adj + "-" + noun;
            String candidate = base;
            
            if (!identityRepository.existsByUsernameIgnoreCase(candidate)) {
                return candidate;
            }
            
            // On collision, try short numeric suffix
            for (int suffix = 2; suffix <= 99; suffix++) {
                String suffixed = base + "-" + suffix;
                if (!identityRepository.existsByUsernameIgnoreCase(suffixed)) {
                    return suffixed;
                }
            }
        }
        
        // Deterministic fallback if word combinations are exhausted
        int fallbackNum = 1;
        while (identityRepository.existsByUsernameIgnoreCase("guest-" + fallbackNum)) {
            fallbackNum++;
        }
        return "guest-" + fallbackNum;
    }

    private String generateStrongPin() {
        int num = 1000 + secureRandom.nextInt(9000);
        return String.valueOf(num);
    }

    private void validatePin(String pin) {
        if (pin == null || !pin.matches("^\\d{4}$")) {
            throw new BadRequestException("PIN must be exactly 4 digits");
        }
    }
}
