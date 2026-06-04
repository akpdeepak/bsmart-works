# ADR-0001 — Service & API Decomposition

- **Status:** Proposed (awaiting acceptance by Deepak Pandey)
- **Date:** 2026-06-04
- **Owner:** Deepak Pandey (Associate CTO, BCITS)
- **Relates to:** [`ai-rules/rulebooks/10-ENGINEERING.md`](../../ai-rules/rulebooks/10-ENGINEERING.md) §2 · [`ai-rules/00-ORCHESTRATOR.md`](../../ai-rules/00-ORCHESTRATOR.md) · [`docs/specifications/05-capability-map-v3.5.md`](../specifications/05-capability-map-v3.5.md) (26 capabilities, 7 unification layers, 20 iterations)

---

## 1. Context

bSmart Works ships today as a single Spring Boot deployable. Despite the "modular monolith" label,
the backend is effectively a **flat monolith**: 159 of 164 Java files live in one `com.example.demo`
package with no enforced domain boundaries (only a `dto` sub-package). So "microservice-ready" is, as
of iteration 6, an aspiration the code does not back.

The product owner wants individual capabilities (e.g. Identity, Knowledge, AI orchestration) to be
**reusable as standalone services in other applications**, and wants the system to be **API- and
microservice-based**.

Two facts shape this decision:

1. **Reusability is a bounded-context + owned-data + versioned-API property — not a deployment-topology
   property.** A module with a clean owned schema and a versioned public API is reusable whether it
   runs in-process or as its own deployable. The decomposition work is identical either way; *when* to
   physically split is a separate lever.
2. The product is built on **7 unification layers** (one event store, one identity, one query language
   (BQL), one AI orchestration plane, one customization framework, one knowledge repo, one design
   system) — deliberately cross-cutting. Splitting services *across* a unification layer fragments it
   and recreates the "Frankenstein" the capability map explicitly warns against (Part 3.4). The
   layers must therefore become **shared platform services**, not be duplicated per domain.

## 2. Decision

Adopt a **bounded-context service decomposition** mapping the 26 capabilities onto a small set of
services, where:

1. **The 7 unification layers each become one shared platform service** — used by everything. These
   are also the highest cross-app reuse candidates.
2. **Capability clusters become domain services** (bSmart-specific).
3. **Role surfaces (U–Y) and the command bar (P) become BFFs** — composition layers that own no core
   data.
4. **Cross-domain reads (BQL, dashboards, KPIs, compliance) are served by CQRS read-models fed by the
   event backbone** — never by cross-service joins.

Deployment follows **"modulith now → extract on demand"** (§7): enforce these boundaries as modules in
the current deployable immediately; physically extract a module into its own service only when
reuse-in-another-app or scale triggers it — **platform/unification services first**.

## 3. Service catalog

### Tier 1 — Platform services (the 7 unification layers; reuse ★★★ = pull into other apps)

| Service | Unification layer | Capabilities | Owns (data) | Key APIs | Reuse | Status |
|---|---|---|---|---|---|---|
| **Identity & Access** | L2 Identity | A, T(authn), Z(enforcement) | users, **workspaces = tenants**, teams, memberships, roles, permissions, schemes, field-level security, MFA, SSO, JWT issuance | `/auth` `/users` `/workspaces` `/teams` `/roles` `/permissions` | ★★★ | Built (partial) |
| **AI Control Plane** | L4 AI | O, Z, P(parse) | LLM gateway, 4-level scope policy, budget caps, model tiering, response cache, AI audit log, provider/data-boundary config, fallback registry | `/ai/invoke` `/ai/policy` `/ai/usage` `/ai/budget` | ★★★ | Not built (iter 10) |
| **Knowledge** | L6 Knowledge | I | spaces, articles, versions, comments, publish workflow, analytics, RAG index | `/knowledge-spaces` `/articles` | ★★★ | Built |
| **Collaboration** | (generic primitives) | G, S(realtime) | comments, attachments (+virus scan), notifications + prefs + digests, activity feed, @mentions, presence | `/comments` `/attachments` `/notifications` `/activity` | ★★★ | Built (partial) |
| **Customization / Config** | L5 Customization | D, C(defs), R | field defs, layouts, field visibility, workflow defs/transitions, type configs, versioning/sandbox/rollback, import/export | `/field-defs` `/layouts` `/workflows` `/work-item-types` | ★★ | Built (partial) |
| **Query / BQL** | L3 Query | E | BQL grammar/compiler, NL→BQL (calls AI), saved filters, federated execution over read-models | `/bql/compile` `/bql/execute` `/saved-filters` | ★ | Built (partial) |
| **Event & Audit backbone** | L1 Data | T(audit) | append-only `events`, transactional outbox, projection feeds, audit explorer | internal bus + `/audit` | ★★ | Built (events) |

### Tier 2 — Domain services (bSmart-specific; reuse ★–★★)

