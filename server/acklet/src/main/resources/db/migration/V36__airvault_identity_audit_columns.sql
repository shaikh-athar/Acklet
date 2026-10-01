-- V36: Add created_by and updated_by columns to airvault_identities for Auditable entity support
ALTER TABLE airvault_identities
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
