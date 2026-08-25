-- V14__reviews_and_trust.sql
-- Adds tool reviews and trust scoring system.

-- 1. Tool reviews (one per user per tool)
CREATE TABLE IF NOT EXISTS tool_reviews (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id           UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating            SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title             VARCHAR(200),
    body              TEXT,
    use_case          TEXT,
    pros              TEXT[],
    cons              TEXT[],
    is_verified       BOOLEAN DEFAULT FALSE,
    moderation_status VARCHAR(20) DEFAULT 'PENDING',
    helpful_count     INT DEFAULT 0,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP WITH TIME ZONE,
    UNIQUE (tool_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_tool_id ON tool_reviews(tool_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON tool_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status  ON tool_reviews(moderation_status);

-- 2. Trust scores (computed per tool, one row per tool)
CREATE TABLE IF NOT EXISTS tool_trust_scores (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id             UUID NOT NULL UNIQUE REFERENCES tools(id) ON DELETE CASCADE,
    overall_score       FLOAT DEFAULT 0.0,
    performance_score   FLOAT DEFAULT 0.0,
    security_score      FLOAT DEFAULT 0.0,
    documentation_score FLOAT DEFAULT 0.0,
    accessibility_score FLOAT DEFAULT 0.0,
    maintenance_score   FLOAT DEFAULT 0.0,
    community_score     FLOAT DEFAULT 0.0,
    computed_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trust_scores_tool_id ON tool_trust_scores(tool_id);
