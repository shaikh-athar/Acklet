-- V46__airvault_shared_clipboards.sql
-- Standalone Shareable Clipboard-ID Access Layer

CREATE TABLE IF NOT EXISTS airvault_shared_clipboards (
    id VARCHAR(64) PRIMARY KEY,
    owner_username VARCHAR(64),
    owner_device_id VARCHAR(64),
    title VARCHAR(255),
    access_mode VARCHAR(32) NOT NULL DEFAULT 'read-only',
    items_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_airvault_clipboards_owner ON airvault_shared_clipboards(owner_username);
CREATE INDEX IF NOT EXISTS idx_airvault_clipboards_expires ON airvault_shared_clipboards(expires_at);
CREATE INDEX IF NOT EXISTS idx_airvault_clipboards_device ON airvault_shared_clipboards(owner_device_id);
