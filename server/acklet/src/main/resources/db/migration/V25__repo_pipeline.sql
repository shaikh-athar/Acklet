-- V25__repo_pipeline.sql
-- Database tables for Repository Import Pipeline (Phase 1 & Phase 2)

CREATE TABLE IF NOT EXISTS repositories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL DEFAULT 'GITHUB',
    external_id     VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    default_branch  VARCHAR(100) NOT NULL DEFAULT 'main',
    is_private      BOOLEAN NOT NULL DEFAULT FALSE,
    html_url        VARCHAR(500) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, provider, external_id)
);

CREATE TABLE IF NOT EXISTS repository_metadata (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE UNIQUE,
    description         TEXT,
    homepage            VARCHAR(500),
    license_name        VARCHAR(200),
    primary_language    VARCHAR(100),
    languages           JSONB DEFAULT '{}'::jsonb,
    topics              JSONB DEFAULT '[]'::jsonb,
    contributors_count  INTEGER DEFAULT 0,
    commit_count        INTEGER DEFAULT 0,
    has_issues          BOOLEAN DEFAULT TRUE,
    has_wiki            BOOLEAN DEFAULT FALSE,
    has_discussions     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS repository_statistics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id   UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE UNIQUE,
    stars           INTEGER NOT NULL DEFAULT 0,
    forks           INTEGER NOT NULL DEFAULT 0,
    watchers        INTEGER NOT NULL DEFAULT 0,
    size_kb         INTEGER NOT NULL DEFAULT 0,
    open_issues     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS repository_health (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE UNIQUE,
    health_score        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    maintenance_score   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    activity_score      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    popularity_score    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    calculated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repository_trees (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id           UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE UNIQUE,
    tree_structure          JSONB NOT NULL DEFAULT '[]'::jsonb,
    detected_build_files    JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repository_projects (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    path                VARCHAR(500) NOT NULL, -- e.g., "/" or "apps/web"
    name                VARCHAR(255) NOT NULL,
    framework           VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    package_manager     VARCHAR(50) NOT NULL DEFAULT 'Unknown',
    tool_id             UUID REFERENCES tools(id) ON DELETE SET NULL,
    UNIQUE (repository_id, path)
);

CREATE INDEX IF NOT EXISTS idx_repos_user_id ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repositories(full_name);
CREATE INDEX IF NOT EXISTS idx_repo_projects_repo ON repository_projects(repository_id);
