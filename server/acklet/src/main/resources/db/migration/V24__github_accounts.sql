-- V24__github_accounts.sql
-- User-scoped GitHub account connections (one user can link multiple GitHub accounts).
-- The existing github_integrations table (tool-scoped, per V16) is NOT modified.

CREATE TABLE IF NOT EXISTS github_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_user_id  BIGINT NOT NULL,
    github_login    VARCHAR(255) NOT NULL,
    avatar_url      VARCHAR(500),
    access_token    TEXT NOT NULL,  -- AES-256 encrypted at application layer
    scopes          VARCHAR(500),
    connected_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, github_user_id)
);

CREATE INDEX IF NOT EXISTS idx_github_accounts_user_id ON github_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_github_accounts_login   ON github_accounts(github_login);

-- Import jobs: tracks async tool-import progress so the frontend can poll status
CREATE TABLE IF NOT EXISTS github_import_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_account_id UUID REFERENCES github_accounts(id) ON DELETE SET NULL,
    repo_full_name  VARCHAR(500) NOT NULL,   -- e.g. "athar-taj/acklet-cli"
    tool_id         UUID REFERENCES tools(id) ON DELETE SET NULL,
    status          VARCHAR(50)  NOT NULL DEFAULT 'PENDING',  -- PENDING|CLONING|ANALYZING|AI_GENERATION|DONE|FAILED
    current_step    VARCHAR(100),
    error_message   TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_github_import_jobs_user   ON github_import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_github_import_jobs_status ON github_import_jobs(status);
