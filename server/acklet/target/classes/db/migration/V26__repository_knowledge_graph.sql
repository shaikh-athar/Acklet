-- V26__repository_knowledge_graph.sql
-- Database adjustments for AI Progressive Repository Analysis

CREATE TABLE IF NOT EXISTS repository_knowledge_graphs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE UNIQUE,
    summary             TEXT,
    purpose             TEXT,
    target_audience     VARCHAR(255),
    business_domain     VARCHAR(255),
    key_capabilities    JSONB DEFAULT '[]'::jsonb,
    architecture_type   VARCHAR(100), -- Monolith, Microservice, Frontend, Library etc.
    architecture_conf   DOUBLE PRECISION DEFAULT 1.0,
    infrastructure_style VARCHAR(100), -- Docker, Kubernetes, Serverless, VM etc.
    doc_completeness    DOUBLE PRECISION DEFAULT 0.0,
    ai_tags             JSONB DEFAULT '[]'::jsonb,
    analyzed_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repo_kg_domain ON repository_knowledge_graphs(business_domain);
CREATE INDEX IF NOT EXISTS idx_repo_kg_arch ON repository_knowledge_graphs(architecture_type);
