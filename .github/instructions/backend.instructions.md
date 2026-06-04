---
applyTo: "works-backend/**/*.java, works-backend/pom.xml, works-backend/src/main/resources/db/migration/**"
---

<!-- GENERATED FROM ai-rules/ — do not edit by hand.
     Edit the source in ai-rules/ and run: node scripts/generate-ai-rules.mjs
     This file is the GitHub Copilot (backend) view of the same rules. -->

# Rule Book 10 — Engineering & Architecture

> Owns *how the system is built*. Read after the [Orchestrator](../00-ORCHESTRATOR.md).
> Stack facts here are **code-canonical** (see the reconciliation ledger in
> [`SOURCE-OF-TRUTH.md`](../SOURCE-OF-TRUTH.md) §4). Volatile facts (migration number, iteration)
> live in Orchestrator §6 — never duplicated here.
> **Enforced by:** `guardrails.sh`, Checkstyle, JUnit/JaCoCo, Vitest, ESLint, CI gate.

---

## 1. Tech stack (verified against the repo)

| | Choice | Note |
|---|--------|------|
| Backend | **Java 21 · Spring Boot 4.0.x · Maven** (`mvnw`) | not Gradle; not Spring Boot 3 |
| Persistence | Spring Data JPA + Hibernate · PostgreSQL · Flyway | no jOOQ |
| Auth | Spring Security + **JWT (stateless)** · MFA TOTP | OAuth2/SAML are spec targets, not built |
| Frontend | **React 19.2 · Vite 8 · JavaScript/JSX · Tailwind 4** | not Angular; not TypeScript |
| Data fetching | TanStack Query via a single `apiClient` | no inline `fetch`/`axios` |
| Package | `com.example.demo` (flat) | spec target `com.bcits.works.*`; rename is its own PR |

**Do not "fix" the stack to match the spec inside a feature PR.** Closing a spec-vs-code gap
(package rename, TS migration) is a planned migration with its own issue and PR (§3.7 of
ENGINEERING-PRINCIPLES). Build to the code that exists.

---

## 2. Architecture rules

**Modular monolith today, evolving to extractable services.** One deployable now, but every domain is
a **service-in-waiting**: an enforced module with its own schema, a versioned public API, and events on
the shared backbone — so it can be lifted out without a rewrite. The target service map, capability and
iteration mapping, and cross-service patterns (CQRS read-models, transactional outbox, tenant-context
propagation) live in [ADR-0001](../../docs/architecture/ADR-0001-service-decomposition.md). **Extract on
demand, never preemptively** — split a module into its own deployable only when reuse in another app or
scale calls for it, **platform / unification-layer services first** (Identity, AI Control Plane,
Knowledge, Collaboration). Do not add Kafka, a search cluster, or a new language until that trigger
fires. **Never fragment a unification layer** (one identity, one event store, one AI plane, one query
language) across services.

**One job per layer:**

| Layer | Does | Never does |
|-------|------|------------|
| Controller | Parse HTTP, call service, return response | Business logic, RBAC, DB access |
| Service | Business logic **+ authorization (`RbacService`) + tenant scoping** | HTTP concerns |
| Repository | Data access (Spring Data JPA) | Business decisions |

- **RBAC in the service layer, never the controller or UI** (`RbacService`). If the only thing
  stopping access is a hidden button, it isn't stopped.
- **Every query is workspace-scoped** — no repository method returns rows across tenants. See
  RB-40 §1; this is being added to `guardrails.sh`.
- **Stateless:** JWT carries its own state; no server-side sessions; services hold no request
  state between calls. This is what lets the app scale by adding instances.
- **Validate at the boundary:** every incoming DTO is `@Valid`; the service assumes clean input.

---

## 3. Data & persistence

- **Flyway only.** Never touch the schema by hand. Next migration number: **Orchestrator §6**.
  Migrations are **forward-only** — to undo, write a new forward migration; never edit a shipped one.
- **Plural, snake_case tables** (`work_items`, `projects`). One concept, one name across all layers
  (§5).
- **Event-sourced from day one.** Every state change emits to the **append-only `events`** table
  (mapped by `AppEvent`, written by `EventService`). Events are never updated or deleted. The dead
  `event_log` was dropped in V20. *(PII never lives in events — it is tokenized into a PII vault and
  crypto-shredded on erasure, so the log stays immutable; see RB-40 §3.)*
- **N+1 prevention:** fetch joins / entity graphs for known traversals; never lazy-load in a loop.
- **Indexing:** index every foreign key and every column used in a `WHERE`/`ORDER BY` on a hot path;
  add the index in the same migration as the query.
- **Connection pool:** HikariCP; size deliberately, don't default blindly under load.
- **Zero-downtime schema changes:** use expand-contract (add nullable → backfill → enforce → drop)
  because deploys go straight from `main`.

---

## 4. API contract

