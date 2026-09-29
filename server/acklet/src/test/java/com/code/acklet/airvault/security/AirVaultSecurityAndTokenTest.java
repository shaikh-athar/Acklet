package com.code.acklet.airvault.security;

import com.code.acklet.airvault.entity.AirVaultCollaborator;
import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import com.code.acklet.airvault.repository.AirVaultCollaboratorRepository;
import com.code.acklet.airvault.repository.AirVaultInvitationRepository;
import com.code.acklet.airvault.repository.AirVaultSharedClipboardRepository;
import com.code.acklet.config.properties.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AirVaultSecurityAndTokenTest {

    private AirVaultTokenService tokenService;

    @Mock
    private AirVaultSharedClipboardRepository clipboardRepository;

    @Mock
    private AirVaultCollaboratorRepository collaboratorRepository;

    private AirVaultAuthorizationService authorizationService;

    private AirVaultSharedClipboard clipboardA;
    private AirVaultSharedClipboard clipboardB;
    private AirVaultSharedClipboard publicReadOnlyClipboard;

    @BeforeEach
    void setUp() {
        tokenService = new AirVaultTokenService(new AppProperties());
        authorizationService = new AirVaultAuthorizationService(
                clipboardRepository,
                collaboratorRepository
        );

        clipboardA = AirVaultSharedClipboard.builder()
                .id("clip-aaa11111")
                .ownerUsername("alice")
                .ownerDeviceId("alice-macbook")
                .title("Alice's Clipboard")
                .accessMode("read-write")
                .nextSeq(1L)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();

        clipboardB = AirVaultSharedClipboard.builder()
                .id("clip-bbb22222")
                .ownerUsername("bob")
                .ownerDeviceId("bob-thinkpad")
                .title("Bob's Clipboard")
                .accessMode("read-write")
                .nextSeq(1L)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();

        publicReadOnlyClipboard = AirVaultSharedClipboard.builder()
                .id("clip-pub33333")
                .ownerUsername("carol")
                .ownerDeviceId("carol-phone")
                .title("Carol's Read-Only Board")
                .accessMode("read-only")
                .nextSeq(1L)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();
    }

    @Test
    void testUserTokenGenerationAndValidation() {
        String token = tokenService.generateUserToken("alice", "dev-123");
        assertNotNull(token);

        AirVaultPrincipal principal = tokenService.parseAndValidateToken(token);
        assertNotNull(principal);
        assertEquals("alice", principal.getUsername());
        assertEquals("dev-123", principal.getDeviceId());
        assertTrue(principal.isUser());
        assertFalse(principal.isGuest());
    }

    @Test
    void testGuestTokenScopedToSingleClipboard() {
        // Guest token scoped strictly to clipboard A
        String guestTokenA = tokenService.generateGuestClipboardToken("clip-aaa11111", "read-write", "guest-dev-999");
        assertNotNull(guestTokenA);

        AirVaultPrincipal guestPrincipal = tokenService.parseAndValidateToken(guestTokenA);
        assertNotNull(guestPrincipal);
        assertTrue(guestPrincipal.isGuest());
        assertEquals("clip-aaa11111", guestPrincipal.getScopedClipboardId());
        assertEquals("read-write", guestPrincipal.getGuestAccessMode());

        when(clipboardRepository.findByIdAndDeletedAtIsNull("clip-aaa11111")).thenReturn(Optional.of(clipboardA));
        when(clipboardRepository.findByIdAndDeletedAtIsNull("clip-bbb22222")).thenReturn(Optional.of(clipboardB));

        // Guest token for A is valid on clipboard A
        assertTrue(authorizationService.canRead(guestPrincipal, "clip-aaa11111"));
        assertTrue(authorizationService.canWrite(guestPrincipal, "clip-aaa11111"));

        // Guest token for A is strictly FORBIDDEN on clipboard B
        assertFalse(authorizationService.canWrite(guestPrincipal, "clip-bbb22222"), "Guest token for clipboard A must be rejected for write on clipboard B");
    }

    @Test
    void testOwnerPermissions() {
        AirVaultPrincipal alicePrincipal = AirVaultPrincipal.builder()
                .username("alice")
                .deviceId("alice-macbook")
                .tokenType("USER")
                .build();

        when(clipboardRepository.findByIdAndDeletedAtIsNull("clip-aaa11111")).thenReturn(Optional.of(clipboardA));

        assertTrue(authorizationService.isOwner(alicePrincipal, "clip-aaa11111"));
        assertTrue(authorizationService.canRead(alicePrincipal, "clip-aaa11111"));
        assertTrue(authorizationService.canWrite(alicePrincipal, "clip-aaa11111"));
    }

    @Test
    void testCollaboratorPermissions() {
        AirVaultPrincipal charliePrincipal = AirVaultPrincipal.builder()
                .username("charlie")
                .deviceId("charlie-linux")
                .tokenType("USER")
                .build();

        when(clipboardRepository.findByIdAndDeletedAtIsNull("clip-aaa11111")).thenReturn(Optional.of(clipboardA));

        // Charlie is not owner, but is an accepted collaborator with read-only permission
        AirVaultCollaborator roCollaborator = AirVaultCollaborator.builder()
                .id(101L)
                .clipboardId("clip-aaa11111")
                .userId("charlie")
                .accessLevel("READ_ONLY")
                .joinedAt(Instant.now())
                .build();

        when(collaboratorRepository.findByClipboardIdAndUserId("clip-aaa11111", "charlie"))
                .thenReturn(Optional.of(roCollaborator));

        assertTrue(authorizationService.canRead(charliePrincipal, "clip-aaa11111"));
        assertFalse(authorizationService.canWrite(charliePrincipal, "clip-aaa11111"));

        // Change Charlie to READ_WRITE
        AirVaultCollaborator rwCollaborator = AirVaultCollaborator.builder()
                .id(102L)
                .clipboardId("clip-aaa11111")
                .userId("charlie")
                .accessLevel("READ_WRITE")
                .joinedAt(Instant.now())
                .build();

        when(collaboratorRepository.findByClipboardIdAndUserId("clip-aaa11111", "charlie"))
                .thenReturn(Optional.of(rwCollaborator));

        assertTrue(authorizationService.canWrite(charliePrincipal, "clip-aaa11111"));
    }

    @Test
    void testExpiredClipboardAccessDenied() {
        AirVaultSharedClipboard expiredClipboard = AirVaultSharedClipboard.builder()
                .id("clip-exp99999")
                .ownerUsername("alice")
                .ownerDeviceId("alice-macbook")
                .accessMode("read-write")
                .createdAt(Instant.now().minus(10, ChronoUnit.DAYS))
                .expiresAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .build();

        when(clipboardRepository.findByIdAndDeletedAtIsNull("clip-exp99999")).thenReturn(Optional.of(expiredClipboard));

        AirVaultPrincipal principal = AirVaultPrincipal.builder()
                .username("alice")
                .deviceId("alice-macbook")
                .tokenType("USER")
                .build();

        assertEquals(AirVaultAuthorizationService.AccessLevel.NONE, authorizationService.checkAccess(principal, "clip-exp99999"));
        assertFalse(authorizationService.canRead(principal, "clip-exp99999"));
        assertFalse(authorizationService.canWrite(principal, "clip-exp99999"));
    }
}
