-- V12__personalization_engine.sql
-- Acklet Personalization & Sync Engine
-- Extends existing schema without modifying any existing table.

-- ─────────────────────────────────────────────────────────────
-- 1. GENERIC ACTIVITY TRACKING
--    Records recently viewed tools, categories, searches, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_activity (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50)  NOT NULL, -- TOOL | CATEGORY | COLLECTION | BLOG | GUIDE | SEARCH
    entity_id   VARCHAR(255),
    entity_slug VARCHAR(255),
    entity_name VARCHAR(255),
    accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata    JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_user_activity_user_type ON user_activity(user_id, entity_type, accessed_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 2. EXTENDED FAVORITES
--    Extends existing user_favorites (tools-only) for all entity types.
--    user_favorites table is left completely untouched.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_favorites_ext (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50)  NOT NULL, -- TOOL | CATEGORY | COLLECTION | BLOG | GUIDE
    entity_id   VARCHAR(255) NOT NULL,
    entity_name VARCHAR(255),
    entity_slug VARCHAR(255),
    is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at   TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, entity_type, entity_id)
);
CREATE INDEX idx_user_fav_ext_user_type ON user_favorites_ext(user_id, entity_type);

-- ─────────────────────────────────────────────────────────────
-- 3. PER-TOOL PREFERENCES
--    Schema-less JSONB per tool slug — no change needed when adding tools.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_tool_preferences (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_slug   VARCHAR(100) NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, tool_slug)
);
CREATE INDEX idx_user_tool_prefs_user ON user_tool_preferences(user_id, tool_slug);
