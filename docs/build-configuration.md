# Project Build & Docker Configuration

This document outlines the build configuration, containerization, and version control rules for the Acklet project.

## Tracked Infrastructure & Build Files

The project consolidates version control and containerization to single root configurations:

- Single Root Docker Compose descriptor ([docker-compose.yml](file:///Users/ayaz/Acklet/docker-compose.yml))
- Single Root `.gitignore` ([.gitignore](file:///Users/ayaz/Acklet/.gitignore))
- Server Maven Project descriptor ([server/acklet/pom.xml](file:///Users/ayaz/Acklet/server/acklet/pom.xml))
- Server Dockerfile build configuration ([server/acklet/Dockerfile](file:///Users/ayaz/Acklet/server/acklet/Dockerfile))

## Unified Root `.gitignore` Standard

A single standard root [.gitignore](file:///Users/ayaz/Acklet/.gitignore) covers both the Angular frontend client and Spring Boot Java backend server:

- **OS / IDE**: `.DS_Store`, `.idea/`, `.vscode/`, `*.swp`
- **Frontend / Client**: `node_modules/`, `dist/`, `.angular/`, log files
- **Backend / Server**: `target/`, `build/`, `out/`, `.gradle/`
- **Secrets / Environment**: `.env`, `.env.*` (excluding `.env.example`)

## Docker Compose Services

The single root [docker-compose.yml](file:///Users/ayaz/Acklet/docker-compose.yml) provisions the infrastructure and application services:

1. **PostgreSQL (`pgvector/pgvector:pg16`)**: Port `5433:5432` with pgvector extension.
2. **Redis (`redis:7-alpine`)**: Port `6379:6379` for caching.
3. **RabbitMQ (`rabbitmq:3.13-management-alpine`)**: Ports `5672:5672` (AMQP) & `15672:15672` (Management Dashboard UI).
4. **Backend (`acklet-backend`)**: Port `8080:8080`, built from `server/acklet/Dockerfile`.

## Frontend Applications & Build Configuration

The Angular workspace in `client/` supports multi-application compilation targeting distinct subdomains and platforms:

- **`platform-client` (`acklet-portal`)**: The primary Acklet platform (`npm run build`). Outputs to `client/dist/acklet-portal`.
- **`tool-online-clipboard`**: The dedicated standalone Online Clipboard application (`npx ng build tool-online-clipboard`). Outputs to `client/dist/tool-online-clipboard`.
- **`tools-hub`**: The standalone Tools Hub launcher (`npx ng build tools-hub`). Outputs to `client/dist/tools-hub`.

### Environment Configuration

Central environment files provide dynamic origins, network hosts, and API base URLs:
- `client/src/environments/environment.ts` (Development)
- `client/src/environments/environment.prod.ts` (Production)

Each environment descriptor defines:
- `apiBaseUrl`: Root backend REST API endpoint (`http://localhost:8080/api/v1` or `https://api.acklet.com/api/v1`).
- `networkHost`: Hostname used for local LAN discovery and device pairing.
- `getOrigin()`: Safe origin resolver with window fallback for SSR/prerender compatibility.
- `getAirVaultUrl()`: Central helper resolving the AirVault route across domains.

## Running the Application Stack

```bash
docker compose up -d
```

## Verification Pipeline

For local automated verification (Levels A, B, and C), see [verification-guide.md](./verification-guide.md).

