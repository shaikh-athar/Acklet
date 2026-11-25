-- V60__docs_management.sql
-- Acklet Docs Phase 1: Documents and Ordered Sections

CREATE TABLE IF NOT EXISTS doc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_documents_tool_id ON doc_documents(tool_id);
CREATE INDEX IF NOT EXISTS idx_doc_documents_owner_id ON doc_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_doc_documents_status ON doc_documents(status);
CREATE INDEX IF NOT EXISTS idx_doc_documents_updated_at ON doc_documents(updated_at DESC);

CREATE TABLE IF NOT EXISTS doc_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES doc_documents(id) ON DELETE CASCADE,
    heading VARCHAR(255) NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_sections_document_id ON doc_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_sections_doc_position ON doc_sections(document_id, position ASC);
