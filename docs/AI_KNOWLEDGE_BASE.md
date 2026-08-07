# AI_KNOWLEDGE_BASE.md - Canonical AI Agent Guidelines & Architecture Rules

## Golden Rules for AI Agents & Developers
1. **Understand Before Coding**: Trace end-to-end event flows before mutating services or controllers.
2. **Dual-Theme Readability**: All UI components in Angular must use theme tokens (`var(--vercel-card-bg)`, `var(--vercel-subtle-bg)`, `var(--vercel-border)`). Never hardcode static text colors or dark background boxes.
3. **Async-First Execution**: Never perform heavy Git cloning or build commands synchronously on HTTP request threads. Always dispatch events over RabbitMQ queues (`acklet.import.exchange`).
4. **Permanent Hard Delete**: Tool deletion (`DELETE /api/v1/tools/{slug}`) must permanently delete records (`toolRepository.delete(tool)`) so deleted items never linger in search or workspace queries.
5. **No Invented APIs**: Verify Spring Boot controller mappings and Angular service methods against existing code before invoking them.

## Directory Structure Overview
- `server/acklet/src/main/java/com/code/acklet/`
  - `github/`: Git provider integrations, import workers, and background pipeline execution.
  - `tool/`: Tool entity models, repository management, registry, and public API controllers.
  - `shared/`: JWT security, exceptions, and global configuration.
- `client/src/app/`
  - `core/`: State management (`WorkspaceStateService`), HTTP services (`ToolsService`, `GitHubService`).
  - `pages/`: Workspace UI pages (`tools.ts`, `tool-manage.ts`, `import.ts`).
