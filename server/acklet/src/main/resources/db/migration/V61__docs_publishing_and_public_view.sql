-- V61__docs_publishing_and_public_view.sql
-- Phase 2: Docs Preview, Publishing, and Public View

ALTER TABLE doc_documents ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE doc_documents ADD COLUMN IF NOT EXISTS summary VARCHAR(160);
ALTER TABLE doc_documents ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Create unique index on tool_id and slug (only when slug is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_documents_tool_slug ON doc_documents(tool_id, slug);
CREATE INDEX IF NOT EXISTS idx_doc_documents_published_at ON doc_documents(published_at DESC);
