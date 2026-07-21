-- V13__publisher_tool_ownership.sql
-- Extends tools table with publisher ownership, lifecycle status, and tag system.
-- Does NOT modify any existing column.

-- 1. Extend tools with publisher fields
ALTER TABLE tools ADD COLUMN IF NOT EXISTS publisher_id    UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS tagline         VARCHAR(300);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS website_url     VARCHAR(512);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS github_url      VARCHAR(512);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS logo_url        VARCHAR(512);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS cover_url       VARCHAR(512);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS pricing_type    VARCHAR(20)  DEFAULT 'FREE';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS is_open_source  BOOLEAN      DEFAULT FALSE;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS status          VARCHAR(30)  DEFAULT 'ACTIVE';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'UNVERIFIED';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS upvote_count    BIGINT       DEFAULT 0;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_tools_publisher_id  ON tools(publisher_id);
CREATE INDEX IF NOT EXISTS idx_tools_status        ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_verification  ON tools(verification_status);

-- 2. Tool upvotes (one per user per tool)
CREATE TABLE IF NOT EXISTS tool_upvotes (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_id    UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tool_id)
);

-- 3. Tags
CREATE TABLE IF NOT EXISTS tags (
    id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tool_tags (
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (tool_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_tool_tags_tag_id ON tool_tags(tag_id);
