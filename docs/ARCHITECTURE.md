# ARCHITECTURE.md - System Architecture & Component Specification

## Overall System Architecture
Acklet utilizes an event-driven, decoupled micro-architecture combining an Angular 22 single-page frontend, a Spring Boot 3.4 REST & Messaging backend, a PostgreSQL 16 relational data store, Redis caching, and RabbitMQ async queues.

```
                                  ┌────────────────────────┐
                                  │   Angular 22 Client    │
                                  └───────────┬────────────┘
                                              │ REST API / JWT
                                              ▼
                                  ┌────────────────────────┐
                                  │   Spring Boot 3.4      │
                                  └─────┬────────────┬─────┘
                                        │            │
                      RabbitMQ Events   │            │ JPA / Hibernate
                                        ▼            ▼
                             ┌──────────────┐    ┌──────────────┐
                             │ Import Queue │    │ PostgreSQL 16│
                             └──────┬───────┘    └──────────────┘
                                    │
                                    ▼
                             ┌──────────────┐
                             │ Worker Engine│ ──► ProcessBuilder Build Runner
                             └──────────────┘
```

## Component Boundaries & Tech Stack
- **Frontend Layer**: Angular 22, RxJS, Lucide Icons, Vanilla CSS design tokens (`var(--vercel-card-bg)`).
- **Backend Layer**: Java 21, Spring Boot 3.4.1, Spring Security (JWT), Spring Data JPA.
- **Messaging & Event Queue**: RabbitMQ (`acklet.import.exchange` with `IMPORT_METADATA_QUEUE`, `IMPORT_TREE_QUEUE`).
- **Database**: PostgreSQL 16 managed via Flyway migrations (`db/migration/V*.sql`).
- **Caching**: Redis Cache Manager for categories, tool details, and tree structures.
- **AI Stack**: LangChain4j 0.36.2 (`langchain4j-open-ai`).
