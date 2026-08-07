# TECHNICAL_DEBT.md - Prioritized Technical Debt Inventory

## Critical Debt (P0 - Immediate Fix Required)
- **Host Process Execution**: Replace native `ProcessBuilder` calls in `ProgressiveImportPipelineExecutor.java` with isolated Docker containers to prevent host code execution.

## High Debt (P1 - Next Sprint)
- **AI Integration Fallbacks**: Replace static fallback summaries in `AiRepositoryAnalysisEngine.java` with active LangChain4j model calls when API keys are configured.
- **Integration Test Coverage**: Add Testcontainers integration tests verifying end-to-end repository import over RabbitMQ and PostgreSQL.

## Medium Debt (P2 - Medium Term)
- **Monorepo Sub-project Build Runner**: Expand single-root process execution to handle nested sub-projects in monorepos.
- **Rate-Limiting & Circuit Breakers**: Implement Resilience4j circuit breakers on GitHub API integrations.
