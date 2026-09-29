package com.code.acklet.airvault.service;

import com.code.acklet.airvault.controller.AirVaultSyncController;
import com.code.acklet.airvault.dto.AirVaultAuthDtos.*;
import com.code.acklet.airvault.dto.SignalMessageDto;
import com.code.acklet.airvault.entity.AirVaultDevice;
import com.code.acklet.airvault.entity.AirVaultIdentity;
import com.code.acklet.airvault.repository.AirVaultDevicePairingRepository;
import com.code.acklet.airvault.repository.AirVaultDeviceRepository;
import com.code.acklet.airvault.repository.AirVaultIdentityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AirVaultAuthServiceTest {

    @Mock
    private AirVaultIdentityRepository identityRepository;

    @Mock
    private AirVaultDeviceRepository deviceRepository;

    @Mock
    private AirVaultDevicePairingRepository devicePairingRepository;

    @Mock
    private AirVaultRedisTracker redisTracker;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private com.code.acklet.airvault.websocket.AirVaultWebSocketHandler webSocketHandler;

    @Mock
    private AirVaultSyncRelayService syncRelayService;

    @Mock
    private AirVaultAuditService auditService;

    @Mock
    private com.code.acklet.airvault.security.AirVaultTokenService tokenService;

    @InjectMocks
    private AirVaultAuthService authService;

    private AirVaultIdentity identityA;
    private AirVaultIdentity identityB;
    private AirVaultDevice deviceA;
    private AirVaultDevice deviceB;

    @BeforeEach
    void setUp() {
        identityA = AirVaultIdentity.builder()
                .id(UUID.randomUUID())
                .username("device-a")
                .pinHash("$2a$10$hashA")
                .isCustomized(true)
                .build();

        identityB = AirVaultIdentity.builder()
                .id(UUID.randomUUID())
                .username("device-b")
                .pinHash("$2a$10$hashB")
                .isCustomized(true)
                .build();

        deviceA = AirVaultDevice.builder()
                .id(UUID.randomUUID())
                .clientDeviceId("dev-a123")
                .deviceName("Device A")
                .identity(identityA)
                .username("device-a")
                .deviceType("laptop")
                .status("active")
                .build();

        deviceB = AirVaultDevice.builder()
                .id(UUID.randomUUID())
                .clientDeviceId("dev-b456")
                .deviceName("Device B")
                .identity(identityB)
                .username("device-b")
                .deviceType("smartphone")
                .status("active")
                .build();
    }

    @Test
    void testBidirectionalPairingAndDualNotification() {
        // Device A enters Device B's username and PIN
        VerifyPinRequest request = VerifyPinRequest.builder()
                .username("device-b")
                .pin("1234")
                .clientDeviceId("dev-a123")
                .deviceName("Device A")
                .deviceType("laptop")
                .build();

        when(redisTracker.checkAndIncrementAuthAttempts(eq("device-b"), any())).thenReturn(true);
        when(identityRepository.findByUsername("device-b")).thenReturn(Optional.of(identityB));
        when(passwordEncoder.matches("1234", "$2a$10$hashB")).thenReturn(true);
        when(deviceRepository.findByClientDeviceId("dev-a123")).thenReturn(Optional.of(deviceA));
        when(deviceRepository.findByIdentity(identityB)).thenReturn(java.util.List.of(deviceB));
        when(devicePairingRepository.save(any())).thenAnswer(inv -> {
            com.code.acklet.airvault.entity.AirVaultDevicePairing p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });
        when(tokenService.generateUserToken(any(), any())).thenReturn("mock-jwt-token");

        AuthResponse response = authService.verifyPin(request, "127.0.0.1");

        assertNotNull(response);
        assertEquals("device-b", response.getUsername());
        assertEquals("dev-b456", response.getTargetDeviceId());
        assertNotNull(response.getPairingId());

        // Assert explicit device pairing saved
        verify(devicePairingRepository, times(2)).save(any());

        // Assert mutual pairing link established on both entities
        assertEquals(identityB, identityA.getPairedIdentity());
        assertEquals(identityA, identityB.getPairedIdentity());
        verify(identityRepository, atLeastOnce()).save(identityA);
        verify(identityRepository, atLeastOnce()).save(identityB);

        // Assert dual PAIR_CONFIRM events dispatched via syncRelayService and webSocketHandler
        ArgumentCaptor<SignalMessageDto> signalCaptor = ArgumentCaptor.forClass(SignalMessageDto.class);
        verify(syncRelayService, times(2)).publishSyncEvent(signalCaptor.capture());
        verify(webSocketHandler, times(2)).sendToDevice(anyString(), any());

        java.util.List<SignalMessageDto> dispatchedSignals = signalCaptor.getAllValues();
        assertEquals(2, dispatchedSignals.size());

        boolean hasSignalForA = dispatchedSignals.stream().anyMatch(s -> "dev-a123".equals(s.getTargetDeviceId()));
        boolean hasSignalForB = dispatchedSignals.stream().anyMatch(s -> "dev-b456".equals(s.getTargetDeviceId()));
        assertTrue(hasSignalForA, "Expected PAIR_CONFIRM signal targeted to Device A");
        assertTrue(hasSignalForB, "Expected PAIR_CONFIRM signal targeted to Device B");
    }

    @Test
    void testReconcilePairing() {
        identityA.setPairedIdentity(identityB);
        when(deviceRepository.findByClientDeviceId("dev-a123")).thenReturn(Optional.of(deviceA));
        when(deviceRepository.findByIdentity(identityB)).thenReturn(java.util.List.of(deviceB));

        ReconcilePairingResponse reconcile = authService.reconcilePairing("dev-a123");

        assertNotNull(reconcile);
        assertTrue(reconcile.isPaired());
        assertEquals("device-a", reconcile.getSelfUsername());
        assertEquals("device-b", reconcile.getPairedUsername());
        assertEquals("dev-b456", reconcile.getPairedDeviceId());
    }

    @Test
    void testGenerateQrPairingToken_Uses120sExpiration() {
        QrPairingInitResponse res = authService.generateQrPairingToken("device-a", "dev-a123");
        assertNotNull(res);
        assertNotNull(res.getQrToken());
        assertEquals(120, res.getExpiresInSeconds());
        verify(redisTracker).createQrPairingToken(eq(res.getQrToken()), eq("device-a"), eq("dev-a123"), eq(java.time.Duration.ofSeconds(120)));
    }

    @Test
    void testCustomizeIdentity_EnforcesMin6Digits() {
        CustomizeIdentityRequest shortPinReq = CustomizeIdentityRequest.builder()
                .username("newuser")
                .pin("1234") // 4 digits - invalid for custom
                .clientDeviceId("dev-a123")
                .build();

        assertThrows(com.code.acklet.shared.exception.BadRequestException.class, () -> {
            authService.customizeIdentity(shortPinReq, "127.0.0.1");
        });

        CustomizeIdentityRequest validPinReq = CustomizeIdentityRequest.builder()
                .username("newuser")
                .pin("123456") // 6 digits - valid
                .clientDeviceId("dev-a123")
                .build();

        when(deviceRepository.findByClientDeviceId("dev-a123")).thenReturn(Optional.of(deviceA));
        when(identityRepository.findByUsernameIgnoreCase("newuser")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("123456")).thenReturn("$2a$10$newHash");
        when(identityRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(tokenService.generateUserToken(eq("newuser"), eq("dev-a123"))).thenReturn("jwt-custom");

        AuthResponse customRes = authService.customizeIdentity(validPinReq, "127.0.0.1");
        assertNotNull(customRes);
        assertEquals("newuser", customRes.getUsername());
    }

    @Test
    void testConfirmQrPairing_DispatchesNewDeviceSignedInNotification() {
        QrPairingConfirmRequest req = QrPairingConfirmRequest.builder()
                .qrToken("qr_test123")
                .clientDeviceId("dev-new789")
                .deviceName("iPad Pro")
                .deviceType("tablet")
                .build();

        when(redisTracker.consumeQrPairingToken("qr_test123")).thenReturn("device-a:dev-a123");
        when(identityRepository.findByUsername("device-a")).thenReturn(Optional.of(identityA));
        when(deviceRepository.findByClientDeviceId("dev-new789")).thenReturn(Optional.empty());
        when(deviceRepository.findByIdentity(identityA)).thenReturn(java.util.List.of(deviceA));
        when(tokenService.generateUserToken(eq("device-a"), eq("dev-new789"))).thenReturn("jwt-new-dev");

        AuthResponse res = authService.confirmQrPairing(req, "192.168.1.100");
        assertNotNull(res);
        assertEquals("device-a", res.getUsername());
        assertEquals("dev-new789", res.getClientDeviceId());

        // Verify WebSocket message dispatched to deviceA
        verify(webSocketHandler).sendToDevice(eq("dev-a123"), any());
        verify(syncRelayService).publishSyncEvent(any(SignalMessageDto.class));
    }
}
