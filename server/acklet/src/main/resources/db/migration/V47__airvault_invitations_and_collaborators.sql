-- ============================================================================
-- V47: AirVault Invitations & Clipboard Collaborators
-- ============================================================================

CREATE TABLE IF NOT EXISTS airvault_invitations (
    id VARCHAR(64) PRIMARY KEY,
    clipboard_id VARCHAR(64) NOT NULL,
    inviter_user_id VARCHAR(128) NOT NULL,
    invite_type VARCHAR(32) NOT NULL, -- 'USERNAME' | 'LINK'
    target_username VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED'
    access_level VARCHAR(32) NOT NULL DEFAULT 'read-only', -- 'read-only' | 'read-write'
    max_uses INT, -- NULL for unlimited, 1 for single-use
    used_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_airvault_invitations_clipboard ON airvault_invitations (clipboard_id);
CREATE INDEX IF NOT EXISTS idx_airvault_invitations_target ON airvault_invitations (target_username, status);
CREATE INDEX IF NOT EXISTS idx_airvault_invitations_inviter ON airvault_invitations (inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_airvault_invitations_expires ON airvault_invitations (expires_at);

CREATE TABLE IF NOT EXISTS airvault_clipboard_collaborators (
    id BIGSERIAL PRIMARY KEY,
    clipboard_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    access_level VARCHAR(32) NOT NULL DEFAULT 'read-only', -- 'read-only' | 'read-write'
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invited_via VARCHAR(32) NOT NULL DEFAULT 'USERNAME', -- 'USERNAME' | 'LINK'
    invitation_id VARCHAR(64),
    CONSTRAINT uq_airvault_clipboard_collab UNIQUE (clipboard_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_airvault_collaborators_user ON airvault_clipboard_collaborators (user_id);
CREATE INDEX IF NOT EXISTS idx_airvault_collaborators_clip ON airvault_clipboard_collaborators (clipboard_id);
