-- ============================================================================
-- V56: Acklet URL Shortener Core Engine
-- Secure server-side URL shortening, server-enforced rules (expiry, schedule,
-- max clicks, one-time consumption), hashed owner tokens, and password protection.
-- ============================================================================

CREATE TABLE IF NOT EXISTS short_links (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    target_url TEXT NOT NULL,
    fallback_url TEXT,
    target_host VARCHAR(255),
    owner_token_hash VARCHAR(64) NOT NULL,
    user_id UUID,
    label TEXT,
    tags TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    start_date TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    clicks BIGINT NOT NULL DEFAULT 0,
    max_clicks BIGINT,
    is_one_time BOOLEAN NOT NULL DEFAULT FALSE,
    is_deactivated BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    has_password BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255),
    password_scheme VARCHAR(32),
    password_salt VARCHAR(64),
    last_opened_at TIMESTAMP WITH TIME ZONE,
    report_count INT NOT NULL DEFAULT 0,
    flagged BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
CREATE INDEX IF NOT EXISTS idx_short_links_target_host ON short_links(target_host);
CREATE INDEX IF NOT EXISTS idx_short_links_owner_token_hash ON short_links(owner_token_hash);
CREATE INDEX IF NOT EXISTS idx_short_links_expires_at ON short_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_short_links_deleted_at ON short_links(deleted_at);
CREATE INDEX IF NOT EXISTS idx_short_links_cleanup ON short_links(is_deactivated, is_one_time, deleted_at, expires_at);
