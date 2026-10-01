-- ============================================================================
-- V49: AirVault Schema Hardening, FK Cascades, Orphan Cleanup & Atomic Sequencing
-- ============================================================================
-- Rollback Notes:
-- To rollback, drop constraints and added columns:
-- ALTER TABLE airvault_clipboard_items DROP CONSTRAINT IF EXISTS fk_airvault_items_clipboard;
-- ALTER TABLE airvault_clipboard_files DROP CONSTRAINT IF EXISTS fk_airvault_files_clipboard;
-- ALTER TABLE airvault_clipboard_collaborators DROP CONSTRAINT IF EXISTS fk_airvault_collaborators_clipboard;
-- ALTER TABLE airvault_invitations DROP CONSTRAINT IF EXISTS fk_airvault_invitations_clipboard;
-- ALTER TABLE airvault_shared_clipboards DROP CONSTRAINT IF EXISTS fk_airvault_clipboards_owner_identity;
-- ALTER TABLE airvault_shared_clipboards DROP COLUMN IF EXISTS owner_identity_id;
-- ALTER TABLE airvault_clipboard_items DROP COLUMN IF EXISTS author_id;
-- ALTER TABLE airvault_clipboard_items DROP COLUMN IF EXISTS last_change_seq;
-- ALTER TABLE airvault_clipboard_items DROP COLUMN IF EXISTS burned_at;
-- ALTER TABLE airvault_clipboard_items DROP COLUMN IF EXISTS expires_at;
-- ============================================================================

-- 1. Ensure default/orphan clipboard exists if any orphaned records reference 'default'
INSERT INTO airvault_shared_clipboards (id, title, access_mode, items_json, next_seq, created_at, updated_at)
VALUES ('default', 'Default Clipboard', 'read-write', '[]', 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Clean Orphan Rows: Remove items/files/collaborators/invitations whose clipboard_id does NOT exist in airvault_shared_clipboards
DELETE FROM airvault_clipboard_items
WHERE clipboard_id NOT IN (SELECT id FROM airvault_shared_clipboards);

DELETE FROM airvault_clipboard_files
WHERE clipboard_id NOT IN (SELECT id FROM airvault_shared_clipboards);

DELETE FROM airvault_clipboard_collaborators
WHERE clipboard_id NOT IN (SELECT id FROM airvault_shared_clipboards);

DELETE FROM airvault_invitations
WHERE clipboard_id NOT IN (SELECT id FROM airvault_shared_clipboards);

-- 3. Add owner_identity_id to airvault_shared_clipboards and backfill from airvault_identities
ALTER TABLE airvault_shared_clipboards
    ADD COLUMN IF NOT EXISTS owner_identity_id UUID;

UPDATE airvault_shared_clipboards c
SET owner_identity_id = i.id
FROM airvault_identities i
WHERE LOWER(c.owner_username) = LOWER(i.username)
  AND c.owner_identity_id IS NULL;

-- 4. Add Foreign Keys with CASCADE DELETE
ALTER TABLE airvault_shared_clipboards
    ADD CONSTRAINT fk_airvault_clipboards_owner_identity
    FOREIGN KEY (owner_identity_id)
    REFERENCES airvault_identities(id)
    ON DELETE SET NULL;

ALTER TABLE airvault_clipboard_items
    ADD CONSTRAINT fk_airvault_items_clipboard
    FOREIGN KEY (clipboard_id)
    REFERENCES airvault_shared_clipboards(id)
    ON DELETE CASCADE;

ALTER TABLE airvault_clipboard_files
    ADD CONSTRAINT fk_airvault_files_clipboard
    FOREIGN KEY (clipboard_id)
    REFERENCES airvault_shared_clipboards(id)
    ON DELETE CASCADE;

ALTER TABLE airvault_clipboard_collaborators
    ADD CONSTRAINT fk_airvault_collaborators_clipboard
    FOREIGN KEY (clipboard_id)
    REFERENCES airvault_shared_clipboards(id)
    ON DELETE CASCADE;

ALTER TABLE airvault_invitations
    ADD CONSTRAINT fk_airvault_invitations_clipboard
    FOREIGN KEY (clipboard_id)
    REFERENCES airvault_shared_clipboards(id)
    ON DELETE CASCADE;

-- 5. Harden airvault_clipboard_items Schema: author_id, last_change_seq, burned_at, expires_at
ALTER TABLE airvault_clipboard_items
    ADD COLUMN IF NOT EXISTS author_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS last_change_seq BIGINT,
    ADD COLUMN IF NOT EXISTS burned_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Backfill last_change_seq from existing seq if null
UPDATE airvault_clipboard_items
SET last_change_seq = seq
WHERE last_change_seq IS NULL;

ALTER TABLE airvault_clipboard_items
    ALTER COLUMN last_change_seq SET NOT NULL;

-- Backfill author_id from author_name if author_id is null
UPDATE airvault_clipboard_items
SET author_id = author_name
WHERE author_id IS NULL AND author_name IS NOT NULL;

-- 6. Create Targeted Indexes
CREATE INDEX IF NOT EXISTS idx_airvault_clipboards_owner_identity ON airvault_shared_clipboards(owner_identity_id);
CREATE INDEX IF NOT EXISTS idx_airvault_items_clip_change_seq ON airvault_clipboard_items(clipboard_id, last_change_seq);
CREATE INDEX IF NOT EXISTS idx_airvault_items_clip_expires ON airvault_clipboard_items(clipboard_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_airvault_items_author ON airvault_clipboard_items(author_id);
