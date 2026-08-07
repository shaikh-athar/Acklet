# IMPORT_PIPELINE.md - Repository Import Lifecycle Specification

## Pipeline Overview
The repository import workflow handles asynchronous ingestion from Git providers through to build deployment.

```
[User Import Request]
        │
        ▼
Post /api/v1/github/import
        │
        ▼
[Publish RepoImportEvent to RabbitMQ]
        │
        ├──► Stage 1: Metadata Fetch Worker (Fetch stars, branch, license)
        │
        ├──► Stage 2: Clone & Directory Tree Worker (Scan & detect frameworks)
        │
        ├──► Stage 3: Process Build Execution (Run install & build commands)
        │
        └──► Stage 4: AI Enrichment & Knowledge Graph Generation
```

## Inputs & Overrides
- `repoFullName` (e.g. `owner/repo`)
- `branch` (e.g. `main` or custom branch)
- `buildCommand` (e.g. `npm run build` override)
- `startCommand` (e.g. `npm start` override)
- `installCommand` (e.g. `npm install` override)
- `envVars` (Key-Value map injected into build process)

## Status States
- `PENDING` $\rightarrow$ `CLONING` $\rightarrow$ `ANALYZING` $\rightarrow$ `AI_GENERATION` $\rightarrow$ `DONE` (or `FAILED` on exit errors).
