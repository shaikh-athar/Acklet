-- V35__deployment_failure_info.sql
-- Add failure information columns to deployments table for structured error reporting
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS failure_stage VARCHAR(100);
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS failure_code VARCHAR(100);
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS exit_code INTEGER;
