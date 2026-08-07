# PRODUCT.md - Acklet Product Specification

## Purpose
Acklet is an AI-powered **Repository Intelligence & Live Preview Platform**. It transforms untrusted software repositories into structured knowledge graphs, automated AI documentation, metadata indices, and live runnable sandbox previews.

## Target Users
1. **Software Engineers & Team Leads**: For rapid codebase comprehension, dependency discovery, and structural understanding.
2. **Open Source Maintainers**: To showcase interactive live demos of tools/libraries without manual preview setup.
3. **DevOps & Platform Engineers**: To evaluate repository health, frameworks, and deployment requirements.

## Current Product Scope (Phase 3 Beta)
- GitHub OAuth integration & account management.
- RabbitMQ async repository import pipeline.
- Automatic multi-language framework detection (`Next.js`, `React`, `Vue`, `Angular`, `Spring Boot`, `Python`, `Rust`, `Go`).
- Process-based build runner with environment variable injection.
- Live deployment log viewer (stdout/stderr streaming).
- Tool settings, subdomain configuration, and hard deletion.

## Planned Features & Vision
- Support for GitLab & Bitbucket OAuth integrations.
- Rootless Docker sandbox containers for isolated untrusted builds.
- Interactive Knowledge Graph visualization canvas.
- Multi-tenant team RBAC workspaces.
