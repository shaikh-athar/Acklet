-- V27__repo_sync_history.sql
-- Add sync history logs for smart webhook incremental updates

CREATE TABLE IF NOT EXISTS repository_sync_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id   UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha      VARCHAR(100) NOT NULL,
    committer       VARCHAR(255) NOT NULL,
    changed_files   JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_full_rescan  BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repo_sync_history_repo ON repository_sync_history(repository_id);
