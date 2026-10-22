-- ============================================================================
-- V54: Dynamic & Hosted QR Codes Architecture
-- Short URLs, Manage Keys, Hosted Content, Assets, and Privacy-First Analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_codes (
    code VARCHAR(32) PRIMARY KEY,
    type VARCHAR(32) NOT NULL DEFAULT 'DYNAMIC_URL',
    title VARCHAR(255),
    target_url TEXT,
    content_json TEXT,
    password_hash VARCHAR(255),
    has_password BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    manage_key_hash VARCHAR(64) NOT NULL,
    scan_count BIGINT NOT NULL DEFAULT 0,
    unique_scan_count BIGINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_manage_key_hash ON qr_codes(manage_key_hash);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at);

CREATE TABLE IF NOT EXISTS qr_assets (
    id VARCHAR(64) PRIMARY KEY,
    qr_code VARCHAR(32) NOT NULL REFERENCES qr_codes(code) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    detected_mime VARCHAR(128),
    size_bytes BIGINT NOT NULL DEFAULT 0,
    storage_path VARCHAR(512) NOT NULL,
    content_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_assets_qr_code ON qr_assets(qr_code);

CREATE TABLE IF NOT EXISTS qr_scans (
    id BIGSERIAL PRIMARY KEY,
    qr_code VARCHAR(32) NOT NULL REFERENCES qr_codes(code) ON DELETE CASCADE,
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    country_code VARCHAR(8),
    city VARCHAR(64),
    device_type VARCHAR(32),
    os VARCHAR(32),
    browser VARCHAR(32),
    referrer VARCHAR(512),
    visitor_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_code_time ON qr_scans(qr_code, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scans_unique ON qr_scans(qr_code, visitor_hash, scanned_at);
