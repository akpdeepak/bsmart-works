<!-- AUTO-EXTRACTED from 07-Tech-Stack-and-Architecture.docx on 2026-05-31. Source of truth = the .docx in the
     same folder. Regenerate with: python3 scripts/extract-specs.py -->

> **Provenance:** machine-extracted from `07-Tech-Stack-and-Architecture.docx` (Tech Stack & Architecture).
> This Markdown mirror exists so every AI tool and teammate can read/diff the spec in-repo.
> Where this spec and the **code** disagree, the code is canonical — see [`/CLAUDE.md`](../../CLAUDE.md) (⚠️ flags).

---

TECH STACK & ARCHITECTURE

bSmart Works

BCITS-Aligned Technology Stack & Architectural Attributes

Aligned with BCITS's existing Java / Spring / PostgreSQL / AWS engineering

Built for smooth UX, efficient operations, effective output

Prepared for: Deepak Pandey  ·  BCITS  ·  May 2026

## Part 0 — Why This Document Exists

The earlier Build Spec proposed a TypeScript / NestJS / Next.js stack. That choice optimized for a single-language, AI-assisted greenfield build. On reflection, and on the explicit instruction to align with BCITS, this document re-evaluates the stack against one overriding question:

> The overriding question
> Who will build and maintain bSmart Works? If the answer is 'BCITS engineers', the stack must match what BCITS engineers already know. A technically excellent tool that BCITS cannot maintain is worth less than a good tool BCITS can own forever.
>

### 0.1 What we verified about BCITS's technology

From BCITS's public materials and hiring signals (as of May 2026):

- BCITS hires Java full-stack developers — confirmed via their public hiring posts
- BCITS explicitly offers 'Enterprise PostgreSQL support' as a capability on their products page
- BCITS runs 'AMI Solutions on AWS Cloud' — AWS is their cloud platform
- BCITS describes its products as built on 'best open-source technologies', mobile-first, cloud-enabled, modular, scalable
- BCITS's product family (MDM, ORMS, UHES, GIS, CIS) is enterprise utility software — the typical Indian enterprise pattern is Java + Spring Boot backend with Angular or React frontend

> Honesty note on what we do and don't know
> Confirmed from public sources: Java backend, PostgreSQL, AWS.
> Inferred (high confidence): Spring Boot for the Java backend; Angular or React for frontend; microservices-leaning architecture.
> Not confirmed: exact frontend framework (Angular vs React), exact Java version, specific message broker, container orchestration choice.
> Action: confirm the items marked 'inferred' and 'not confirmed' with BCITS engineering leadership before finalizing. This document recommends the most-likely-aligned choices and flags each assumption.
>

## Part 1 — The Stack Decision

### 1.1 Two options, honestly compared

| Dimension | Option A — BCITS-aligned (RECOMMENDED) | Option B — TS greenfield (earlier spec) |
| --- | --- | --- |
| Backend language | Java 21 (LTS) | TypeScript (Node 20+) |
| Backend framework | Spring Boot 3.x | NestJS |
| Frontend | Angular 18+ (or React 18+) | Next.js 15 + React 19 |
| Database | PostgreSQL 16 | PostgreSQL 16 |
| ORM / persistence | Spring Data JPA + Hibernate; jOOQ for complex queries | Prisma |
| Cloud | AWS | AWS |
| BCITS talent match | Strong — existing Java engineers maintain it | Weak — needs TS hires or retraining |
| Maintainability at BCITS | High — fits existing team | Low — foreign to current team |
| AI-assisted build speed | Good — Spring is well-known to AI | Slightly faster (single language) |
| Reuse of BCITS infra | High — same PostgreSQL, AWS, CI/CD | Partial — new runtime to operate |
| Hiring pipeline | Existing — BCITS already hires Java devs | New — must hire TS/Node devs |

> Recommendation: Option A — BCITS-aligned Java / Spring Boot stack
> It aligns with BCITS's existing engineers, existing PostgreSQL and AWS infrastructure, and existing hiring pipeline.
> The marginal build-speed advantage of the TypeScript stack does not outweigh the long-term cost of a codebase BCITS cannot staff.
> PostgreSQL and AWS are retained from the earlier spec — they aligned already.
> All architectural commitments (event-sourcing, compliance-native, privacy-by-design) are stack-agnostic and carry over unchanged.
>

## Part 2 — The Recommended Stack in Detail

### 2.1 Backend

