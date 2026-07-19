<!-- GENERATED FROM ai-rules/ — do not edit by hand.
     Run: node scripts/generate-ai-rules.mjs
     Provider projection: Codex backend scope. -->

# Backend rules

Canonical detail: `ai-rules/rulebooks/10-ENGINEERING.md`. These rules apply only when this domain is in scope.

---

# Rule Book 10 — Engineering & Architecture

> Owns *how the system is built*. Read after the [Orchestrator](../00-ORCHESTRATOR.md).
> Executable manifests and source layout are canonical. Their generated summary is
> `../current-state.generated.json`; volatile facts are never copied here.
> **Enforced by:** `guardrails.sh`, Checkstyle, JUnit/JaCoCo, Vitest, ESLint, CI gate.

---

## 1. Tech stack (verified against the repo)

| | Choice | Note |
|---|--------|------|
| Backend | **Java 21 · Spring Boot 4.1.0 · Maven** (`mvnw`) | derived from `pom.xml` |
| Persistence | Spring Data JPA + Hibernate · PostgreSQL · Flyway | no jOOQ |
| Auth | Spring Security + **JWT (stateless)** · MFA TOTP | OAuth2/SAML are spec targets, not built |
| Frontend | **React 19.2 · Vite 8 · JavaScript/JSX · Tailwind 4** | not Angular; not TypeScript |
| Data fetching | TanStack Query via a single `apiClient` | no inline `fetch`/`axios` |
| Package | `com.bcits.works` with domain subpackages | modular-monolith carve is active/current |

**Do not "fix" the stack to match the spec inside a feature PR.** Closing a spec-vs-code gap
(package rename, TS migration) is a planned migration with its own issue and PR (§3.7 of
ENGINEERING-PRINCIPLES). Build to the code that exists.

---

## 2. Architecture rules

**Modular monolith today, evolving to extractable services.** One deployable now, but every domain is
a **service-in-waiting**: an enforced module with a stable public boundary and events on the shared
backbone. **Extract on demand, never preemptively**—only through an accepted decision and linked task
when reuse, scale, or operational isolation justifies it. Broker/search/new-language targets are not
current implementation facts and must not land incidentally. **Never fragment a unification layer**
(one identity, one event store, one AI plane, one query language) across services.

**One job per layer:**

| Layer | Does | Never does |
|-------|------|------------|
| Controller | Parse HTTP, call service, return response | Business logic, RBAC, DB access |
| Service | Business logic **+ authorization (`RbacService`) + tenant scoping** | HTTP concerns |
| Repository | Data access (Spring Data JPA) | Business decisions |

- **RBAC in the service layer, never the controller or UI** (`RbacService`). If the only thing
  stopping access is a hidden button, it isn't stopped.