| Service | Capabilities | Owns | Key APIs | Status |
|---|---|---|---|---|
| **Work Management** (core) | B, F | projects, work items, field values, links, sprints, boards, backlog, worklogs, releases | `/projects` `/work-items` `/work-item-links` `/sprints` `/work-logs` `/releases` | Built |
| **PM Artifacts / Delivery** | H | RAID (risks, assumptions, issues, dependencies), decisions, action items, lessons learned, cross-project deps, meetings + notes, stakeholders | `/risks` `/assumptions` `/issues` `/dependencies` `/decisions` `/action-items` `/lessons-learned` `/meetings` `/stakeholders` | Built |
| **Analytics & Insights** | J, L | dashboards, widgets, public/embedded dashboards, reports, schedules + delivery, aggregation, KPI defs/snapshots, anomaly detection, metric privacy guardrails | `/dashboards` `/reports` `/report-schedules` `/aggregations` `/kpis` | Built (partial) |
| **Governance: Compliance & SLA** | K, M | compliance rule engine, rule eval, violations, posture; SLA policies, eval, escalation, breach prediction ("one SLA engine, two contexts") | `/compliance-rules` `/violations` `/sla-policies` `/sla-evaluations` | Not built (iter 8 / 9.5) |
| **Service Management / Portal** | N | customer portal, request queues, customer SLAs, intake, routing, customer KB surface | `/service-requests` `/customer-portal/*` | Not built (iter 11) |
| **Integration Hub** | Q | webhooks, OAuth connections, native connectors (GitHub/GitLab/Slack), integration health, public API keys, event replay | `/webhooks` `/integrations` `/oauth` | Not built (iter 9) |

### Tier 3 — Edge / experience (no core data)

- **API Gateway** — single entry: authn, routing, rate-limit, **tenant-context propagation**.
- **Role BFFs** — U (Developer), V (Scrum Master), W (Product Owner), X (Leadership), Y (Admin),
  plus P (command bar). Each composes Tier-1/2 services for its role's UX. **No new data models** —
  the capability map (Part 5.2) confirms role surfaces add UI, not backend.
- **Clients** — Web SPA, Mobile (S), IDE extension (U), `works` CLI. Layer 7 (design system) = a
  shared frontend component library, not a service.

## 4. Capability → service map (all 26)

| Cap | Name | Service |
|---|---|---|
| A | Identity & Workspace | Identity & Access |
| B | Work Management Core | Work Management |
| C | Workflow & Automation | Customization (defs) + Work Management (exec) + Integration Hub (actions) |
| D | Custom Fields & Schema | Customization |
| E | Search & Query | Query / BQL |
| F | Agile Execution | Work Management |
| G | Collaboration | Collaboration |
| H | PM Artifacts (RAID) | PM Artifacts / Delivery |
| I | Knowledge Repository | Knowledge |
| J | Reports & Dashboards | Analytics & Insights |
| K | Compliance Engine | Governance |
| L | KPI Framework | Analytics & Insights |
| M | SLA Engine | Governance |
| N | Service Management & Portal | Service Management / Portal |
| O | AI Orchestration | AI Control Plane |
| P | Conversational Command | BFF (→ AI Control Plane + Query) |
| Q | Integration & API | Integration Hub |
| R | Universal Customization | Customization |
| S | Mobile, Real-time | Collaboration (realtime) + Mobile client |
| T | Security, Audit, Governance | cross-cutting: Identity (access) · Event & Audit (audit) · AI (anomaly) · Governance (posture/certs) · Admin BFF |
| Z | AI Control Plane | AI Control Plane |
| U | Developer Workspace | Developer BFF |
| V | Scrum Master Cockpit | Scrum Master BFF |
| W | Product Owner Workspace | Product Owner BFF |
| X | Leadership Console | Leadership BFF |
| Y | Admin Operations Center | Admin BFF |

## 5. Iteration 1–20 → service map

| Iter | Theme | Primary service(s) |
|---|---|---|
| 1–2 | Auth, workspaces, work items | Identity & Access · Work Management |
| 3–4 | Workflows, permissions, custom fields | Customization · Identity |
| 5 | Search & BQL | Query / BQL |
| 6 | Boards, sprints, links | Work Management |
| 7 | Collaboration | Collaboration |
| 8 | Reports + SLA | Analytics · Governance |
| 9 / 9.5 | Automation, integration, SSO, compliance | Integration Hub · Customization · Identity · Governance |
| 10 / 10.5 | **AI orchestration + Control Plane**, KPIs | **AI Control Plane** · Analytics |
| 11 | Customer portal | Service Management |
| 12 | Mobile, real-time, security | Collaboration(realtime) · Mobile client · (security ⇒ Identity/Event/AI) |
| 13–14 | PM artifacts, knowledge | PM Artifacts · Knowledge |
| 15–16 | Command bar, AI expansion | BFFs(P) · AI Control Plane |
| 17 | Universal customization engine | Customization |
| 18 | Enterprise hardening + certs | Governance · Identity · Event & Audit |
| 19–20 | Role surfaces U–Y + IDE | Role BFFs (no new services) |

> Note: actual build order has diverged from the capability map's planned roadmap — the code already
> spans much of A–J plus H and I. The decomposition is keyed to **capabilities**, which are stable, so
> this divergence does not change the service boundaries.

## 6. Cross-cutting architecture

