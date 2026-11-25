-- V62__docs_dashboard_indexes.sql
-- Indexes to optimize dashboard list queries with filtering, searching, and sorting

-- 1. Composite index for filtering by tool and owner, sorted by last modified (default dashboard query)
CREATE INDEX IF NOT EXISTS idx_doc_documents_tool_owner_updated 
    ON doc_documents(tool_id, owner_id, updated_at DESC);

-- 2. Composite index for filtering by tool and status, sorted by last modified
CREATE INDEX IF NOT EXISTS idx_doc_documents_tool_status_updated 
    ON doc_documents(tool_id, status, updated_at DESC);

-- 3. Composite index for filtering by tool and published date sort
CREATE INDEX IF NOT EXISTS idx_doc_documents_tool_published_at 
    ON doc_documents(tool_id, published_at DESC NULLS LAST);
