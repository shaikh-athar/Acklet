-- V51: Add missing runtime execution and subdomain columns to tools table
ALTER TABLE tools ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(50) DEFAULT 'BROWSER';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS subdomain VARCHAR(255);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS runtime VARCHAR(50);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS build_command VARCHAR(255);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS start_command VARCHAR(255);
ALTER TABLE tools ADD COLUMN IF NOT EXISTS port INTEGER;

-- Ensure repository sync columns are present
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS webhook_registered BOOLEAN DEFAULT FALSE;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS latest_commit_sha VARCHAR(255);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'SYNCED';
