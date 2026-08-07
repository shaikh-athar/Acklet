-- V32__vercel_deployments.sql
CREATE TABLE IF NOT EXISTS deployments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id   UUID REFERENCES repositories(id) ON DELETE CASCADE,
    tool_id         UUID REFERENCES tools(id) ON DELETE SET NULL,
    commit_sha      VARCHAR(255),
    commit_message  TEXT,
    branch          VARCHAR(100),
    author          VARCHAR(255),
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    build_logs      TEXT,
    runtime_logs    TEXT,
    duration_ms     BIGINT DEFAULT 0,
    framework       VARCHAR(100),
    runtime         VARCHAR(50),
    package_manager VARCHAR(50),
    port            INTEGER,
    live_url        VARCHAR(500),
    build_command   VARCHAR(255),
    start_command   VARCHAR(255),
    created_by      VARCHAR(255),
    health_status   VARCHAR(50) DEFAULT 'HEALTHY',
    cpu_usage       VARCHAR(50) DEFAULT '0%',
    memory_usage    VARCHAR(50) DEFAULT '0MB',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deployments_repo ON deployments(repository_id);
CREATE INDEX IF NOT EXISTS idx_deployments_tool ON deployments(tool_id);
