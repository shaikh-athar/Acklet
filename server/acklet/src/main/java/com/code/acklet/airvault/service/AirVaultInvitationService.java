package com.code.acklet.airvault.service;

import com.code.acklet.airvault.dto.AirVaultClipboardDtos.ClipboardResponseDto;
import com.code.acklet.airvault.dto.AirVaultInvitationDtos.*;
import com.code.acklet.airvault.entity.AirVaultCollaborator;
import com.code.acklet.airvault.entity.AirVaultInvitation;
import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import com.code.acklet.airvault.repository.AirVaultCollaboratorRepository;
import com.code.acklet.airvault.repository.AirVaultInvitationRepository;
import com.code.acklet.airvault.repository.AirVaultSharedClipboardRepository;
import com.code.acklet.airvault.security.AirVaultPrincipal;
import com.code.acklet.airvault.websocket.AirVaultWebSocketHandler;
import com.code.acklet.airvault.websocket.dto.AirVaultWsMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultInvitationService {

    private final AirVaultInvitationRepository invitationRepository;
    private final AirVaultCollaboratorRepository collaboratorRepository;
    private final AirVaultSharedClipboardRepository clipboardRepository;
    private final AirVaultWebSocketHandler webSocketHandler;
    private final AirVaultSharedClipboardService clipboardService;
    @Qualifier("wsOffloadExecutor")
    private final ExecutorService wsOffloadExecutor;

    private static final String TOKEN_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateInvitationToken() {
        StringBuilder sb = new StringBuilder("inv_");
        for (int i = 0; i < 28; i++) {
            sb.append(TOKEN_CHARS.charAt(RANDOM.nextInt(TOKEN_CHARS.length())));
        }
        return sb.toString();
    }

    @Transactional
    public InvitationResponseDto createInvitation(String clipboardId, String inviterUsername, CreateInvitationRequest request) {
        if (clipboardId == null || clipboardId.isBlank()) {
            throw new IllegalArgumentException("Clipboard ID is required");
        }
        if (inviterUsername == null || inviterUsername.isBlank()) {
            throw new IllegalArgumentException("Inviter username is required");
        }

        String inviteType = request.getInviteType() != null ? request.getInviteType().toUpperCase().trim() : "USERNAME";
        String accessLevel = request.getAccessLevel() != null && request.getAccessLevel().equalsIgnoreCase("read-write") ? "read-write" : "read-only";
        int days = request.getExpiresInDays() != null && request.getExpiresInDays() > 0 ? request.getExpiresInDays() : 7;
        Instant expiresAt = Instant.now().plus(Duration.ofDays(days));

        String token = generateInvitationToken();
        AirVaultInvitation.AirVaultInvitationBuilder builder = AirVaultInvitation.builder()
                .id(token)
                .clipboardId(clipboardId)
                .inviterUserId(inviterUsername.trim())
                .inviteType(inviteType)
                .accessLevel(accessLevel)
                .expiresAt(expiresAt)
                .status("PENDING")
                .usedCount(0);

        // Fetch clipboard title if available
        String clipboardTitle = "Shared Clipboard";
        Optional<AirVaultSharedClipboard> clipOpt = clipboardRepository.findByIdAndDeletedAtIsNull(clipboardId);
        if (clipOpt.isPresent() && clipOpt.get().getTitle() != null && !clipOpt.get().getTitle().isBlank()) {
            clipboardTitle = clipOpt.get().getTitle();
        }

        if ("USERNAME".equalsIgnoreCase(inviteType)) {
            String target = request.getTargetUsername();
            if (target == null || target.isBlank()) {
                throw new IllegalArgumentException("Target username is required for username invitations");
            }
            target = target.trim().replace("@", "");
            if (target.equalsIgnoreCase(inviterUsername.trim().replace("@", ""))) {
                throw new IllegalArgumentException("Cannot invite yourself");
            }

            // Check if already a collaborator
            if (collaboratorRepository.existsByClipboardIdAndUserId(clipboardId, target.toLowerCase())) {
                throw new IllegalStateException("User @" + target + " is already a collaborator on this clipboard");
            }

            builder.targetUsername(target.toLowerCase());
            builder.maxUses(1); // Username invites are single-use by target
        } else {
            // LINK invitation
            builder.targetUsername(null);
            builder.maxUses(request.getMaxUses()); // null for unlimited, 1 for single-use
        }

        AirVaultInvitation invitation = builder.build();
        invitationRepository.save(invitation);

        log.info("[AirVault Invite] Created invitation id={}, clipboard={}, type={}, inviter={}, target={}",
                invitation.getId(), clipboardId, inviteType, inviterUsername, invitation.getTargetUsername());

        // If USERNAME invite: dispatch real-time WebSocket notification to target user's active sessions
        if ("USERNAME".equalsIgnoreCase(inviteType) && invitation.getTargetUsername() != null) {
            final String finalTarget = invitation.getTargetUsername();
            final String finalTitle = clipboardTitle;
            final AirVaultInvitation finalInv = invitation;

            wsOffloadExecutor.submit(() -> {
                try {
                    AirVaultWsMessage wsNotice = AirVaultWsMessage.builder()
                            .type("INVITATION_RECEIVED")
                            .senderDeviceId("server")
                            .targetDeviceId(finalTarget)
                            .timestamp(System.currentTimeMillis())
                            .metadata(Map.of(
                                    "invitationId", finalInv.getId(),
                                    "clipboardId", finalInv.getClipboardId(),
                                    "clipboardTitle", finalTitle,
                                    "inviterUsername", finalInv.getInviterUserId(),
                                    "accessLevel", finalInv.getAccessLevel(),
                                    "expiresAt", finalInv.getExpiresAt().toString()
                            ))
                            .build();

                    boolean delivered = webSocketHandler.sendToUser(finalTarget, wsNotice);
                    log.debug("[AirVault Invite] WS invitation notification dispatched to target='{}', onlineDelivered={}",
                            finalTarget, delivered);
                } catch (Exception e) {
                    log.warn("[AirVault Invite] Failed to dispatch WS notification: {}", e.getMessage());
                }
            });
        }

        return toDto(invitation, clipboardTitle);
    }

    @Transactional(readOnly = true)
    public InvitationResponseDto getInvitationById(String invitationId) {
        AirVaultInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found: " + invitationId));

        String title = "Shared Clipboard";
        Optional<AirVaultSharedClipboard> clipOpt = clipboardRepository.findByIdAndDeletedAtIsNull(invitation.getClipboardId());
        if (clipOpt.isPresent() && clipOpt.get().getTitle() != null) {
            title = clipOpt.get().getTitle();
        }

        return toDto(invitation, title);
    }

    /**
     * Public (no auth required) preview of an invitation token.
     * Returns status + safe metadata — never secrets, never items.
     */
    @Transactional(readOnly = true)
    public InvitePreviewDto previewInvitation(String token) {
        Optional<AirVaultInvitation> invOpt = invitationRepository.findById(token);
        if (invOpt.isEmpty()) {
            return InvitePreviewDto.builder().status("NOT_FOUND").build();
        }

        AirVaultInvitation inv = invOpt.get();

        // Determine status
        String status;
        if (inv.isExpired()) {
            status = "EXPIRED";
        } else if ("REVOKED".equalsIgnoreCase(inv.getStatus())) {
            status = "REVOKED";
        } else if ("DECLINED".equalsIgnoreCase(inv.getStatus())) {
            status = "DECLINED";
        } else if (inv.isExhausted()) {
            status = "EXHAUSTED";
        } else if (inv.isValidForAcceptance()) {
            status = "VALID";
        } else {
            // ACCEPTED single-use invites, or any other terminal status
            status = "EXHAUSTED";
        }

        // Resolve clipboard title
        String title = "Shared Clipboard";
        Optional<AirVaultSharedClipboard> clipOpt = clipboardRepository.findByIdAndDeletedAtIsNull(inv.getClipboardId());
        if (clipOpt.isEmpty()) {
            return InvitePreviewDto.builder().status("CLIPBOARD_GONE").build();
        }
        if (clipOpt.get().getTitle() != null && !clipOpt.get().getTitle().isBlank()) {
            title = clipOpt.get().getTitle();
        }

        // Mask target username (e.g. "safari" → "sa***ri")
        String masked = null;
        if ("USERNAME".equalsIgnoreCase(inv.getInviteType()) && inv.getTargetUsername() != null) {
            String t = inv.getTargetUsername();
            masked = t.length() <= 2 ? t + "***" : t.substring(0, 2) + "***" + (t.length() > 4 ? t.substring(t.length() - 2) : "");
        }

        return InvitePreviewDto.builder()
                .status(status)
                .clipboardId(inv.getClipboardId())
                .clipboardTitle(title)
                .inviterUsername(inv.getInviterUserId())
                .accessLevel(inv.getAccessLevel())
                .expiresAt(inv.getExpiresAt())
                .targetUsernameMasked(masked)
                .inviteType(inv.getInviteType())
                .build();
    }

    @Transactional(readOnly = true)
    public UserInboxResponse getPendingInbox(String rawUsername) {
        if (rawUsername == null || rawUsername.isBlank()) {
            return UserInboxResponse.builder().username("").pendingInvitations(List.of()).build();
        }
        String username = rawUsername.trim().replace("@", "").toLowerCase();

        List<AirVaultInvitation> pending = invitationRepository
                .findByTargetUsernameAndStatusOrderByCreatedAtDesc(username, "PENDING");

        Instant now = Instant.now();
        List<InvitationResponseDto> dtos = pending.stream()
                .filter(inv -> inv.getExpiresAt() != null && inv.getExpiresAt().isAfter(now))
                .map(inv -> {
                    String title = "Shared Clipboard";
                    Optional<AirVaultSharedClipboard> clipOpt = clipboardRepository.findByIdAndDeletedAtIsNull(inv.getClipboardId());
                    if (clipOpt.isPresent() && clipOpt.get().getTitle() != null) {
                        title = clipOpt.get().getTitle();
                    }
                    return toDto(inv, title);
                })
                .collect(Collectors.toList());

        return UserInboxResponse.builder()
                .username(username)
                .pendingInvitations(dtos)
                .build();
    }

    @Transactional
    public AcceptInvitationResponseDto acceptInvitation(String invitationId, String rawUsername) {
        if (rawUsername == null || rawUsername.isBlank()) {
            throw new IllegalArgumentException("Username is required to accept an invitation");
        }
        String username = rawUsername.trim().replace("@", "").toLowerCase();

        AirVaultInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found: " + invitationId));

        if (!invitation.isValidForAcceptance()) {
            if (invitation.isExpired()) {
                throw new IllegalStateException("This invitation has expired.");
            }
            if (invitation.isExhausted()) {
                throw new IllegalStateException("This invitation link has reached its maximum allowed uses.");
            }
            throw new IllegalStateException("This invitation is no longer pending (status: " + invitation.getStatus() + ").");
        }

        // If USERNAME invite, ensure accepting user is indeed the target
        if ("USERNAME".equalsIgnoreCase(invitation.getInviteType())) {
            if (invitation.getTargetUsername() != null && !invitation.getTargetUsername().equalsIgnoreCase(username)) {
                throw new SecurityException("This invitation was addressed specifically to @" + invitation.getTargetUsername());
            }
        }

        // Idempotent: already a collaborator — upgrade access level if needed, return existing state
        Optional<AirVaultCollaborator> existingCollab = collaboratorRepository
                .findByClipboardIdAndUserId(invitation.getClipboardId(), username);

        AirVaultCollaborator collaborator;
        if (existingCollab.isPresent()) {
            collaborator = existingCollab.get();
            if ("read-write".equalsIgnoreCase(invitation.getAccessLevel())) {
                collaborator.setAccessLevel("read-write");
                collaboratorRepository.save(collaborator);
            }
        } else {
            collaborator = AirVaultCollaborator.builder()
                    .clipboardId(invitation.getClipboardId())
                    .userId(username)
                    .accessLevel(invitation.getAccessLevel())
                    .invitedVia(invitation.getInviteType())
                    .invitationId(invitation.getId())
                    .joinedAt(Instant.now())
                    .build();
            collaborator = collaboratorRepository.save(collaborator);
        }

        // Increment used count and mark as ACCEPTED when appropriate
        invitation.setUsedCount(invitation.getUsedCount() + 1);
        invitation.setUpdatedAt(Instant.now());
        if (invitation.getMaxUses() != null && invitation.getUsedCount() >= invitation.getMaxUses()) {
            invitation.setStatus("ACCEPTED");
        } else if ("USERNAME".equalsIgnoreCase(invitation.getInviteType())) {
            invitation.setStatus("ACCEPTED");
        }
        invitationRepository.save(invitation);

        log.info("[AirVault Invite] ✅ User @{} accepted invitation {} for clipboard {}",
                username, invitationId, invitation.getClipboardId());

        // Build clipboard DTO for response (so client can bootstrap immediately)
        final String clipId = invitation.getClipboardId();
        AirVaultPrincipal inviteePrincipal = AirVaultPrincipal.builder()
                .username(username)
                .tokenType("USER")
                .build();
        ClipboardResponseDto clipboardDto = clipboardService.getClipboard(clipId, inviteePrincipal);

        // Resolve clipboard title
        String clipboardTitle = "Shared Clipboard";
        Optional<AirVaultSharedClipboard> clipOpt = clipboardRepository.findByIdAndDeletedAtIsNull(clipId);
        if (clipOpt.isPresent() && clipOpt.get().getTitle() != null) {
            clipboardTitle = clipOpt.get().getTitle();
        }
        final String finalClipboardTitle = clipboardTitle;
        final String finalUsername = username;
        final String inviter = invitation.getInviterUserId();
        final AirVaultCollaborator finalCollab = collaborator;

        wsOffloadExecutor.submit(() -> {
            try {
                // 1. Notify inviter that invite was accepted
                AirVaultWsMessage acceptNotice = AirVaultWsMessage.builder()
                        .type("INVITATION_ACCEPTED")
                        .senderDeviceId("server")
                        .targetDeviceId(inviter)
                        .timestamp(System.currentTimeMillis())
                        .metadata(Map.of(
                                "invitationId", invitationId,
                                "clipboardId", clipId,
                                "acceptedByUsername", finalUsername
                        ))
                        .build();
                webSocketHandler.sendToUser(inviter, acceptNotice);

                // 2. Push CLIPBOARD_ACCESS_GRANTED to ALL live sessions of the invitee
                //    so every open tab immediately knows they have access
                AirVaultWsMessage accessGranted = AirVaultWsMessage.builder()
                        .type("CLIPBOARD_ACCESS_GRANTED")
                        .senderDeviceId("server")
                        .targetDeviceId(finalUsername)
                        .clipboardId(clipId)
                        .timestamp(System.currentTimeMillis())
                        .metadata(Map.of(
                                "clipboardId", clipId,
                                "clipboardTitle", finalClipboardTitle,
                                "accessLevel", finalCollab.getAccessLevel(),
                                "invitedVia", finalCollab.getInvitedVia(),
                                "inviterUsername", inviter
                        ))
                        .build();
                webSocketHandler.sendToUser(finalUsername, accessGranted);
                log.debug("[AirVault Invite] 📡 Sent CLIPBOARD_ACCESS_GRANTED to user='{}' for clipboard='{}'",
                        finalUsername, clipId);

                // 3. Broadcast COLLABORATOR_JOINED to the clipboard room
                //    so the owner's board shows the new member without page refresh
                AirVaultWsMessage joinedMsg = AirVaultWsMessage.builder()
                        .type("COLLABORATOR_JOINED")
                        .senderDeviceId("server")
                        .clipboardId(clipId)
                        .timestamp(System.currentTimeMillis())
                        .metadata(Map.of(
                                "clipboardId", clipId,
                                "userId", finalUsername,
                                "accessLevel", finalCollab.getAccessLevel()
                        ))
                        .build();
                webSocketHandler.sendToClipboardRoom(clipId, joinedMsg, null);

            } catch (Exception e) {
                log.warn("[AirVault Invite] Post-accept WS notifications failed: {}", e.getMessage());
            }
        });

        CollaboratorDto collabDto = CollaboratorDto.builder()
                .id(finalCollab.getId())
                .clipboardId(finalCollab.getClipboardId())
                .userId(finalCollab.getUserId())
                .accessLevel(finalCollab.getAccessLevel())
                .joinedAt(finalCollab.getJoinedAt())
                .invitedVia(finalCollab.getInvitedVia())
                .invitationId(finalCollab.getInvitationId())
                .build();

        return AcceptInvitationResponseDto.builder()
                .clipboardId(clipId)
                .clipboardTitle(finalClipboardTitle)
                .ownerUsername(clipOpt.map(AirVaultSharedClipboard::getOwnerUsername).orElse(null))
                .accessLevel(finalCollab.getAccessLevel())
                .isOwner(false)
                .isCollaborator(true)
                .canEdit("read-write".equalsIgnoreCase(finalCollab.getAccessLevel()))
                .currentSeq(clipboardDto != null ? clipboardDto.getCurrentSeq() : null)
                .items(clipboardDto != null ? clipboardDto.getItems() : List.of())
                .collaborator(collabDto)
                .build();
    }

    @Transactional
    public void declineInvitation(String invitationId, String rawUsername) {
        if (rawUsername == null || rawUsername.isBlank()) {
            throw new IllegalArgumentException("Username is required to decline an invitation");
        }
        String username = rawUsername.trim().replace("@", "").toLowerCase();

        AirVaultInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found: " + invitationId));

        if ("USERNAME".equalsIgnoreCase(invitation.getInviteType())) {
            if (invitation.getTargetUsername() != null && !invitation.getTargetUsername().equalsIgnoreCase(username)) {
                throw new SecurityException("Cannot decline an invitation addressed to another user");
            }
        }

        invitation.setStatus("DECLINED");
        invitation.setUpdatedAt(Instant.now());
        invitationRepository.save(invitation);

        log.info("[AirVault Invite] 🚫 User @{} declined invitation {}", username, invitationId);
        // Per spec: Do NOT notify the inviter of a decline by default
    }

    @Transactional
    public void revokeInvitation(String invitationId, String inviterUsername) {
        AirVaultInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found: " + invitationId));

        if (inviterUsername != null && !inviterUsername.isBlank()) {
            String cleanInviter = inviterUsername.trim().replace("@", "").toLowerCase();
            String cleanDbInviter = invitation.getInviterUserId().trim().replace("@", "").toLowerCase();
            if (!cleanDbInviter.equalsIgnoreCase(cleanInviter)) {
                throw new SecurityException("Only the inviter can revoke this invitation");
            }
        }

        invitation.setStatus("REVOKED");
        invitation.setUpdatedAt(Instant.now());
        invitationRepository.save(invitation);

        log.info("[AirVault Invite] 🗑️ Invitation {} revoked by @{}", invitationId, inviterUsername);
    }

    @Transactional(readOnly = true)
    public List<CollaboratorDto> getCollaborators(String clipboardId) {
        return collaboratorRepository.findByClipboardIdOrderByJoinedAtAsc(clipboardId).stream()
                .map(c -> CollaboratorDto.builder()
                        .id(c.getId())
                        .clipboardId(c.getClipboardId())
                        .userId(c.getUserId())
                        .accessLevel(c.getAccessLevel())
                        .joinedAt(c.getJoinedAt())
                        .invitedVia(c.getInvitedVia())
                        .invitationId(c.getInvitationId())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvitationResponseDto> getClipboardInvitations(String clipboardId) {
        return invitationRepository.findByClipboardIdOrderByCreatedAtDesc(clipboardId).stream()
                .map(inv -> toDto(inv, "Shared Clipboard"))
                .collect(Collectors.toList());
    }

    private InvitationResponseDto toDto(AirVaultInvitation inv, String clipboardTitle) {
        return InvitationResponseDto.builder()
                .id(inv.getId())
                .clipboardId(inv.getClipboardId())
                .clipboardTitle(clipboardTitle)
                .inviterUserId(inv.getInviterUserId())
                .inviteType(inv.getInviteType())
                .targetUsername(inv.getTargetUsername())
                .status(inv.getStatus())
                .accessLevel(inv.getAccessLevel())
                .maxUses(inv.getMaxUses())
                .usedCount(inv.getUsedCount())
                .createdAt(inv.getCreatedAt())
                .expiresAt(inv.getExpiresAt())
                .inviteUrl("/invite/" + inv.getId())
                .isValid(inv.isValidForAcceptance())
                .isExpired(inv.isExpired())
                .isExhausted(inv.isExhausted())
                .build();
    }
}
