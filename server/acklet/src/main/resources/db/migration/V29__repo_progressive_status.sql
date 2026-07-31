-- V29__repo_progressive_status.sql
-- Add status tracking fields to repositories for progressive loading strategy

ALTER TABLE repositories 
ADD COLUMN IF NOT EXISTS status_metadata_fetched BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status_tree_analyzed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status_ai_analyzed BOOLEAN NOT NULL DEFAULT FALSE;
