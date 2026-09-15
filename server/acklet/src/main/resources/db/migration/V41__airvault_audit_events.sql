-- V41__airvault_audit_events.sql
-- Comprehensive AirVault Audit Events Storage

CREATE TABLE IF NOT EXISTS airvault_audit_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(64) NOT NULL,
    actor_identity_id UUID NULL,
    actor_username VARCHAR(64) NULL,
    device_id VARCHAR(64) NULL,
    ip_address VARCHAR(64) NULL,
    target_resource_id VARCHAR(128) NULL,
    result VARCHAR(16) NOT NULL,
    before_value TEXT NULL,
    after_value TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimized indices for actor history retrieval, date range scans, and type filtering
CREATE INDEX IF NOT EXISTS idx_airvault_audit_actor_time ON airvault_audit_events (actor_identity_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_airvault_audit_username_time ON airvault_audit_events (actor_username, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_airvault_audit_device_time ON airvault_audit_events (device_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_airvault_audit_type_time ON airvault_audit_events (event_type, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_airvault_audit_time ON airvault_audit_events (timestamp_utc DESC);
