-- V45__unified_feedback_system.sql
-- Centralized multi-tool feedback system for Acklet

CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    rating INTEGER NOT NULL DEFAULT 5,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- BUG, FEATURE_REQUEST, USABILITY, GENERAL, PERFORMANCE
    tool_id VARCHAR(100) NOT NULL DEFAULT 'platform', -- e.g. 'json-lens', 'airvault', 'platform'
    tool_name VARCHAR(150),
    email VARCHAR(255),
    source VARCHAR(50) NOT NULL DEFAULT 'IN_APP', -- IN_APP, EMAIL, EXTERNAL, API, MANUAL
    page_url VARCHAR(500),
    user_agent VARCHAR(500),
    device_type VARCHAR(50) DEFAULT 'desktop',
    status VARCHAR(50) NOT NULL DEFAULT 'NEW', -- NEW, REVIEWING, PLANNED, RESOLVED, REJECTED
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_tool_id ON feedbacks(tool_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_category ON feedbacks(category);
CREATE INDEX IF NOT EXISTS idx_feedbacks_source ON feedbacks(source);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
