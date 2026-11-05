-- ============================================================================
-- V58: Acklet Barcode Generator Temporary (Expiring) Barcodes
-- Server-side time-based expiry, cryptographic tokens, field-level encryption,
-- and rate-limited public verification.
-- ============================================================================

CREATE TABLE IF NOT EXISTS temp_codes (
    id UUID PRIMARY KEY,
    owner_token_hash VARCHAR(64) NOT NULL,
    user_id UUID,
    name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    encrypted_token TEXT NOT NULL,
    payload_mode VARCHAR(32) NOT NULL DEFAULT 'LINK', -- 'LINK', 'CODE'
    content_type VARCHAR(32) NOT NULL,                 -- 'MESSAGE', 'LINK', 'REFERENCE_ONLY'
    content TEXT,                                      -- Encrypted at rest with AES-256-GCM
    reference VARCHAR(64),
    barcode_format VARCHAR(32) NOT NULL,               -- 'qrcode', 'datamatrix', 'aztec', 'pdf417', 'code128'
    show_expiry_on_label BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',      -- 'ACTIVE', 'DEACTIVATED', 'EXPIRED'
    check_count BIGINT NOT NULL DEFAULT 0,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    purge_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_temp_codes_token_hash ON temp_codes(token_hash);
CREATE INDEX IF NOT EXISTS idx_temp_codes_owner ON temp_codes(owner_token_hash);
CREATE INDEX IF NOT EXISTS idx_temp_codes_expires_at ON temp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_temp_codes_status ON temp_codes(status);
CREATE INDEX IF NOT EXISTS idx_temp_codes_purge_at ON temp_codes(purge_at);
CREATE INDEX IF NOT EXISTS idx_temp_codes_deleted_at ON temp_codes(deleted_at);

-- Reports submitted against temporary codes
CREATE TABLE IF NOT EXISTS temp_code_reports (
    id UUID PRIMARY KEY,
    code_id UUID NOT NULL REFERENCES temp_codes(id) ON DELETE CASCADE,
    reporter_ip_hash VARCHAR(64) NOT NULL,
    reason VARCHAR(64) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temp_code_reports_code_ip ON temp_code_reports(code_id, reporter_ip_hash);

