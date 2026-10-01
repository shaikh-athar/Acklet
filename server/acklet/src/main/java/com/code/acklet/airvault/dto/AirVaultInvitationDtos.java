package com.code.acklet.airvault.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class AirVaultInvitationDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateInvitationRequest {
        private String inviteType; // "USERNAME" | "LINK"
        private String targetUsername; // only when inviteType = USERNAME
        private String accessLevel; // "read-only" | "read-write"
        private Integer maxUses; // null = unlimited, 1 = single-use
        private Integer expiresInDays; // default 7
        private String clientUsername; // inviter's username
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvitationResponseDto {
        private String id;
        private String clipboardId;
        private String clipboardTitle;
        private String inviterUserId;
        private String inviteType;
        private String targetUsername;
        private String status;
        private String accessLevel;
        private Integer maxUses;
        private int usedCount;
        private Instant createdAt;
        private Instant expiresAt;
        private String inviteUrl;
        private boolean isValid;
        private boolean isExpired;
        private boolean isExhausted;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AcceptInvitationRequest {
        private String username;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeclineInvitationRequest {
        private String username;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CollaboratorDto {
        private Long id;
        private String clipboardId;
        private String userId;
        private String accessLevel;
        private Instant joinedAt;
        private String invitedVia;
        private String invitationId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInboxResponse {
        private String username;
        private List<InvitationResponseDto> pendingInvitations;
    }

    /**
     * Lightweight, unauthenticated preview of an invitation token.
     * Returned by GET /invitations/{token}/preview so the landing page
     * can render the correct state without requiring a logged-in user.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvitePreviewDto {
        /** One of: VALID, NOT_FOUND, EXPIRED, REVOKED, EXHAUSTED, DECLINED, CLIPBOARD_GONE */
        private String status;
        private String clipboardId;
        private String clipboardTitle;
        private String inviterUsername;
        private String accessLevel; // "read-only" | "read-write"
        private Instant expiresAt;
        /** Masked target for username invites, e.g. "sa***ri"; null for link invites */
        private String targetUsernameMasked;
        private String inviteType; // "USERNAME" | "LINK"
    }

    /**
     * Response returned to the client after successfully accepting an invitation.
     * Carries just enough clipboard metadata for the client to subscribe and bootstrap.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AcceptInvitationResponseDto {
        private String clipboardId;
        private String clipboardTitle;
        private String ownerUsername;
        private String accessLevel;    // "read-only" | "read-write"
        private boolean isOwner;
        private boolean isCollaborator;
        private boolean canEdit;
        private Long    currentSeq;
        private List<Map<String, Object>> items;
        /** Collaborator row details */
        private CollaboratorDto collaborator;
    }
}
