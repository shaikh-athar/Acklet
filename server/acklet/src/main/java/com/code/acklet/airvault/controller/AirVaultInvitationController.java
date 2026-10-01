package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.dto.AirVaultInvitationDtos.*;
import com.code.acklet.airvault.service.AirVaultInvitationService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/airvault")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AirVault Invitations & Collaborators", description = "Endpoints for invite-based clipboard collaborator access, acceptance, and inbox management")
public class AirVaultInvitationController {

    private final AirVaultInvitationService invitationService;

    private com.code.acklet.airvault.security.AirVaultPrincipal getPrincipal() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.code.acklet.airvault.security.AirVaultPrincipal principal) {
            return principal;
        }
        return null;
    }

    @PostMapping({"/clipboards/{clipboardId}/invitations", "/clipboard/{clipboardId}/invitations"})
    @Operation(summary = "Create Clipboard Invitation", description = "Generates a username-targeted or shareable link invitation to collaborate on a clipboard")
    public ResponseEntity<ApiResponse<InvitationResponseDto>> createInvitation(
            @PathVariable String clipboardId,
            @RequestParam(required = false) String inviterUsername,
            @RequestBody CreateInvitationRequest request) {

        try {
            var principal = getPrincipal();
            String inviter = (principal != null && principal.getUsername() != null && !principal.isGuest())
                    ? principal.getUsername()
                    : (request.getClientUsername() != null && !request.getClientUsername().isBlank()
                    ? request.getClientUsername()
                    : (inviterUsername != null ? inviterUsername : "anonymous"));

            InvitationResponseDto res = invitationService.createInvitation(clipboardId, inviter, request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(res, "Invitation created successfully"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage(), "400"));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error(ex.getMessage(), "409"));
        } catch (Exception ex) {
            log.error("[AirVault Invite] Error creating invitation: {}", ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create invitation", "500"));
        }
    }

    @GetMapping({"/clipboards/{clipboardId}/invitations", "/clipboard/{clipboardId}/invitations"})
    @Operation(summary = "List Clipboard Invitations", description = "Retrieves all invitations created for a specific clipboard")
    public ResponseEntity<ApiResponse<List<InvitationResponseDto>>> getClipboardInvitations(
            @PathVariable String clipboardId) {

        List<InvitationResponseDto> list = invitationService.getClipboardInvitations(clipboardId);
        return ResponseEntity.ok(ApiResponse.success(list, "Invitations retrieved"));
    }

    @GetMapping({"/clipboards/{clipboardId}/collaborators", "/clipboard/{clipboardId}/collaborators"})
    @Operation(summary = "List Clipboard Collaborators", description = "Retrieves all accepted collaborators for a specific clipboard")
    public ResponseEntity<ApiResponse<List<CollaboratorDto>>> getCollaborators(
            @PathVariable String clipboardId) {

        List<CollaboratorDto> list = invitationService.getCollaborators(clipboardId);
        return ResponseEntity.ok(ApiResponse.success(list, "Collaborators retrieved"));
    }

    @GetMapping("/invitations/{invitationId}")
    @Operation(summary = "Get Invitation Details", description = "Fetches invitation metadata and validation status for accept/decline view")
    public ResponseEntity<ApiResponse<InvitationResponseDto>> getInvitation(
            @PathVariable String invitationId) {

        try {
            InvitationResponseDto res = invitationService.getInvitationById(invitationId);
            return ResponseEntity.ok(ApiResponse.success(res, "Invitation details retrieved"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }

    /**
     * Public, unauthenticated preview of an invitation token.
     * The /invite/:token landing page calls this first so it can render
     * the correct state (valid / expired / not-found) without requiring login.
     */
    @GetMapping("/invitations/{token}/preview")
    @Operation(summary = "Preview Invitation", description = "Returns public-safe invitation metadata (status, inviter, clipboard title, access level, masked target). No auth required.")
    public ResponseEntity<ApiResponse<InvitePreviewDto>> previewInvitation(
            @PathVariable String token) {

        InvitePreviewDto preview = invitationService.previewInvitation(token);
        return ResponseEntity.ok(ApiResponse.success(preview, "Invitation preview retrieved"));
    }

    @GetMapping({"/invitations/inbox", "/inbox"})
    @Operation(summary = "Get Pending Invitations Inbox", description = "Returns all pending invitations addressed to the specified username")
    public ResponseEntity<ApiResponse<UserInboxResponse>> getPendingInbox(
            @RequestParam String username) {

        UserInboxResponse inbox = invitationService.getPendingInbox(username);
        return ResponseEntity.ok(ApiResponse.success(inbox, "Pending invitations retrieved"));
    }

    @PostMapping("/invitations/{invitationId}/accept")
    @Operation(summary = "Accept Invitation", description = "Accepts an invitation, creating a permanent user-level collaborator record, then notifies all the invitee's live sessions via WebSocket (CLIPBOARD_ACCESS_GRANTED). Returns clipboard bootstrap data so the client can subscribe immediately.")
    public ResponseEntity<ApiResponse<AcceptInvitationResponseDto>> acceptInvitation(
            @PathVariable String invitationId,
            @RequestBody AcceptInvitationRequest request) {

        try {
            AcceptInvitationResponseDto result = invitationService.acceptInvitation(invitationId, request.getUsername());
            return ResponseEntity.ok(ApiResponse.success(result, "Invitation accepted! You are now a collaborator."));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(ApiResponse.error(ex.getMessage(), "410"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ex.getMessage(), "400"));
        }
    }

    @PostMapping("/invitations/{invitationId}/decline")
    @Operation(summary = "Decline Invitation", description = "Declines a pending invitation without notifying the inviter")
    public ResponseEntity<ApiResponse<Map<String, String>>> declineInvitation(
            @PathVariable String invitationId,
            @RequestBody DeclineInvitationRequest request) {

        try {
            invitationService.declineInvitation(invitationId, request.getUsername());
            return ResponseEntity.ok(ApiResponse.success(Map.of("status", "DECLINED"), "Invitation declined"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }

    @DeleteMapping("/invitations/{invitationId}")
    @Operation(summary = "Revoke Invitation", description = "Revokes a pending invitation so it can no longer be used")
    public ResponseEntity<ApiResponse<Map<String, String>>> revokeInvitation(
            @PathVariable String invitationId,
            @RequestParam(required = false) String inviterUsername) {

        try {
            invitationService.revokeInvitation(invitationId, inviterUsername);
            return ResponseEntity.ok(ApiResponse.success(Map.of("status", "REVOKED"), "Invitation revoked"));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(ex.getMessage(), "403"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(ex.getMessage(), "404"));
        }
    }
}
