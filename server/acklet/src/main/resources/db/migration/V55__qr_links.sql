-- ============================================================================
-- V55: Dynamic QR Links Engine
-- High-performance dynamic link redirection, hosted mobile-first text,
-- vCard sharing, anonymous manage tokens, and rolling TTL lifecycle.
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_links (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    type VARCHAR(32) NOT NULL DEFAULT 'URL',
    payload TEXT NOT NULL,
    mime VARCHAR(128),
    content_bytes BIGINT NOT NULL DEFAULT 0,
    manage_token_hash VARCHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    scan_count BIGINT NOT NULL DEFAULT 0,
    last_scan_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_downloaded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_qr_links_code ON qr_links(code);
CREATE INDEX IF NOT EXISTS idx_qr_links_manage_token_hash ON qr_links(manage_token_hash);
CREATE INDEX IF NOT EXISTS idx_qr_links_status ON qr_links(status);
CREATE INDEX IF NOT EXISTS idx_qr_links_expires_at ON qr_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_links_orphan ON qr_links(is_downloaded, scan_count, created_at);
