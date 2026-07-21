-- V16__ai_jobs_github.sql
-- Adds AI job tracking and GitHub integration tables.

-- 1. AI Jobs — every AI provider call is logged as a job
CREATE TABLE IF NOT EXISTS ai_jobs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id      UUID REFERENCES tools(id) ON DELETE CASCADE,
    job_type     VARCHAR(80)  NOT NULL,  -- SUMMARY|DOCS|SEO|CAPABILITIES|MODERATION|EMBEDDING
    status       VARCHAR(30)  DEFAULT 'PENDING',  -- PENDING|RUNNING|DONE|FAILED|RETRYING
    provider     VARCHAR(50),   -- mistral|gemini|deepseek|ollama
    model        VARCHAR(100),
    prompt_hash  VARCHAR(64),   -- sha256 of prompt for cache key
    result       JSONB,
    error        TEXT,
    tokens_used  INT,
    latency_ms   INT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_tool_id ON ai_jobs(tool_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status  ON ai_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_type    ON ai_jobs(job_type);

-- 2. GitHub Integrations — one per tool (user authorises, tool is linked)
CREATE TABLE IF NOT EXISTS github_integrations (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_id        UUID REFERENCES tools(id) ON DELETE SET NULL,
    github_user    VARCHAR(200),
    github_repo    VARCHAR(200),
    github_repo_id BIGINT,
    default_branch VARCHAR(100) DEFAULT 'main',
    webhook_id     BIGINT,
    access_token   TEXT,   -- encrypted at application layer via EncryptedStringConverter
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_github_integrations_tool
    ON github_integrations(tool_id) WHERE tool_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_github_integrations_user
    ON github_integrations(user_id);