- **Every query is workspace-scoped** — no repository method returns rows across tenants. Enforced by
  the central Hibernate tenant filter (#243, on 136 entities) + `guardrails.sh` query-scope checks +
  `TenantFilterCoverageTest`. See RB-40 §1.
- **Stateless:** JWT carries its own state; no server-side sessions; services hold no request
  state between calls. This is what lets the app scale by adding instances.
- **Validate at the boundary:** every incoming DTO is `@Valid`; the service assumes clean input.

---

## 3. Data & persistence

- **Flyway only.** Never touch the schema by hand. Compute the next migration number from migration
  files via `scripts/generate-project-state.mjs`.
  Migrations are **forward-only** — to undo, write a new forward migration; never edit a shipped one.
- **Plural, snake_case tables** (`work_items`, `projects`). One concept, one name across all layers
  (§5).
- **Event-backed audit history.** Audited domain changes emit to the **append-only `events`** table
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

- **Test-first is mandatory for coding-related implementation changes that alter executable
  behavior.** Use **RED → GREEN → REFACTOR** in small increments: author and run the relevant
  automated test before implementation, confirm it fails for the intended missing behavior, write
  the minimum code to pass, then improve the design while the targeted and related suites remain
  green (RB-05 Stage 3).
- **Bug fixes start with a failing regression test.** Pure refactors establish or add passing
  characterization coverage before production edits, then proceed in green increments; do not create
  a fake failure for behavior that already exists.
- **Pyramid:** many unit, fewer integration, fewest E2E.
- **Backend:** JUnit 5 + **Testcontainers** (real Postgres, not mocks, for anything touching the
  DB). JaCoCo coverage gate in CI.
- **Frontend:** Vitest + React Testing Library; test behavior, not implementation.
- **E2E:** Playwright (scaffold present, not yet active).
- **Done means demonstrated:** coding-related behavior requires automated test-first coverage;
  running the app supplements that proof but does not replace it. A non-code task may use an exact
  observation from its validation plan. Every feature includes an **unauthorized** and a
  **cross-tenant** test when authorization or tenant data is touched (RB-40).

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
  `type/gh-<issue>-<slice>-<slug>` branches off `main` → PR → CI green → **squash-merge** → delete the
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
- **Technical debt:** recorded as a labelled GitHub issue with rationale, impact, evidence, owner, and
  payoff trigger; paid down deliberately, not via drive-by refactors inside feature PRs.

---

### What's enforced here
Exact enforcement classes and checks are registered in `../policy-registry.json`. Guardrails and
linters cover syntax/structure; JUnit/Vitest/architecture tests cover behavior; tenant scope requires
the registered central-filter and cross-tenant tests. Review-only claims are not represented as CI proof.

---

# Rule Book 40 — Governance, Security & Compliance

> Owns the cross-cutting commitments that protect tenants, data, and trust. Most of this book is
> **spec-authoritative** (`05 §1`, `06 §5`, `07 §4`) and describes what must be true as these
> iterations land — it is the content that was missing from every other layer. Read after the
> [Orchestrator](../00-ORCHESTRATOR.md). Precedence: [`SOURCE-OF-TRUTH.md`](../SOURCE-OF-TRUTH.md).

---

## 1. Multi-tenancy — hard workspace isolation *(spec `06 §5.2`, `07 §4.5`)*

**The single catastrophic risk for a product sold to multiple DISCOMs is cross-tenant leakage.**
Tenant isolation is **not** RBAC — RBAC decides what a user may do *within* their tenant; isolation
guarantees they can never see *another* tenant's data.

- **Every row is owned by a workspace.** `workspace_id` is present on tenant-scoped tables and on
  every event in `events`.
- **Every query is workspace-scoped — no exceptions.** No repository method returns rows across
  workspaces. Scoping is applied centrally (e.g. a Hibernate filter / mandatory predicate), not
  re-typed per query, so it cannot be forgotten.
- **BQL is scoped at compilation** (RB-10 §6) — a user-authored query cannot escape its tenant.
- **Field-level security** *(spec `06 §5.5`)*: sensitive fields are visible per-field, per-role,
  **enforced server-side** — not hidden in the UI. Manager drill-down into individuals is blocked
  at the API.
- **Enforcement:** two layers. (1) `guardrails.sh` blocks any repository `@Query` SELECT lacking a
  workspace token, and **warns** on raw-`JdbcTemplate` `work_items` SQL in a Controller/Service that
  carries no tenant-scope signal anywhere in the file (workspace token, id-scope key, or `RbacService`
  call) — a coarse tripwire for new unscoped raw-SQL surfaces. (2) The leak-proof guarantee — a
  **central Hibernate tenant filter applied once** (this §1: "scoping applied centrally, not re-typed
  per query") is covered by `TenantFilterCoverageTest`, which fails when an entity is neither filtered
  nor explicitly global-by-design. Per-request binding (`CurrentWorkspace.bind()` at the
  `RbacService` authorization choke point) is **flag-gated** `tenant.filter.binding.enabled` (default
  off, canary-first); until it is flipped, isolation rests on the retained per-query predicates (kept as
  defence-in-depth — the CONTRACT removal of redundant predicates is deferred until the binding soaks).
  `@Filter` does not cover by-PK `findById`, so PK loads of tenant entities carry an ownership re-check
  (`CrossTenantPkLoadAccessTest`). A per-statement grep was deliberately rejected as too
  false-positive-prone (see `docs/INSIGHTS-AI-ALIGNMENT-REVIEW.md` §1.2). Every feature ships an
  **unauthorized** and a **cross-tenant** test. Full control evidence: `docs/compliance/CONTROL-MATRIX.md`.

## 2. AI Control Plane *(spec `05 §1.2–1.6`)*

AI is one orchestration layer with **one budget, one audit trail, one fallback contract** — no
capability calls a model on its own terms.

- **Scope hierarchy (most-restrictive-wins):** AI can be toggled at **workspace → capability →
  user → in-context**. The most restrictive enabled scope governs. Off at workspace = off
  everywhere downstream.
- **Fallback contract — mandatory per capability.** Every AI feature answers *"what happens when
  AI is off, over budget, or unavailable?"* The deterministic fallback (e.g. manual BQL/visual
  builder, rules engine) is part of the feature, not an afterthought. **No fallback documented = it
  does not ship.**
- **Cost discipline (per workspace):** a monthly budget cap; at **80%** spend, degrade to the
  configured economy capability tier; at **100%**, auto-disable AI for the workspace and serve fallbacks.
  Per-user rate limits. **Response caching** for repeated prompts (meaningful spend reduction).
- **Model tiering:** provider-neutral economy tier for classification/intent and capable tier for
  generation/reasoning. Concrete provider/model names live in runtime configuration, not policy.
- **Audit — every invocation logged:** timestamp, user, workspace, capability, prompt size, model
  tier, tokens in/out, cost, and the AI-policy state at call time. This is core data (RB-20 §5).
- **Data boundary:** redact PII before it leaves the server to a model; respect data residency
  (§4); AI calls originate **server-side only** (RB-10 §8).

## 3. Data governance & the audit/erasure reconciliation *(spec `06 §5.5` ⟷ `06 §5.1`)*

Required: data export, **right-to-be-forgotten**, access audit, data residency (GDPR / India DPDP).

**The conflict:** the architecture commits to an **append-only event log that is never deleted**
(RB-10 §3, ENGINEERING-PRINCIPLES §1.6 & §3.2), yet DPDP/GDPR require **erasure** of personal data.
Both cannot be literally true if personal data lives inside the immutable log.

> **DECISION (2026-06-04 — Deepak): crypto-shredding + PII-vault tokenization.** The event log stays
> append-only and immutable; **raw personal data is never stored inside an event** (or projection,
> index, or log line). Instead:
>
> - **PII lives in a separate, mutable PII vault**, keyed by an opaque per-subject token. Events and
>   read-models reference the **token**, never the raw personal field.
> - Each subject's vault record is encrypted under a **per-subject data key**, envelope-encrypted via
>   the KMS in §4 (BYOK where a tenant requires it).
> - **"Forget" = destroy the per-subject key and purge the vault record.** The event history and its
>   causal structure stay intact and auditable; the personal data becomes cryptographically
>   unrecoverable. This satisfies erasure **and** preserves the immutable audit trail.
>
> **Binding rules:**
> 1. **No raw PII outside the vault** — not in event payloads, projections, search indexes, logs, or
>    metrics; only tokens/ciphertext. Guardrails and architecture tests are defence-in-depth; flow
>    tests provide behavioral evidence.
> 2. **Backups must honour erasure** — a backup that can resurrect a destroyed key or pre-shred PII
>    defeats the right. Key retention ≤ backup retention, and key destruction propagates to
>    replicas/caches.
> 3. **Projections re-derivable from tokenized events alone** — a read-model rebuild after erasure
>    must never need the purged PII.
> 4. **Maintain a PII field inventory + data-residency map** (which vault, which region) — the single
>    artifact the access-audit and residency requirements both read from.
>
> *Status:* repository migrations and current tests are the evidence for shipped vault/tokenization
> mechanics. Key-management operations, retention, residency, backup expiry, and legal/DPO validation
> remain separately tracked controls; they must not be inferred from this policy text.

## 4. Security depth *(spec `06 §5.4`, `07 §4.6`)*

Engineering-surface hardening is in RB-10 §8. The platform commitments:

- **In transit:** TLS 1.3 minimum. **At rest:** AES-256. **BYOK** via KMS for tenants that require it.
- **Identity:** MFA for admins; **WebAuthn / passkeys**; **conditional access** (IP allow-list,
  device, geo, time-of-day).
- **Assurance:** annual penetration test + bug bounty; dependency/security scanning in CI (RB-10 §9).
- **Certification target:** SOC 2 Type 2 + ISO 27001 require externally evidenced audit programs;
  repository controls alone cannot claim certification.

## 5. Non-functional budgets *(spec `06 §5.3`)*

Performance is a contract, not a vibe. Test against these (ms):

| Operation | P50 | P95 | P99 |
|-----------|----:|----:|----:|
| Page load | 300 | 800 | 2000 |
| Work-item create | 100 | 300 | 1000 |
| Search / query | 150 | 500 | 1500 |
| Board drag-drop | 50 | 150 | 500 |
| Dashboard render | 500 | 1500 | 3000 |
| AI (cached) | 100 | 300 | 1000 |
| AI (uncached) | 2000 | 5000 | 10000 |
| File upload | 1500 | 3000 | 8000 |

Every pass/fail claim names a versioned benchmark profile: environment, dataset/seed volume,
concurrency, warm-up, repetitions, percentile calculation, and variance tolerance. Unprofiled timing
is diagnostic evidence, not a conformance result.

**Target infrastructure** *(spec `07 §2.4, §4.7`)*: AWS — ECS/EKS, RDS (Multi-AZ), ElastiCache
(Redis) for cache + AI response cache, S3 + CloudFront, Secrets Manager, ECR; **Terraform** IaC;
**OpenTelemetry → CloudWatch / Grafana / Prometheus**. Current local stack is Docker Compose
(RB-10 §9); the gap to AWS is a deliberate, planned step, not an assumption.

---

### What's enforced here
Exact enforcement classification is registered in `../policy-registry.json`. Tenant coverage and
cross-tenant behavior are automated controls; legal certification, complete privacy operations, and
unprofiled target infrastructure remain review or target-state controls until their registered checks
and external evidence exist.
