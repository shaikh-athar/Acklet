package com.code.acklet.airvault.security;

import com.code.acklet.airvault.entity.AirVaultClipboardItem;
import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import com.code.acklet.airvault.repository.AirVaultCollaboratorRepository;
import com.code.acklet.airvault.repository.AirVaultSharedClipboardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AirVaultAuthorizationService {

    private final AirVaultSharedClipboardRepository clipboardRepository;
    private final AirVaultCollaboratorRepository collaboratorRepository;

    public enum AccessLevel {
        NONE,
        READ_ONLY,
        READ_WRITE,
        OWNER
    }

    public AccessLevel checkAccess(AirVaultPrincipal principal, String clipboardId) {
        if (principal == null || clipboardId == null || clipboardId.isBlank()) {
            return AccessLevel.NONE;
        }

        Optional<AirVaultSharedClipboard> clipOpt = clipboardRepository.findByIdAndDeletedAtIsNull(clipboardId);
        if (clipOpt.isEmpty()) {
            return AccessLevel.NONE;
        }

        AirVaultSharedClipboard clip = clipOpt.get();
        if (clip.getExpiresAt() != null && clip.getExpiresAt().isBefore(Instant.now())) {
            return AccessLevel.NONE;
        }

        // 1. Guest Token Authorization Check (Strict 1-Clipboard Scope)
        if (principal.isGuest()) {
            if (!clipboardId.equalsIgnoreCase(principal.getScopedClipboardId())) {
                log.warn("[AirVault Authz] 🚫 Scoped guest token for '{}' rejected on clipboard '{}'",
                        principal.getScopedClipboardId(), clipboardId);
                return AccessLevel.NONE;
            }
            if ("read-write".equalsIgnoreCase(clip.getAccessMode()) &&
                "read-write".equalsIgnoreCase(principal.getGuestAccessMode())) {
                return AccessLevel.READ_WRITE;
            }
            return AccessLevel.READ_ONLY;
        }

        // 2. User/Device Token Authorization Check
        String username = principal.getUsername() != null ? principal.getUsername().trim().toLowerCase().replace("@", "") : "";
        String deviceId = principal.getDeviceId();

        // 2a. Owner Check
        boolean isOwner = (username != null && !username.isBlank() && username.equalsIgnoreCase(clip.getOwnerUsername()))
                || (deviceId != null && !deviceId.isBlank() && deviceId.equals(clip.getOwnerDeviceId()));

        if (isOwner) {
            return AccessLevel.OWNER;
        }

        // 2b. Collaborator Check
        if (username != null && !username.isBlank()) {
            var collabOpt = collaboratorRepository.findByClipboardIdAndUserId(clipboardId, username.toLowerCase());
            if (collabOpt.isPresent()) {
                String level = collabOpt.get().getAccessLevel();
                if (level != null && (level.equalsIgnoreCase("read-write") || level.equalsIgnoreCase("READ_WRITE") || level.equalsIgnoreCase("WRITE"))) {
                    return AccessLevel.READ_WRITE;
                }
                return AccessLevel.READ_ONLY;
            }
        }

        // 2c. Fallback to public clipboard accessMode for authenticated user
        if ("read-write".equalsIgnoreCase(clip.getAccessMode())) {
            return AccessLevel.READ_WRITE;
        }
        return AccessLevel.READ_ONLY;
    }

    public boolean canRead(AirVaultPrincipal principal, String clipboardId) {
        return checkAccess(principal, clipboardId) != AccessLevel.NONE;
    }

    public boolean canWrite(AirVaultPrincipal principal, String clipboardId) {
        AccessLevel level = checkAccess(principal, clipboardId);
        return level == AccessLevel.READ_WRITE || level == AccessLevel.OWNER;
    }

    public boolean isOwner(AirVaultPrincipal principal, String clipboardId) {
        return checkAccess(principal, clipboardId) == AccessLevel.OWNER;
    }

    /**
     * Delete permissions (Decision D2):
     * - Clipboard owner can delete any item in their clipboard.
     * - An author (collaborator or guest) can delete their own item.
     * - Non-owners / collaborators cannot delete items created by others.
     */
    public boolean canDeleteItem(AirVaultPrincipal principal, String clipboardId, AirVaultClipboardItem item) {
        if (principal == null || clipboardId == null || item == null) {
            return false;
        }
        if (!canWrite(principal, clipboardId)) {
            return false;
        }
        if (isOwner(principal, clipboardId)) {
            return true;
        }

        // Check if caller is the author of this specific item
        return isAuthor(principal, item);
    }

    /**
     * Edit permissions:
     * - Clipboard owner can edit any item.
     * - Item author can edit their own item.
     * - Non-authors cannot edit another user's item.
     */
    public boolean canEditItem(AirVaultPrincipal principal, String clipboardId, AirVaultClipboardItem item) {
        if (principal == null || clipboardId == null || item == null) {
            return false;
        }
        if (!canWrite(principal, clipboardId)) {
            return false;
        }
        if (isOwner(principal, clipboardId)) {
            return true;
        }

        return isAuthor(principal, item);
    }

    private boolean isAuthor(AirVaultPrincipal principal, AirVaultClipboardItem item) {
        String itemAuthor = item.getAuthorId();
        if (itemAuthor == null || itemAuthor.isBlank()) {
            return false;
        }

        String principalUsername = principal.getUsername() != null ? principal.getUsername().trim().toLowerCase().replace("@", "") : "";
        String principalDeviceId = principal.getDeviceId() != null ? principal.getDeviceId().trim() : "";

        String normalizedAuthor = itemAuthor.trim().toLowerCase().replace("@", "");
        return (!principalUsername.isBlank() && principalUsername.equalsIgnoreCase(normalizedAuthor))
                || (!principalDeviceId.isBlank() && principalDeviceId.equalsIgnoreCase(itemAuthor.trim()));
    }
}
