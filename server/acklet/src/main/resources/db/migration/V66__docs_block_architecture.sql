-- V66__docs_block_architecture.sql
-- Acklet Docs: Block Editor Content Model, Versioning, and Media Tracking

-- 1. Add blocks JSONB column and optimistic concurrency version to doc_documents
ALTER TABLE doc_documents ADD COLUMN IF NOT EXISTS blocks JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE doc_documents ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- 2. Media tracking table for uploaded story assets (to validate limits and clean up orphans)
CREATE TABLE IF NOT EXISTS doc_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES doc_documents(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    media_type VARCHAR(32) NOT NULL, -- 'IMAGE' or 'VIDEO'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_media_document_id ON doc_media(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_media_filename ON doc_media(filename);

-- 3. Data Migration: Convert existing doc_sections into blocks JSONB array
DO $$
DECLARE
    doc_rec RECORD;
    sec_rec RECORD;
    doc_blocks JSONB;
    p_line TEXT;
    line_arr TEXT[];
BEGIN
    FOR doc_rec IN SELECT id FROM doc_documents LOOP
        doc_blocks := '[]'::jsonb;
        
        FOR sec_rec IN SELECT heading, body FROM doc_sections WHERE document_id = doc_rec.id ORDER BY position ASC LOOP
            -- Heading block if non-empty
            IF sec_rec.heading IS NOT NULL AND trim(sec_rec.heading) <> '' AND trim(sec_rec.heading) <> 'Story' THEN
                doc_blocks := doc_blocks || jsonb_build_object(
                    'id', gen_random_uuid()::text,
                    'type', 'heading1',
                    'text', trim(sec_rec.heading)
                );
            END IF;
            
            -- Body lines into paragraph blocks
            IF sec_rec.body IS NOT NULL AND trim(sec_rec.body) <> '' THEN
                line_arr := regexp_split_to_array(sec_rec.body, E'\n+');
                FOREACH p_line IN ARRAY line_arr LOOP
                    IF trim(p_line) <> '' THEN
                        doc_blocks := doc_blocks || jsonb_build_object(
                            'id', gen_random_uuid()::text,
                            'type', 'paragraph',
                            'text', trim(p_line)
                        );
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
        
        -- Update the document with converted blocks if any were generated
        IF jsonb_array_length(doc_blocks) > 0 THEN
            UPDATE doc_documents SET blocks = doc_blocks WHERE id = doc_rec.id;
        END IF;
    END LOOP;
END $$;
