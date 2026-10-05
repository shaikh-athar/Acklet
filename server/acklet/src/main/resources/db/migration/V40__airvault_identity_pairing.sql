-- V40: Add paired_identity_id to airvault_identities for bidirectional persistent pairing
ALTER TABLE airvault_identities
    ADD COLUMN IF NOT EXISTS paired_identity_id UUID REFERENCES airvault_identities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_airvault_identities_paired_identity_id ON airvault_identities(paired_identity_id);
