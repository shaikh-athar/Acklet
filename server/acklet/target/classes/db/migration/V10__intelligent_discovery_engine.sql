-- V10__intelligent_discovery_engine.sql
-- Intelligent Discovery Engine Extension Schema

-- 1. SEARCH SYNONYMS
CREATE TABLE search_synonyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term VARCHAR(100) NOT NULL,
    synonyms TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_search_synonyms_term ON search_synonyms(LOWER(term));

-- 2. HOMEPAGE SECTION CONFIGURATIONS
CREATE TABLE homepage_section_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_key VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(255),
    display_order INT DEFAULT 1,
    is_enabled BOOLEAN DEFAULT TRUE,
    item_limit INT DEFAULT 6
);

-- Seed default dynamic homepage discovery sections
INSERT INTO homepage_section_configs (section_key, title, subtitle, display_order, is_enabled, item_limit)
VALUES 
    ('FEATURED', 'Featured Tools', 'Hand-picked premium developer tools', 1, true, 6),
    ('TRENDING', 'Trending Now', 'Tools with rapid community growth', 2, true, 6),
    ('POPULAR', 'Most Popular', 'High-throughput tools used daily', 3, true, 6),
    ('HIDDEN_GEMS', 'Hidden Gems', 'Under-the-radar productivity tools', 4, true, 4),
    ('NEW_RELEASES', 'New Releases', 'Recently published offline-first utilities', 5, true, 6)
ON CONFLICT (section_key) DO NOTHING;

-- 3. DISCOVERY RANKING WEIGHTS
CREATE TABLE discovery_ranking_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relevance_weight DOUBLE PRECISION DEFAULT 0.4,
    popularity_weight DOUBLE PRECISION DEFAULT 0.25,
    trending_weight DOUBLE PRECISION DEFAULT 0.15,
    quality_weight DOUBLE PRECISION DEFAULT 0.2,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default ranking weights configuration
INSERT INTO discovery_ranking_weights (relevance_weight, popularity_weight, trending_weight, quality_weight)
VALUES (0.4, 0.25, 0.15, 0.2);

-- 4. TOOL RELATIONSHIPS (Alternative & Next Tools)
CREATE TABLE tool_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    target_tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- ALTERNATIVE, FREQUENTLY_USED_TOGETHER, RECOMMENDED_NEXT, SIMILAR_PROBLEM
    confidence_score DOUBLE PRECISION DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tool_rel UNIQUE (source_tool_id, target_tool_id, relationship_type)
);
CREATE INDEX idx_tool_rel_source ON tool_relationships(source_tool_id, relationship_type);