| Layer | Technology | Why |
| --- | --- | --- |
| Language | Java 21 (LTS) | BCITS's primary backend language. Virtual threads (Project Loom) handle high concurrency cleanly. |
| Framework | Spring Boot 3.2+ | Industry standard for Java enterprise. Mature, well-documented, AI models know it well. |
| Web layer | Spring MVC (REST) + Spring WebFlux where streaming needed | REST for CRUD; reactive only where high-throughput streaming demands it. |
| Security | Spring Security 6 + OAuth2 + SAML | Enterprise-grade auth; SSO-ready; aligns with utility-customer requirements. |
| Persistence | Spring Data JPA (Hibernate) + jOOQ | JPA for standard CRUD; jOOQ for complex reporting and BQL translation. |
| Validation | Jakarta Bean Validation | Declarative request validation. |
| Migrations | Flyway | Versioned, ordered DB migrations — one file per logical change. |
| Build | Gradle (Kotlin DSL) or Maven | Standard Java build. Gradle preferred for multi-module. |
| Testing | JUnit 5 + Testcontainers + Mockito | Real PostgreSQL in tests via Testcontainers — no mocking the DB. |

### 2.2 Frontend

Recommendation: confirm Angular vs React with BCITS. Default lean is Angular (more common in Spring-backed enterprise shops), but React is equally viable. The design system and tokens already produced work with either.

| Layer | Angular path (default) | React path (alternative) |
| --- | --- | --- |
| Framework | Angular 18+ (standalone components, signals) | React 18+ (with Vite) |
| Language | TypeScript | TypeScript |
| State | Angular signals + NgRx where needed | TanStack Query + Zustand |
| UI components | Angular Material + custom Works design system | shadcn/ui + custom Works design system |
| Styling | Tailwind CSS (tokens already produced) | Tailwind CSS (tokens already produced) |
| Forms | Angular reactive forms | React Hook Form |
| Realtime | RxJS + WebSocket/SSE | native WebSocket/SSE + TanStack Query |

### 2.3 Data & messaging

| Concern | Technology | Why |
| --- | --- | --- |
| Primary database | PostgreSQL 16 | BCITS standard. ACID, JSONB for custom fields, row-level security, mature. |
| Event store | PostgreSQL append-only events table | Avoids Kafka early. Event-sourcing foundation. Migrate to Kafka only at scale. |
| Search | PostgreSQL full-text early; OpenSearch at scale | Avoid search-infra cost until volume justifies it. |
| Cache | Redis (AWS ElastiCache) | Session cache, rate limiting, AI response caching, hot dashboards. |
| Message broker | RabbitMQ or AWS SQS early; Kafka at scale | Async automations, webhooks, AI jobs. Start simple. |
| Object storage | AWS S3 | Attachments, exports, backups. |
| AI integration | Anthropic Claude API via server-side service | Same AI Control Plane architecture; called from a Spring service, not the client. |

### 2.4 Infrastructure & operations (AWS)

| Concern | Technology |
| --- | --- |
| Compute | AWS ECS Fargate (containers) or EKS (Kubernetes) at scale |
| Database | AWS RDS for PostgreSQL (Multi-AZ for HA) |
| Cache | AWS ElastiCache (Redis) |
| Object storage | AWS S3 with lifecycle tiering |
| CDN | AWS CloudFront |
| Secrets | AWS Secrets Manager / Parameter Store |
| CI/CD | GitHub Actions or GitLab CI → build, test, containerize, deploy |
| IaC | Terraform (infrastructure as code) |
| Observability | OpenTelemetry → AWS CloudWatch / Grafana / Prometheus |
| Container registry | AWS ECR |

## Part 3 — Backend Module Structure (Spring Boot)

Every domain area (work-items, projects, workflows, compliance, SLA, etc.) is a Spring Boot module with a consistent package layout. This mirrors the canonical-vocabulary discipline from the Build Spec — the same WorkItem / Project / Workflow / ComplianceRule names, now in Java.

> com.bcits.works.<domain>/
> <Domain>Controller.java      // REST endpoints (@RestController)
> <Domain>Service.java         // Business logic (@Service)
> <Domain>Repository.java      // Spring Data JPA repository
> <Domain>Entity.java          // JPA entity (@Entity)
> <Domain>EventPublisher.java  // Emits domain events to event store
> dto/
> <Domain>Request.java       // Request DTO (validated)
> <Domain>Response.java      // Response DTO
> <Domain>Mapper.java          // Entity <-> DTO (MapStruct)
> <Domain>Test.java            // JUnit 5 + Testcontainers
>

### 3.1 Canonical vocabulary in Java

The locked domain vocabulary carries over exactly. Examples in Java casing:

