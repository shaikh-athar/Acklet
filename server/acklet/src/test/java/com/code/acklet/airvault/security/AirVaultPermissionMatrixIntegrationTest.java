package com.code.acklet.airvault.security;

import com.code.acklet.airvault.controller.AirVaultClipboardController;
import com.code.acklet.airvault.controller.AirVaultUploadController;
import com.code.acklet.airvault.dto.AirVaultClipboardDtos.*;
import com.code.acklet.airvault.dto.UploadSessionDtos.InitiateUploadRequest;
import com.code.acklet.airvault.dto.UploadSessionDtos.InitiateUploadResponse;
import com.code.acklet.airvault.entity.AirVaultClipboardItem;
import com.code.acklet.airvault.entity.AirVaultCollaborator;
import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import com.code.acklet.airvault.repository.AirVaultClipboardItemRepository;
import com.code.acklet.airvault.repository.AirVaultCollaboratorRepository;
import com.code.acklet.airvault.repository.AirVaultSharedClipboardRepository;
import com.code.acklet.airvault.service.AirVaultSharedClipboardService;
import com.code.acklet.airvault.service.AirVaultUploadService;
import com.code.acklet.airvault.storage.AirVaultStorageAdapter;
import com.code.acklet.config.properties.AppProperties;
import com.code.acklet.shared.dto.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class AirVaultPermissionMatrixIntegrationTest {

    @Mock
    private AirVaultSharedClipboardRepository clipboardRepository;

    @Mock
    private AirVaultCollaboratorRepository collaboratorRepository;

    @Mock
    private AirVaultClipboardItemRepository itemRepository;

    @Mock
    private AirVaultSharedClipboardService sharedClipboardService;

    @Mock
    private AirVaultUploadService uploadService;

    @Mock
    private AirVaultStorageAdapter storageAdapter;

    private AirVaultTokenService tokenService;
    private AirVaultAuthorizationService authorizationService;
    private AirVaultClipboardController clipboardController;
    private AirVaultUploadController uploadController;

    private final String CLIPBOARD_ID = "clip-matrix12345";
    private AirVaultSharedClipboard clipboard;

    private AirVaultPrincipal ownerPrincipal;
    private AirVaultPrincipal collabRoPrincipal;
    private AirVaultPrincipal collabRwPrincipal;
    private AirVaultPrincipal guestRoPrincipal;
    private AirVaultPrincipal guestRwPrincipal;

    @BeforeEach
    void setUp() {
        tokenService = new AirVaultTokenService(new AppProperties());
        authorizationService = new AirVaultAuthorizationService(clipboardRepository, collaboratorRepository);
        clipboardController = new AirVaultClipboardController(sharedClipboardService);
        uploadController = new AirVaultUploadController(uploadService, storageAdapter, authorizationService);

        clipboard = AirVaultSharedClipboard.builder()
                .id(CLIPBOARD_ID)
                .ownerUsername("owner_alice")
                .ownerDeviceId("dev_alice")
                .title("Matrix Test Board")
                .accessMode("read-only") // Default board mode
                .nextSeq(1L)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();

        when(clipboardRepository.findByIdAndDeletedAtIsNull(CLIPBOARD_ID)).thenReturn(Optional.of(clipboard));

        ownerPrincipal = AirVaultPrincipal.builder()
                .username("owner_alice")
                .deviceId("dev_alice")
                .tokenType("USER")
                .build();

        collabRoPrincipal = AirVaultPrincipal.builder()
                .username("collab_ro_bob")
                .deviceId("dev_bob")
                .tokenType("USER")
                .build();

        collabRwPrincipal = AirVaultPrincipal.builder()
                .username("collab_rw_charlie")
                .deviceId("dev_charlie")
                .tokenType("USER")
                .build();

        guestRoPrincipal = AirVaultPrincipal.builder()
                .tokenType("GUEST")
                .scopedClipboardId(CLIPBOARD_ID)
                .guestAccessMode("read-only")
                .deviceId("guest-dev-1")
                .build();

        guestRwPrincipal = AirVaultPrincipal.builder()
                .tokenType("GUEST")
                .scopedClipboardId(CLIPBOARD_ID)
                .guestAccessMode("read-write")
                .deviceId("guest-dev-2")
                .build();

        // Collaborator mock setup
        AirVaultCollaborator roCollab = AirVaultCollaborator.builder()
                .id(1L)
                .clipboardId(CLIPBOARD_ID)
                .userId("collab_ro_bob")
                .accessLevel("READ_ONLY")
                .joinedAt(Instant.now())
                .build();
        when(collaboratorRepository.findByClipboardIdAndUserId(CLIPBOARD_ID, "collab_ro_bob"))
                .thenReturn(Optional.of(roCollab));

        AirVaultCollaborator rwCollab = AirVaultCollaborator.builder()
                .id(2L)
                .clipboardId(CLIPBOARD_ID)
                .userId("collab_rw_charlie")
                .accessLevel("READ_WRITE")
                .joinedAt(Instant.now())
                .build();
        when(collaboratorRepository.findByClipboardIdAndUserId(CLIPBOARD_ID, "collab_rw_charlie"))
                .thenReturn(Optional.of(rwCollab));
    }

    private void authenticate(AirVaultPrincipal principal) {
        if (principal != null) {
            SecurityContextHolder.getContext().setAuthentication(new AirVaultAuthenticationToken(principal));
        } else {
            SecurityContextHolder.clearContext();
        }
    }

    // 1. OWNER MATRIX TEST
    @Test
    void testOwnerPermissionMatrix() {
        authenticate(ownerPrincipal);

        assertTrue(authorizationService.canRead(ownerPrincipal, CLIPBOARD_ID));
        assertTrue(authorizationService.canWrite(ownerPrincipal, CLIPBOARD_ID));
        assertTrue(authorizationService.isOwner(ownerPrincipal, CLIPBOARD_ID));

        // Upload initiate allowed
        InitiateUploadRequest uploadReq = InitiateUploadRequest.builder().fileName("test.png").declaredSize(1024L).fileId("f-1").build();
        when(uploadService.initiateUpload(eq(CLIPBOARD_ID), any())).thenReturn(InitiateUploadResponse.builder().uploadSessionId(UUID.randomUUID()).build());
        ResponseEntity<?> uploadRes = uploadController.initiateUpload(CLIPBOARD_ID, uploadReq);
        assertEquals(HttpStatus.OK, uploadRes.getStatusCode());
    }

    // 2. COLLABORATOR (READ-ONLY) MATRIX TEST
    @Test
    void testCollaboratorReadOnlyPermissionMatrix() {
        authenticate(collabRoPrincipal);

        assertTrue(authorizationService.canRead(collabRoPrincipal, CLIPBOARD_ID));
        assertFalse(authorizationService.canWrite(collabRoPrincipal, CLIPBOARD_ID));
        assertFalse(authorizationService.isOwner(collabRoPrincipal, CLIPBOARD_ID));

        // Upload initiate forbidden
        InitiateUploadRequest uploadReq = InitiateUploadRequest.builder().fileName("test.png").declaredSize(1024L).fileId("f-1").build();
        ResponseEntity<?> uploadRes = uploadController.initiateUpload(CLIPBOARD_ID, uploadReq);
        assertEquals(HttpStatus.FORBIDDEN, uploadRes.getStatusCode());
    }

    // 3. COLLABORATOR (READ-WRITE) MATRIX TEST
    @Test
    void testCollaboratorReadWritePermissionMatrix() {
        authenticate(collabRwPrincipal);

        assertTrue(authorizationService.canRead(collabRwPrincipal, CLIPBOARD_ID));
        assertTrue(authorizationService.canWrite(collabRwPrincipal, CLIPBOARD_ID));
        assertFalse(authorizationService.isOwner(collabRwPrincipal, CLIPBOARD_ID));

        // Upload initiate allowed
        InitiateUploadRequest uploadReq = InitiateUploadRequest.builder().fileName("test.png").declaredSize(1024L).fileId("f-1").build();
        when(uploadService.initiateUpload(eq(CLIPBOARD_ID), any())).thenReturn(InitiateUploadResponse.builder().uploadSessionId(UUID.randomUUID()).build());
        ResponseEntity<?> uploadRes = uploadController.initiateUpload(CLIPBOARD_ID, uploadReq);
        assertEquals(HttpStatus.OK, uploadRes.getStatusCode());
    }

    // 4. GUEST LINK (READ-ONLY) MATRIX TEST
    @Test
    void testGuestReadOnlyPermissionMatrix() {
        authenticate(guestRoPrincipal);

        assertTrue(authorizationService.canRead(guestRoPrincipal, CLIPBOARD_ID));
        assertFalse(authorizationService.canWrite(guestRoPrincipal, CLIPBOARD_ID));

        // Upload forbidden
        InitiateUploadRequest uploadReq = InitiateUploadRequest.builder().fileName("test.png").declaredSize(1024L).fileId("f-1").build();
        ResponseEntity<?> uploadRes = uploadController.initiateUpload(CLIPBOARD_ID, uploadReq);
        assertEquals(HttpStatus.FORBIDDEN, uploadRes.getStatusCode());
    }

    // 5. GUEST LINK (READ-WRITE) MATRIX TEST
    @Test
    void testGuestReadWritePermissionMatrix() {
        // When board is read-write and guest token is read-write, write is allowed
        clipboard.setAccessMode("read-write");
        authenticate(guestRwPrincipal);

        assertTrue(authorizationService.canRead(guestRwPrincipal, CLIPBOARD_ID));
        assertTrue(authorizationService.canWrite(guestRwPrincipal, CLIPBOARD_ID));

        // Upload allowed
        InitiateUploadRequest uploadReq = InitiateUploadRequest.builder().fileName("test.png").declaredSize(1024L).fileId("f-1").build();
        when(uploadService.initiateUpload(eq(CLIPBOARD_ID), any())).thenReturn(InitiateUploadResponse.builder().uploadSessionId(UUID.randomUUID()).build());
        ResponseEntity<?> uploadRes = uploadController.initiateUpload(CLIPBOARD_ID, uploadReq);
        assertEquals(HttpStatus.OK, uploadRes.getStatusCode());
    }

    // 6. UNAUTHENTICATED / SPOOFED MATRIX TEST
    @Test
    void testUnauthenticatedMatrix() {
        authenticate(null);

        // Unauthenticated access without a valid signed token is rejected
        assertFalse(authorizationService.canRead(null, CLIPBOARD_ID));
        assertFalse(authorizationService.canWrite(null, CLIPBOARD_ID));
        assertFalse(authorizationService.isOwner(null, CLIPBOARD_ID));

        // Upload initiate forbidden
        InitiateUploadRequest uploadReq = InitiateUploadRequest.builder().fileName("test.png").declaredSize(1024L).fileId("f-1").build();
        ResponseEntity<?> uploadRes = uploadController.initiateUpload(CLIPBOARD_ID, uploadReq);
        assertEquals(HttpStatus.FORBIDDEN, uploadRes.getStatusCode());
    }

    // 7. GUEST TOKEN SCOPING ISOLATION TEST (Guest on A rejected on B)
    @Test
    void testGuestTokenScopingIsolation() {
        authenticate(guestRwPrincipal); // Scoped to CLIPBOARD_ID

        String OTHER_CLIPBOARD = "clip-other999";
        AirVaultSharedClipboard otherClip = AirVaultSharedClipboard.builder()
                .id(OTHER_CLIPBOARD)
                .ownerUsername("other_user")
                .accessMode("read-write")
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build();
        when(clipboardRepository.findByIdAndDeletedAtIsNull(OTHER_CLIPBOARD)).thenReturn(Optional.of(otherClip));

        // Guest token scoped to CLIPBOARD_ID is strictly rejected on OTHER_CLIPBOARD for read and write
        assertFalse(authorizationService.canRead(guestRwPrincipal, OTHER_CLIPBOARD));
        assertFalse(authorizationService.canWrite(guestRwPrincipal, OTHER_CLIPBOARD));
    }

    // 8. DECISION D2: DELETE & EDIT PERMISSIONS ENFORCEMENT
    @Test
    void testDecisionD2DeleteAndEditPermissions() {
        clipboard.setAccessMode("read-write");

        AirVaultClipboardItem ownerItem = AirVaultClipboardItem.builder()
                .id(UUID.randomUUID())
                .clipboardId(CLIPBOARD_ID)
                .authorId("owner_alice")
                .authorType("USER")
                .build();

        AirVaultClipboardItem charlieItem = AirVaultClipboardItem.builder()
                .id(UUID.randomUUID())
                .clipboardId(CLIPBOARD_ID)
                .authorId("collab_rw_charlie")
                .authorType("USER")
                .build();

        AirVaultClipboardItem guestItem = AirVaultClipboardItem.builder()
                .id(UUID.randomUUID())
                .clipboardId(CLIPBOARD_ID)
                .authorId("guest-dev-2")
                .authorType("GUEST")
                .build();

        // 1. Owner can delete any item (own item, collaborator's item, guest's item)
        assertTrue(authorizationService.canDeleteItem(ownerPrincipal, CLIPBOARD_ID, ownerItem));
        assertTrue(authorizationService.canDeleteItem(ownerPrincipal, CLIPBOARD_ID, charlieItem));
        assertTrue(authorizationService.canDeleteItem(ownerPrincipal, CLIPBOARD_ID, guestItem));

        // 2. Author (Charlie) can delete their own item
        assertTrue(authorizationService.canDeleteItem(collabRwPrincipal, CLIPBOARD_ID, charlieItem));

        // 3. Collaborator (Charlie) CANNOT delete owner's item or guest's item
        assertFalse(authorizationService.canDeleteItem(collabRwPrincipal, CLIPBOARD_ID, ownerItem));
        assertFalse(authorizationService.canDeleteItem(collabRwPrincipal, CLIPBOARD_ID, guestItem));

        // 4. Guest RW can delete their own item
        assertTrue(authorizationService.canDeleteItem(guestRwPrincipal, CLIPBOARD_ID, guestItem));

        // 5. Guest RW CANNOT delete owner's or collaborator's item
        assertFalse(authorizationService.canDeleteItem(guestRwPrincipal, CLIPBOARD_ID, ownerItem));
        assertFalse(authorizationService.canDeleteItem(guestRwPrincipal, CLIPBOARD_ID, charlieItem));

        // 6. Read-Only Collaborator (Bob) CANNOT delete anything
        AirVaultClipboardItem bobItem = AirVaultClipboardItem.builder()
                .id(UUID.randomUUID())
                .clipboardId(CLIPBOARD_ID)
                .authorId("collab_ro_bob")
                .authorType("USER")
                .build();
        assertFalse(authorizationService.canDeleteItem(collabRoPrincipal, CLIPBOARD_ID, bobItem));
    }
}
