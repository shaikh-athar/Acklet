-- V63__docs_tool_independent.sql
-- Acklet Docs: Tool-independent documents, global public slugs, and owner dashboard indexes

-- 1. Make tool_id optional on doc_documents (existing rows keep tool_id, new rows have none)
ALTER TABLE doc_documents ALTER COLUMN tool_id DROP NOT NULL;

-- 2. Drop the tool-scoped unique index on slug
DROP INDEX IF EXISTS idx_doc_documents_tool_slug;

-- 3. Create globally unique index on slug (across all documents)
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_documents_global_slug ON doc_documents(slug) WHERE slug IS NOT NULL;

-- 4. Composite indexes for tool-independent owner dashboard queries (last modified, status filter, published sort)
CREATE INDEX IF NOT EXISTS idx_doc_documents_owner_updated 
    ON doc_documents(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_doc_documents_owner_status_updated 
    ON doc_documents(owner_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_doc_documents_owner_published_at 
    ON doc_documents(owner_id, published_at DESC NULLS LAST);
