-- V44__airvault_storage_cleanup_log.sql
-- Separate audit logging for Path A (File Retention) and Path B (Dead Chunk Cleanup)

CREATE TABLE IF NOT EXISTS airvault_storage_cleanup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleanup_path VARCHAR(20) NOT NULL, -- 'FILE' (Path A) or 'CHUNK' (Path B)
    object_key VARCHAR(500) NOT NULL,
    file_id VARCHAR(100),
    session_id UUID,
    reason VARCHAR(50) NOT NULL, -- EXPIRED, SOFT_DELETED, ORPHANED_FILE, DEAD_CHUNK_SESSION, STALE_INCOMPLETE_CHUNK, ORPHANED_CHUNK_DIR
    byte_size BIGINT NOT NULL DEFAULT 0,
    phase1_marked_at TIMESTAMPTZ,
    phase2_deleted_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL, -- MARKED, DELETED, UNMARKED_ACTIVE, DRY_RUN, FAILED
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_airvault_cleanup_path ON airvault_storage_cleanup_log(cleanup_path);
CREATE INDEX IF NOT EXISTS idx_airvault_cleanup_key ON airvault_storage_cleanup_log(object_key);
CREATE INDEX IF NOT EXISTS idx_airvault_cleanup_status ON airvault_storage_cleanup_log(status);
CREATE INDEX IF NOT EXISTS idx_airvault_cleanup_marked_at ON airvault_storage_cleanup_log(phase1_marked_at);