- **Versioned, plural, kebab-case:** `/api/v1/work-items`. New endpoints are versioned from birth.
- **One error shape** everywhere: `{ code, message, field? }` via a single `@ControllerAdvice`.
- **Pagination:** offset-based, consistent params (`page`, `size`, `sort`); always paginate list
  endpoints — never return unbounded collections.
- **Filtering:** documented, allow-listed fields only; never interpolate client input into queries.
- **OpenAPI/Swagger** kept current; **deprecation** is announced via the documented process before
  removal.

---

## 5. Canonical vocabulary

One concept, one name, across Java / DB / REST — a rename ripples through all three or none:

`WorkItem` ↔ `work_items` ↔ `/api/v1/work-items`

---

## 6. BQL — the one query language *(added; spec `06 §3 Layer 3`)*

BQL (bSmart Query Language) is the **single** query language across the product — filters,
saved views, automation conditions, compliance rules, KPI definitions, and dashboard widgets all
compile to BQL. It is one of the seven unification layers (RB-40 / ENGINEERING-PRINCIPLES §3.1):
**no capability invents its own query syntax.**

- Server-side parse → validated AST → parameterized SQL. **Never** string-concatenate BQL into SQL.
- Every BQL query is **workspace-scoped at compilation** (RB-40 §1) — a query cannot escape its
  tenant regardless of what the user types.
- AI "natural language → filter" features compile to BQL and **fall back to a manual BQL/visual
  builder** when AI is off or over budget (RB-40 §2).
- Field access inside BQL respects field-level security (RB-40 §1).

---

## 7. Testing

- **Pyramid:** many unit, fewer integration, fewest E2E.
- **Backend:** JUnit 5 + **Testcontainers** (real Postgres, not mocks, for anything touching the
  DB). JaCoCo coverage gate in CI.
- **Frontend:** Vitest + React Testing Library; test behavior, not implementation.
- **E2E:** Playwright (scaffold present, not yet active).
- **Done means demonstrated:** a change isn't done until a test proves its behavior, or it's been
  run in the app. Every feature includes an **unauthorized** and a **cross-tenant** test (RB-40).

---

## 8. Security hardening (engineering surface)

HTTP security headers · strict CORS allow-list · XSS prevention (escape on render, never
`dangerouslySetInnerHTML` with unsanitized input) · rate limiting on auth and write endpoints ·
OWASP Top-10 self-check on security-flagged PRs. *Encryption, BYOK, WebAuthn, conditional access
and the cert roadmap live in RB-40 §4.*

---

## 9. Operations

- **Branching:** GitHub Flow. `main` is the **single, always-shippable trunk** — the only
  long-lived branch (no `develop`, no `master`/release branch). Work on short-lived
  `type/scope-short-desc` branches off `main` → PR → CI green → **squash-merge** → delete the
  branch. "Shippable" is marked by a **release tag**, never a second long-lived branch (a branch
  keeps moving; a tag is frozen and is what you roll back to).
- **PRs:** small and single-purpose; draft early; self-review checklist before opening; the PR
  template **is** the Definition of Done (Orchestrator §4).
- **Dependencies:** new deps go through the approval checklist; Dependabot for updates; security
  scanning; lockfiles committed.
- **Releases & promotion (trunk-based — this is what protects the shippable state from disruption):**
  - **A release is an annotated SemVer tag `vX.Y.Z` + a GitHub Release**, cut from `main` when an
    iteration is verified complete (one release per completed iteration; PATCH for hotfixes). The
    tag is the immutable, known-good snapshot — later `main` commits cannot disturb it.
  - **Promote to production by deploying that tagged commit** (`deploy.yml`), gated by a GitHub
    **`production` Environment** with a required-approval rule. "What's in production" is the
    deployed Release, tracked there — not a branch.
  - **Hotfix:** branch off `main` → fix + test → PR → squash-merge → tag `vX.Y.(Z+1)` → deploy.
    No cross-branch back-merging.
  - **Tagging, releasing, and deploying are irreversible/remote → explicit human go-ahead**
    (Orchestrator §5, RB-05 Stage 7). Tags are immutable: never force-move or delete a published one.
- **CD:** deploy a release tag (above) via `deploy.yml`; deployment decision checklist; standard
  health-check endpoint. *(Target infra — AWS/ECS, RDS, ElastiCache, Terraform, OTel — is RB-40 §5.)*
- **Observability:** environment-appropriate log levels; structured logging; no secrets or PII in
  logs.
- **Technical debt:** recorded in `TECH-DEBT.md` with rationale and payoff trigger; paid down
  deliberately, not via drive-by refactors inside feature PRs.

---

### What's enforced here
Tokens/no-hex, no-inline-fetch, RBAC-in-service, Flyway-only, package layout, a11y →
`guardrails.sh` + ESLint. Java style → Checkstyle. Behavior + coverage → JUnit/JaCoCo + Vitest.
**Gap being closed:** workspace-scope check (RB-40 §1).
