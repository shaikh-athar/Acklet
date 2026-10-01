-- V48__airvault_clipboard_items.sql
-- Migration: Transform monolithic items_json blob into relational rows with atomic sequence and idempotency op_id
-- Rollback note: To rollback, items_json is preserved on airvault_shared_clipboards. Drop table airvault_clipboard_items and column next_seq.

ALTER TABLE airvault_shared_clipboards ADD COLUMN IF NOT EXISTS next_seq BIGINT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS airvault_clipboard_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clipboard_id VARCHAR(64) NOT NULL,
    seq BIGINT NOT NULL,
    op_id VARCHAR(64) NOT NULL,
    author_type VARCHAR(32) NOT NULL DEFAULT 'owner',
    author_name VARCHAR(64),
    author_color VARCHAR(32),
    payload TEXT,
    retention_seconds BIGINT,
    burn_after_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_airvault_clipboard_seq UNIQUE (clipboard_id, seq),
    CONSTRAINT uk_airvault_clipboard_op_id UNIQUE (clipboard_id, op_id)
);

CREATE INDEX IF NOT EXISTS idx_airvault_clipboard_items_seq ON airvault_clipboard_items(clipboard_id, seq);
CREATE INDEX IF NOT EXISTS idx_airvault_clipboard_items_deleted ON airvault_clipboard_items(clipboard_id, deleted_at);
