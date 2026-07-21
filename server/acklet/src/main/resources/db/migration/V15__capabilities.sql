-- V15__capabilities.sql
-- Adds capability graph table for Acklet's signature feature.

CREATE TABLE IF NOT EXISTS capabilities (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id          UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    name             VARCHAR(200) NOT NULL,
    description      TEXT,
    is_ai_generated  BOOLEAN DEFAULT FALSE,
    confidence       FLOAT   DEFAULT 1.0,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capabilities_tool_id ON capabilities(tool_id);
CREATE INDEX IF NOT EXISTS idx_capabilities_name    ON capabilities(LOWER(name));
