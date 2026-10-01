-- V50__airvault_user_settings_and_personal_clipboards.sql
-- Adds versioned user settings per identity and personal clipboard indicator

-- 1. Add is_personal column to airvault_shared_clipboards
ALTER TABLE airvault_shared_clipboards 
ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_airvault_clipboards_personal 
ON airvault_shared_clipboards(owner_identity_id, is_personal) 
WHERE deleted_at IS NULL;

-- 2. Create airvault_user_settings table for cross-device settings sync
CREATE TABLE IF NOT EXISTS airvault_user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL UNIQUE REFERENCES airvault_identities(id) ON DELETE CASCADE,
    username VARCHAR(64) NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    settings_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_airvault_user_settings_identity_id ON airvault_user_settings(identity_id);
CREATE INDEX IF NOT EXISTS idx_airvault_user_settings_username ON airvault_user_settings(username);