| Concept | Java class | DB table | REST path |
| --- | --- | --- | --- |
| Work item | WorkItem | work_item | /api/work-items |
| Project | Project | project | /api/projects |
| Workflow | Workflow | workflow | /api/workflows |
| Field definition | FieldDef | field_def | /api/field-defs |
| Compliance rule | ComplianceRule | compliance_rule | /api/compliance-rules |
| Compliance violation | ComplianceViolation | compliance_violation | /api/compliance-violations |
| SLA policy | SlaPolicy | sla_policy | /api/sla-policies |
| KPI metric | KpiMetric | kpi_metric | /api/kpi-metrics |
| Status duration | StatusDuration | status_duration | /api/status-durations |

### 3.2 Event-sourcing in PostgreSQL

The event store is an append-only table. Every state change is an immutable event. Projections (read models) are built from events. This is unchanged from the earlier spec — only the language changes.

> -- events table (append-only, never UPDATE or DELETE)
> CREATE TABLE event_log (
> id            BIGSERIAL PRIMARY KEY,
> aggregate_id  UUID NOT NULL,        -- e.g. the work_item id
> aggregate_type VARCHAR(64) NOT NULL,-- 'WorkItem', 'Project'...
> event_type    VARCHAR(96) NOT NULL, -- 'WorkItemCreated'...
> payload       JSONB NOT NULL,       -- the event data
> actor_id      UUID NOT NULL,        -- who did it
> workspace_id  UUID NOT NULL,        -- tenant isolation
> occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
> );
> CREATE INDEX idx_event_aggregate ON event_log(aggregate_id, id);
> CREATE INDEX idx_event_workspace ON event_log(workspace_id, occurred_at);
>

## Part 4 — Architectural Attributes for Smooth UX & Efficient Output

The user's explicit goal: best and smooth user experience, efficient and effective work and output. These attributes are how the architecture delivers that — each tied to a concrete technical decision in the BCITS-aligned stack.

### 4.1 Smooth user experience

| Attribute | How the stack delivers it |
| --- | --- |
| Fast page loads | Server-side rendering (Angular Universal / Next.js); CloudFront CDN; HTTP/2; lazy-loaded modules. P95 page load < 800ms target. |
| Instant interactions | Optimistic UI updates; Redis-cached hot data; WebSocket/SSE for realtime so the screen never feels stale. |
| No spinners | Skeleton loading from cached layout; progressive data hydration. |
| Responsive everywhere | Single responsive codebase; PWA for mobile-without-install; native apps for field engineers. |
| Never lose work | Auto-save drafts to local storage + server every few seconds; optimistic concurrency prevents silent overwrites. |
| Smooth search | PostgreSQL full-text with trigram indexes for type-ahead; debounced queries; Redis result cache. |

### 4.2 Efficient operation (for the user and the system)

| Attribute | How the stack delivers it |
| --- | --- |
| Low latency under load | Java 21 virtual threads handle thousands of concurrent requests cheaply; connection pooling (HikariCP). |
| Horizontal scale | Stateless Spring services behind a load balancer; scale by adding ECS/EKS tasks. |
| Efficient queries | jOOQ for hand-tuned reporting queries; JPA for simple CRUD; read replicas for dashboards. |
| Async heavy work | AI calls, bulk ops, scheduled reports run async via message broker — UI never blocks. |
| Cost-efficient AI | Server-side AI service caches responses in Redis; model tiering (Haiku/Sonnet); per-workspace budget caps. |
| Efficient storage | S3 lifecycle tiering (hot to cold); PostgreSQL partitioning for the event log at scale. |

### 4.3 Effective output (correctness & trust)

| Attribute | How the stack delivers it |
| --- | --- |
| Correctness | Strong typing (Java); Bean Validation on every request; Testcontainers tests against real PostgreSQL. |
| Auditability | Event-sourced — every change is an immutable event; full reconstruction possible for any audit. |
| Data integrity | PostgreSQL ACID transactions; foreign keys; optimistic concurrency; idempotent operations. |
| Trustworthy AI | AI proposes, system validates deterministically, user confirms, system executes — AI never silently mutates. |
| Compliance evidence | Compliance engine reads from the same event store; violations and resolutions are themselves events. |
| Privacy guarantees | Field-level security enforced in Spring Security; KPI privacy enforced at the service layer, not just UI. |

### 4.4 Reliability attributes

