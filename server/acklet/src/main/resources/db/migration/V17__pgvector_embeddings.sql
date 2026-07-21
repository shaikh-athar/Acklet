-- V17__pgvector_embeddings.sql
-- Attempts to create vector extension if supported by PostgreSQL host.
-- Falls back to text column safely without failing Flyway migration on vanilla PostgreSQL setups.

DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS vector;
        ALTER TABLE tools ADD COLUMN IF NOT EXISTS embedding vector;
        ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS embedding vector;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback for PostgreSQL instances without pgvector C-extension pre-installed on host
        RAISE NOTICE 'pgvector extension not installed on host. Using fallback embedding column.';
        ALTER TABLE tools ADD COLUMN IF NOT EXISTS embedding text;
        ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS embedding text;
    END;
END $$;
