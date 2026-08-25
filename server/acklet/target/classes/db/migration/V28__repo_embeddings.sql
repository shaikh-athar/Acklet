-- V28__repo_embeddings.sql
-- Add vector embedding column for Repository Knowledge Graph semantic search

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE repository_knowledge_graphs 
ADD COLUMN IF NOT EXISTS embedding vector(1536);
