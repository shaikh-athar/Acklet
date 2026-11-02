-- ============================================================================
-- V57: Acklet URL Shortener Analytics & Reporting Architecture
-- Daily click aggregation for 7d/30d trends, abuse reporting audit trail,
-- and UTM parameter persistence.
-- ============================================================================

-- Daily click aggregation table for trend analysis
CREATE TABLE IF NOT EXISTS short_link_daily_clicks (
    id UUID PRIMARY KEY,
    link_id UUID NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
    click_date DATE NOT NULL,
    clicks BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT uq_short_link_daily_clicks UNIQUE (link_id, click_date)
);

CREATE INDEX IF NOT EXISTS idx_short_link_daily_clicks_date ON short_link_daily_clicks(click_date);
CREATE INDEX IF NOT EXISTS idx_short_link_daily_clicks_link ON short_link_daily_clicks(link_id);

-- Link abuse reports table
CREATE TABLE IF NOT EXISTS short_link_reports (
    id UUID PRIMARY KEY,
    link_id UUID NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
    reporter_ip_hash VARCHAR(64) NOT NULL,
    reason VARCHAR(64) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_short_link_reports_link ON short_link_reports(link_id);
CREATE INDEX IF NOT EXISTS idx_short_link_reports_reporter ON short_link_reports(reporter_ip_hash, created_at);

-- Add UTM parameters JSON/TEXT column to short_links
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS utm_params TEXT;