- Multi-AZ RDS PostgreSQL — database survives an availability-zone failure
- Stateless services — any instance can handle any request; failed instances replaced automatically
- Idempotent APIs — safe to retry; no double-effects on network retries
- Graceful degradation — AI off, search down, broker delayed: core CRUD still works
- Append-only audit log with integrity chain — tamper-evident
- Automated backups — RDS automated snapshots + point-in-time recovery

### 4.5 Scalability attributes

- Start simple (single PostgreSQL, ECS Fargate); scale components independently as load grows
- Read replicas added when dashboards/reports strain the primary
- Event log partitioned by time when it grows large
- Search migrates PostgreSQL FTS → OpenSearch only when volume justifies it
- Message broker migrates RabbitMQ/SQS → Kafka only at high event throughput
- Multi-tenant with hard workspace isolation — one install serves many customers

### 4.6 Security attributes

- Spring Security 6 with OAuth2 + SAML for enterprise SSO
- Encryption at rest (RDS + S3 with KMS); TLS 1.3 in transit
- Customer-managed keys (BYOK) via AWS KMS for enterprise customers
- Secrets in AWS Secrets Manager — never in code or config files
- Row-level + field-level security enforced server-side
- Penetration testing + dependency scanning (OWASP, Snyk) in CI

### 4.7 Observability attributes

- OpenTelemetry tracing across all Spring services
- Structured JSON logging with correlation IDs (one trace across services)
- Metrics via Micrometer → Prometheus → Grafana dashboards
- AWS CloudWatch alarms on latency, error rate, AI cost thresholds
- In-product status page for customer-facing transparency

## Part 5 — What Changes, What Stays

### 5.1 What stays unchanged from prior specs

- All 26 capabilities and 346+ sub-features — unchanged
- All 20 iterations and their sequencing — unchanged
- All 5 architectural commitments — unchanged (stack-agnostic)
- The 7 unification layers — unchanged (architectural, not language-specific)
- Event-sourcing model — unchanged, now in PostgreSQL + Java
- AI Control Plane and all AI features — unchanged (Claude API called server-side)
- BCITS brand, colors, logo, UI/UX principles — unchanged
- Design tokens and Tailwind config — work with Angular or React
- PostgreSQL and AWS — were already aligned, retained

### 5.2 What changes

| Was (earlier spec) | Now (BCITS-aligned) |
| --- | --- |
| TypeScript / Node backend | Java 21 backend |
| NestJS framework | Spring Boot 3.x |
| Next.js frontend | Angular 18+ (or React 18+) — confirm with BCITS |
| Prisma ORM | Spring Data JPA + Hibernate + jOOQ |
| Auth.js | Spring Security 6 + OAuth2 / SAML |
| Zod DTO validation | Jakarta Bean Validation |
| Prisma migrations | Flyway migrations |
| Node test runner | JUnit 5 + Testcontainers + Mockito |

### 5.3 Honest risk notes

> Risks to manage
> Confirm Angular vs React with BCITS before frontend work begins — this is the one unconfirmed major choice.
> If BCITS engineers are not current on Java 21 / Spring Boot 3, budget for a short ramp — these are recent versions.
> The earlier brand bundle's React component samples (Button, StatusBadge) will need Angular equivalents if Angular is chosen. The design tokens (colors, spacing, typography) carry over unchanged either way.
> AI-assisted build with Claude works well for Spring Boot — Claude knows Spring idioms thoroughly — so the build-speed cost vs the TypeScript stack is small.
>

### 5.4 Recommended immediate actions

- Confirm with BCITS engineering: Java version in use, Spring Boot adoption, frontend framework (Angular vs React), message broker preference, container platform (ECS vs EKS)
- Set up the iteration-1 skeleton in the confirmed stack: Spring Boot project, PostgreSQL via RDS, one module (auth) end-to-end
- Port the design tokens into the chosen frontend framework
- Establish CI/CD pipeline (GitHub Actions / GitLab CI) with Testcontainers integration tests

## Closing

bSmart Works should be built on Java 21 + Spring Boot 3 + PostgreSQL 16 + Angular (or React) + AWS — the stack BCITS already knows, already staffs, and already operates.

This choice trades a small amount of greenfield build speed for a large amount of long-term maintainability and organizational fit. For a product BCITS intends to own and evolve for years, that is the correct trade.

Every architectural commitment, every capability, every iteration, and the entire UI/UX and brand system carry over unchanged. Only the implementation language and frameworks align to BCITS — and PostgreSQL and AWS were aligned already.

Confirm the open questions (frontend framework, Java version, infra choices) with BCITS engineering leadership, then build iteration 1 on the confirmed foundation.

Where work gets done.

End of document.