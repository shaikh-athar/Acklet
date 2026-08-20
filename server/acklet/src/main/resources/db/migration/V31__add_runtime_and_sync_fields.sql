-- Add runtime execution configurations to tools table
ALTER TABLE tools ADD COLUMN execution_mode VARCHAR(50) DEFAULT 'BROWSER';
ALTER TABLE tools ADD COLUMN subdomain VARCHAR(255);
ALTER TABLE tools ADD COLUMN runtime VARCHAR(50);
ALTER TABLE tools ADD COLUMN build_command VARCHAR(255);
ALTER TABLE tools ADD COLUMN start_command VARCHAR(255);
ALTER TABLE tools ADD COLUMN port INTEGER;

-- Add webhook and synchronization details to repositories table
ALTER TABLE repositories ADD COLUMN webhook_registered BOOLEAN DEFAULT FALSE;
ALTER TABLE repositories ADD COLUMN latest_commit_sha VARCHAR(255);
ALTER TABLE repositories ADD COLUMN sync_status VARCHAR(50) DEFAULT 'SYNCED';