### 6.1 CQRS + event backbone (the linchpin)
BQL, dashboards, KPIs, and the compliance engine all query **across** domains — impossible with
DB-per-service joins. Every domain service emits domain events to the Event backbone (via a
**transactional outbox** off the existing append-only `events` table); a projection/read-model store
consumes them; Query, Analytics, and Governance read the **read-models**, never the source services.
The product already event-sources, so this is a natural extension rather than a new paradigm.

### 6.2 Data ownership
Each service owns its schema. Start **schema-per-service in one Postgres**; move to DB-per-service when
a service is physically extracted. **No service reads another's tables** — only its APIs or its events.

### 6.3 Multi-tenancy propagation
`workspace_id` is carried in the auth token/context to every service; each service enforces tenant
scoping (shared tenancy library + Postgres Row-Level Security). Cross-tenant leakage — the single
catastrophic risk — now has N enforcement surfaces, so enforcement must be **structural, not by code
review**.

### 6.4 Sync vs async (and AI)
- **Sync (REST/gRPC):** read-now paths (a BFF fetching a work item).
- **Async (events):** state propagation, projections, notifications, compliance evaluation.
- **AI on an async job queue:** LLM calls are slow, bursty, and costly — the one workload that should
  be async early, so a slow/failing provider never ties up request threads.

### 6.5 The 7 unification layers → platform services
| Unification layer | Becomes |
|---|---|
| L1 Data (event store) | Event & Audit backbone |
| L2 Identity | Identity & Access |
| L3 Query (BQL) | Query / BQL |
| L4 AI orchestration | AI Control Plane |
| L5 Customization | Customization / Config |
| L6 Knowledge | Knowledge |
| L7 UI design system | Shared frontend library (not a backend service) |

**Rule:** never fragment a unification layer across services. One identity, one event store, one AI
plane, one query language — shared, not duplicated.

## 7. Rollout strategy — modulith now, extract on demand

The catalog above is the target *boundaries*. Given the team size (capability map Part 4: a small team
has ~50% odds of reaching iteration 12), deploying 13 services on day one would sink the project in
operational cost. Therefore:

- **Phase 0 — now (iter 6):** carve the flat monolith into **enforced modules** along these
  boundaries: Spring Modulith (or package-by-feature) + an ArchUnit test that **fails CI on
  cross-module access** + schema-per-module + a transactional outbox + versioned public APIs +
  contract tests. Every module becomes a *service-in-waiting*. This is the work that makes
  "reusable" real, and it is cheap at 164 files.
- **Phase 1 — extract platform services first, when reuse calls:** Identity & Access → Knowledge →
  AI Control Plane (when built) → Collaboration (Notifications/Files). These are the
  highest-reuse, lowest-coupling services — the ones to drop into other apps. Each extraction is a
  **lift-out, not a rewrite**, because the boundary/API/events were designed up front.
- **Phase 2 — extract domain services as they mature** (Analytics, Governance, Integration, Service
  Management) when scale or team boundaries justify it.
- **Keep Work Management + PM Artifacts together longest** — most transactional coupling, least
  cross-app reuse value.

**Extraction triggers (any one):** (a) a second app needs the service; (b) the module's scale/latency
profile diverges from the rest; (c) a separate team takes ownership; (d) independent deploy cadence is
required.

## 8. Consequences

**Positive**
- Capabilities become independently **reusable** (the core goal) and API-first.
- Module boundaries make the codebase navigable and make "microservice-ready" true, not a slogan.
- Event-driven read-models make BQL/dashboards/KPIs/compliance scale and stay consistent.
- Extraction is incremental and low-risk — no big-bang rewrite.

**Negative / costs**
- More discipline up front (boundary enforcement, contract tests, outbox).
- CQRS adds eventual consistency for cross-domain reads (acceptable for analytics/compliance).
- Each extracted service multiplies ops surface (pipeline, observability, tenancy enforcement).

**Risks & mitigations**
- *Over-decomposition* (the classic killer for small teams) → start coarse; extract on demand only.
- *Unification-layer fragmentation* → the "never fragment a layer" rule + platform-services-first.
- *Cross-tenant leakage across N services* → structural enforcement (RLS + shared tenancy lib).
- *Distributed transactions* → outbox + sagas; keep tightly-coupled domains co-located.

## 9. Enforcement (how this stays true)
- **Spring Modulith / ArchUnit** boundary test in CI — no cross-module access.
- **Schema-per-module**; a guardrail check that no module touches another's tables.
- **Transactional outbox** off `events`; projections own the read-models.
- **Contract tests** on every public API; consumer-driven where a BFF/service depends on another.
- These extend the existing CI gates (`guardrails.sh`, `generate-ai-rules.mjs --check`).

## 10. Open decisions for the owner
1. **Rollout aggressiveness:** stay modulith long-term (extract only the few reusable platform
   services), or commit to full distribution over time?
2. **Collaboration granularity:** one service now, or split Notifications/Files out first (highest
   reuse)?
3. **First extraction target:** Identity & Access is the natural first (most reused, anchors tenancy).
   Confirm.
4. **DB strategy:** schema-per-service now, DB-per-service at extraction — confirm acceptable.
