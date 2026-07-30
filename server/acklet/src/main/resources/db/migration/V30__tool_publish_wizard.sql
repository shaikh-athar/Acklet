-- V30: Tool Drafts (wizard state) + Tool entity enrichment columns
-- Tool drafts hold the publish wizard's per-step state until final publish

CREATE TABLE tool_drafts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_completed      INT  NOT NULL DEFAULT 0,

    -- Step 1 – Identity
    tool_name           VARCHAR(120),
    slug                VARCHAR(120),
    tagline             VARCHAR(300),

    -- Step 3 – AI Info
    description         TEXT,
    problem_statement   TEXT,
    target_audience     VARCHAR(255),
    use_cases           JSONB DEFAULT '[]',
    features            JSONB DEFAULT '[]',
    business_domain     VARCHAR(120),
    ai_confidence_score FLOAT  DEFAULT 0.0,

    -- Step 4 – Tech & Capabilities
    tech_stack          JSONB DEFAULT '[]',
    capabilities        JSONB DEFAULT '[]',

    -- Step 5 – Taxonomy & Pricing
    primary_category_slug VARCHAR(80),
    tags                  JSONB DEFAULT '[]',
    pricing_type          VARCHAR(20) DEFAULT 'FREE',
    license               VARCHAR(80),
    is_open_source        BOOLEAN DEFAULT TRUE,

    -- Step 6 – Branding
    github_url          VARCHAR(500),
    website_url         VARCHAR(500),
    logo_url            VARCHAR(500),
    cover_url           VARCHAR(500),
    documentation_url   VARCHAR(500),
    discord_url         VARCHAR(500),

    -- State
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | PUBLISHED
    published_tool_id   UUID REFERENCES tools(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One active draft per repo per user
    CONSTRAINT uq_draft_repo_user UNIQUE (repository_id, user_id)
);

-- Enrich Tool table with additional fields for published wizard output
ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS repository_id   UUID REFERENCES repositories(id),
    ADD COLUMN IF NOT EXISTS target_audience VARCHAR(255),
    ADD COLUMN IF NOT EXISTS problem_statement TEXT,
    ADD COLUMN IF NOT EXISTS use_cases       JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS features        JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS tech_stack      JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS capabilities    JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS license         VARCHAR(80),
    ADD COLUMN IF NOT EXISTS platforms       JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS documentation_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ai_confidence_score FLOAT DEFAULT 0.0;
