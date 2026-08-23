-- V11__tool_knowledge_hub.sql
-- Tool Knowledge Hub Schema

-- 1. TOOL KNOWLEDGE (1-to-1 extension table mapping to tools)
CREATE TABLE tool_knowledge (
    tool_id UUID PRIMARY KEY REFERENCES tools(id) ON DELETE CASCADE,
    overview TEXT,
    purpose TEXT,
    problems_solved TEXT,
    who_should_use TEXT,
    who_should_avoid TEXT,
    expected_inputs TEXT,
    expected_outputs TEXT,
    best_practices TEXT,
    advantages TEXT,
    limitations TEXT,
    verified_badge BOOLEAN DEFAULT FALSE,
    maintainer VARCHAR(100),
    official_website VARCHAR(255),
    documentation_url VARCHAR(255),
    github_repository VARCHAR(255),
    technical_details JSONB DEFAULT '{}'::jsonb,
    compatibility JSONB DEFAULT '{}'::jsonb,
    pricing_details JSONB DEFAULT '{}'::jsonb,
    privacy_details JSONB DEFAULT '{}'::jsonb,
    resources JSONB DEFAULT '{}'::jsonb,
    seo_metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. TOOL VERSION HISTORY (1-to-many releases list)
CREATE TABLE tool_version_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    release_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    release_notes TEXT,
    upcoming_features TEXT
);
CREATE INDEX idx_tool_ver_history_tool ON tool_version_history(tool_id);

-- 3. TOOL MEDIA (Gallery Screenshots & GIFs)
CREATE TABLE tool_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    media_type VARCHAR(50) DEFAULT 'SCREENSHOT', -- SCREENSHOT, GIF, VIDEO, DEMO
    url VARCHAR(500) NOT NULL,
    caption VARCHAR(255),
    display_order INT DEFAULT 1
);
CREATE INDEX idx_tool_media_tool ON tool_media(tool_id, display_order);
