-- V65: Content Management Architecture — Collections and Tools Extensions
-- Enhances collections and collection_tools for curated tool showcases, custom ordering, and SEO metadata.

-- 1. Extend collections table
ALTER TABLE collections
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500),
    ADD COLUMN IF NOT EXISTS introduction TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb;

-- Populate existing collections with URL-safe slugs if null
UPDATE collections
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

-- Backfill status based on legacy is_public flag
UPDATE collections
SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP
WHERE is_public = TRUE AND status = 'DRAFT';

-- 2. Extend collection_tools join table with ordering and item-specific notes
ALTER TABLE collection_tools
    ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_user_status ON collections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_publisher_status ON tools(publisher_id, status);
CREATE INDEX IF NOT EXISTS idx_collection_tools_order ON collection_tools(collection_id, position);
