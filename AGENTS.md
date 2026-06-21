<!-- GENERATED FROM ai-rules/ — do not edit by hand.
     Edit the source in ai-rules/ and run: node scripts/generate-ai-rules.mjs
     This file is the cross-tool AGENTS.md view of the same rules. -->

<!-- CANONICAL SOURCE — human- and machine-facing. Per-tool files
     (CLAUDE.md, AGENTS.md, .github/copilot-instructions.md, .cursor/rules/*,
     .windsurfrules) are GENERATED from this orchestrator + the rule books.
     Never hand-edit generated files. See §7. -->

# bSmart Works — Orchestrator

> **Read this first, every task.** It is the control plane: it tells any developer or AI tool
> *what* to do, *why*, *when*, and *how* — and binds each action to the check that enforces it.
> It does not restate the rules; it **routes** to the rule book that owns them.
>
> Version 1.0 · last verified 2026-06-09 · owner: Deepak Pandey

---

## 0. Prime directive

**One product, one data model, one design system, one set of rules — enforced by machines, not
memory.** Consistency that depends on people (or models) remembering decays. Every rule in the
rule books is wired to a check that fails the build (§4).

Three standing rules that override convenience:

1. **Code is the present; the spec is the target.** Where the spec and the codebase disagree on
   *how it is built*, the code wins. Where they disagree on *what must be true / what we are
   building toward*, the spec wins. The full precedence policy and reconciliation ledger live in
   [`SOURCE-OF-TRUTH.md`](./SOURCE-OF-TRUTH.md) — consult it before resolving any contradiction.
2. **Build to the active iteration, never ahead of it** (current iteration: §6).
3. **When in doubt on data model, security, tenant isolation, or RBAC — stop and ask** (§5).

---

### 0.1 Transformation roadmap V.20 triggers

Deepak may use these exact trigger phrases in Claude Code, Codex, or GPT Code. Treat them as
repository-level operating commands, not casual prose:

- **"Start the bSmart Transformation Roadmap"**
- **"Resume the bSmart Transformation Roadmap"**

When either trigger appears, the agent owns the work end to end until the current roadmap slice is
complete locally and on GitHub `main`, subject to normal GitHub review/CI constraints and explicit
human approval requirements in RB-05.

The transformation source of truth is:

1. `docs/implementation/BSMART-TRANSFORMATION-ROADMAP.md`
2. `docs/implementation/ROADMAP-STATE.md`
3. `docs/implementation/source-documents/bSmart_Works_Final_Execution_Decision_Document.md`
4. `docs/implementation/source-documents/bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
5. `docs/implementation/source-documents/bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
6. `docs/implementation/source-documents/bSmart_Works_AI_Agent_Implementation_Instructions.md`
7. `docs/implementation/source-documents/bSmart_Works_V1_6_Claude_Codex_Roadmap.md`
8. `C:\Users\user\Downloads\bSmart_Works_Final_Execution_Decision_Document.md`
9. `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
10. `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
11. `C:\Users\user\Downloads\bSmart_Works_AI_Agent_Implementation_Instructions.md`
12. `C:\Users\user\Downloads\bSmart_Works_V1_6_Claude_Codex_Roadmap.md`
13. This orchestrator, SOURCE-OF-TRUTH, and all applicable rule books.

The Final Execution Decision Document is the V.20 execution prioritization layer: harden, simplify,
consolidate, and polish before adding breadth. Complete EPIC 0, EPIC 1, EPIC 2, and EPIC 25 partial
before major feature expansion. The V1.6 roadmap is a requirements overlay to map into the existing
EPIC sequence; do not implement it as one broad branch or let it bypass Phase 1. Preserve the current
mode rail exactly as `Home`, `Deliver`, `Insight`, `Service`, `Know`, `Extend`, and preserve the
existing work-item hierarchy as the baseline. Add only logically needed, backwards-compatible work-item
hierarchy/type extensions through explicit EPIC plans. If the local Downloads files are unavailable in
a remote/GitHub-only session, continue from the repo-tracked source documents and state files.

**Start behavior:** sync from latest `main`, inspect the current worktree and open PR/branch state,
read the transformation source of truth, begin with the next incomplete EPIC in roadmap order, create
or update the required EPIC plan under `docs/implementation/epics/`, implement, verify, open a PR,
merge only after required gates pass, pull latest `main`, run post-merge validation, and update
`docs/implementation/ROADMAP-STATE.md`.

**Resume behavior:** do not restart blindly. First inspect git status, current branch, recent commits,
open local changes, existing EPIC plans/completion notes, and `docs/implementation/ROADMAP-STATE.md`.
Continue from the latest safe point, preserving user/developer changes. If state and code disagree,
trust the current code and GitHub state, then update the state file after verification.

---

## 1. The rule books

Authority is split by domain. Decide what the task touches, then open the rule book(s) that own it.

| # | Rule book | Owns | Applies when you touch… |
|---|-----------|------|--------------------------|
| 05 | [Task Execution & Ways of Working](./rulebooks/05-TASK-EXECUTION.md) | How any task — raised by the user or self-identified — goes from idea to merged-on-remote, gated end to end | **Every task, before anything else** |
| 10 | [Engineering & Architecture](./rulebooks/10-ENGINEERING.md) | Stack, layers, data/Flyway, API contract, BQL, testing, security hardening, branching/PR/CD/observability/tech-debt | `**/*.java`, `**/pom.xml`, `db/migration/**`, any service/repository/controller/API |
| 20 | [Product & Delivery](./rulebooks/20-PRODUCT.md) | What earns its place, iteration discipline, defaults-vs-customization, compliance-as-data, PM traceability | Any new feature, scope decision, capability, or roadmap question |
| 30 | [Design & UX](./rulebooks/30-DESIGN.md) | Design tokens, layout, interaction, states, accessibility, content, iconography — the single design system | `works-frontend/**`, any component, screen, or copy |
| 40 | [Governance, Security & Compliance](./rulebooks/40-GOVERNANCE.md) | Multi-tenant isolation, AI Control Plane, data governance/DPDP, security depth, NFR budgets | Anything touching tenant data, AI features, audit/compliance, or performance |
| — | [SOURCE-OF-TRUTH](./SOURCE-OF-TRUTH.md) | Precedence policy + stack reconciliation ledger | Any spec-vs-code or doc-vs-doc conflict |

Most non-trivial tasks hit **two or more**: a new feature is Product (does it earn its place?) +
Engineering (how it's built) + Design (how it looks) + Governance (is it tenant-safe / auditable?).

---

## 2. The operating loop — *how* to do any task

Run these six steps in order. Each states **what** you do, **why** it matters, and **how** to do it.
This loop is itself enforced: the gate at step 5 is the PR template + CI (§4).

> The six steps below are the **at-a-glance**. The full gated procedure — intake, triage,
> right-sizing, branch/PR/merge, post-merge remote verification, and failure/rollback paths — is
> **[RB-05](./rulebooks/05-TASK-EXECUTION.md)**, which is the canonical detail. Stage 0 of RB-05
> decides how much of the process a given task needs.

**1 · Orient — read before you write.**
*Why:* most defects are misunderstandings, not bad code. *How:* read this orchestrator, then the
rule book(s) for the files you'll touch (§1), then the existing code in that area. Confirm the
active iteration (§6).

**2 · Route — map the task to its rules.**
*Why:* applying the wrong rule book, or missing one, is how silos and inconsistencies start.
*How:* use the routing table (§3). List every rule book in scope before coding.

**3 · Plan — acceptance criteria + scenarios.**
*Why:* "done" must be defined before "build," or scope drifts. *How:* write testable acceptance
criteria; enumerate happy-path, edge, error, empty, and **unauthorized / cross-tenant** scenarios
(the last two are non-negotiable — see RB-40).

**4 · Build — the non-negotiables.**
*Why:* these are the rules a check will catch anyway; doing them by default is faster than failing CI.
*How:* one job per layer; RBAC in the service, never the controller or UI; **every query
workspace-scoped**; design tokens, never literals; one HTTP path (`apiClient`); one error shape;
Flyway-only schema changes (next migration: §6); validate every DTO at the boundary; change only
what the task needs.

**5 · Verify — the Definition of Done gate.**
*Why:* green CI is the contract that lets anyone merge with confidence. *How:* see §4. A change is
not done until its behavior is demonstrated (a test, or the running app) **and** the DoD gate is
green **and** the in-scope spec commitments (RB-40) are satisfied — green CI is necessary, not
sufficient.

**6 · Communicate — close the loop.**
*Why:* the next person (or tool) inherits your context. *How:* PR description states what changed,
why, which rule books applied, and how it was verified. Update §6 if the iteration or migration
high-water mark moved.

---

## 3. Routing table

| If the task is… | Open these rule books |
|------------------|------------------------|
| **Any task at all** | **05 Task Execution first** (Stage 0 right-sizes the rest), then the books below |
| A backend change (entity, service, repository, API, migration) | 10 Engineering · 40 Governance (tenant scope, audit) |
| A new UI screen or component | 30 Design · 10 Engineering (data fetching) · 40 (if it shows tenant/AI/personal data) |
| A new feature, end to end | 20 Product → 40 Governance → 10 Engineering → 30 Design |
| An AI capability | 40 Governance (Control Plane: scope, budget, fallback, audit) · 10 · 30 |
| Anything reading/writing tenant data | 40 Governance (isolation) · 10 |
| A compliance / SLA / audit feature | 40 Governance · 20 Product · 10 |
| A release, deploy, or hotfix | 10 Engineering (branching, CD, release) |
| A spec-vs-code or doc-vs-doc conflict | SOURCE-OF-TRUTH first, then the relevant book |

---

## 4. Enforcement binding — *this* is how the rules hold

Each rule maps to a check that runs automatically and **blocks merge**. The orchestrator's job is
to make the gate non-optional; the checks do the enforcing.

| Action / rule | Enforced by | When it fires |
|---------------|-------------|---------------|
| Design tokens, no raw hex / `gray-*` / `works-*` / arbitrary `z-[]`,`p-[]` | ESLint (`works-frontend/eslint.config.js`) + `guardrails.sh` | save · pre-commit · CI |
| No inline `fetch`/`axios` (one `apiClient`) | ESLint `no-restricted-imports`/`-syntax` | save · pre-commit · CI |
| WCAG 2.1 AA | `eslint-plugin-jsx-a11y` | save · pre-commit · CI |
| RBAC in service (not controller); Flyway-only; package layout | `scripts/guardrails.sh` | pre-commit · CI |
| **Every repository query workspace-scoped** | `guardrails.sh`: repo `@Query` SELECT scope (BLOCK) + raw-`JdbcTemplate` `work_items` scope-signal tripwire (WARN). Full guarantee = central Hibernate tenant filter, **still TO BE ADDED (#243, RB-40)** | pre-commit · CI |
| Java style | Checkstyle (`failOnViolation=true`; baseline clean as of 2026-06-08 — TD-005 closed) | `./mvnw verify` · CI |
| Backend behavior + coverage | JUnit 5 + JaCoCo gate | CI |
| Frontend behavior | Vitest + React Testing Library | pre-commit · CI |
| AI-tool rule files never drift from source | `scripts/generate-ai-rules.mjs --check` | pre-commit · CI |
| DoD + volatile facts never drift | `scripts/check-dod-sync.sh` (+ extend to cover the §6 migration number) | pre-commit · CI |
| Definition of Done | `.github/pull_request_template.md` | every PR |
| The whole gate | `.github/workflows/ci.yml` | every push & PR — **blocks merge** |

**Definition of Done (the gate's contract):** acceptance criteria met · tests prove behavior ·
no new lint/guardrail/style violations · tenant-scoped + RBAC-enforced · tokens not literals ·
migration (if any) is the next sequential number (§6) and forward-only · PR describes change/why/rule-books/verification ·
in-scope RB-40 commitments satisfied.

<!-- dod-version: 2026-06-04-r1 — keep in sync with .github/pull_request_template.md; verified by scripts/check-dod-sync.sh. Bump in both places when the §4 DoD contract changes. -->

---

## 5. Ambiguity — when to ask vs. proceed

**Proceed** when the rule books answer it, or the choice is reversible and low-blast-radius: state
your assumption in the PR and move.
**Stop and ask Deepak** when it touches the **data model, security, tenant isolation, RBAC, an
irreversible migration, or a spec-vs-code conflict the ledger doesn't already settle.** Guessing on
these is the one unrecoverable mistake. One sharp question beats one wrong migration.

---

## 6. Volatile facts — the single source (do not duplicate elsewhere)

> These values live **only here**. Every rule book points back to this section. `check-dod-sync.sh`
> should be extended to verify the migration number against `db/migration/`.

- **Iterations:** 20 total · 26 capabilities · ~346 sub-features.
- **Active iteration:** **20 (complete)** — Polish, Advanced AI & Marketplace Foundation. Cap O:
  multi-step AI agents (audited runs), workspace-defined custom assistants, AI memory/context, and
  conversational dashboards (NL → widget spec). Cap R: the app marketplace foundation (global
  catalogue, per-workspace installs with permission scoping) + developer portal SDK/sandbox. Cap I:
  document templates, multi-author collaboration, AI structured-data extraction. Cap N: customer
  chat support (portal chat, AI tier-1 + human escalation). Cap A: localization across 10 languages
  (en/hi/es/fr/de/pt/ja/zh/ar/ko, RTL-aware) + accessibility audit (WCAG 2.2 AA). Cap S/T:
  performance-hardening composite indexes and the final security-hardening posture
  (`SECURITY.md` disclosure policy). Every new AI surface routes through the **AI Control Plane**
  (one policy hierarchy, one budget, one audit trail, one fallback contract, RB-40 §2) with a
  documented deterministic fallback. Built on the full stack of prior iterations — incl. **11** (AI
  Control Plane), **12** (KPI Framework), **13** (Automation + Integrations), **14** (Developer
  Workspace), **15** (Scrum Master Cockpit + Product Owner Workspace), **16** (Leadership Console
  Cap X + Admin Operations Center Cap Y), **17** (Universal Customization Engine Cap R), **18**
  (Mobile + Real-time + Performance Cap S), **19** (Enterprise Security + Compliance Certifications
  Cap T), and the Compliance/Service iterations (7–9).
- **Flyway high-water mark:** **V114**. (V110–V114 are the Phase-1 PII-vault / crypto-shredding
  migrations — V110 = users.subject_token + subject_data_keys (per-subject envelope-wrapped DEK);
  V111 = users.email_hmac blind index (email tokenization, Slice 2); V112 = customer_users
  subject_token + email_hmac, stakeholder subject_token, and customer_subject_token on
  chat_conversations + customer_feedback_items (Slice 3 — customer/stakeholder subjects + denorm
  tokenization); V113 = field_def.pii flag + work_item_field_value.subject_token (Slice 4b — tenant-
  declared PII custom fields route their text values to the vault); V114 = notifications.actor_id
  (Slice 4c — watcher/mention notification messages stored name-free, actor name resolved at render).
  V91–V109 add the Know Studio knowledge-base + transformation
  migrations — e.g. article reactions/tags/favorites (V100–V102), space home article (V103), public
  share token (V104), article watchers (V105), space followers (V106). The per-version history below is
  documented through V90; V90 = `V90__sprint_member_capacities.sql`; note: V16 was
  skipped, V23 does not exist; V50–V53 are iterations 16/17/19/18's migrations; V54–V57 are
  iteration 20's advanced-AI / marketplace / knowledge / customer-chat migrations; V58 = user locale
  + perf indexes; V59 = block-editor + SCIM; V60 = custom domains; V61–V65 = compliance escalation,
  AI cache/rate-limits, KPI formula, sandbox mode, saved views; V66 = field_def.description fix
  (boot unblock); V67 = OAuth credentials + AES-256 encryption + PII vault; V68 = work-item type
  redesign (17-type taxonomy, auto-IDs, hierarchy); V69 = updated_at on workspaces + projects,
  unblocks WorkspaceTenantIsolationIT + ComplianceEvaluationPerformanceTest; V70 = surface/role_key
  on dashboards — per-role configurable Today layouts; V71 = product_id on work_items + 16-type seed data;
  V72 = custom_field_definitions table + custom_fields JSONB on work_items; V73 = warn/breach/outcome
  on workflow_status — per-status lapse thresholds for the work-item status engine; V74 =
  status_changed_at on work_items — drives the time-in-status lapse indicator; V75 =
  attachment_type + url on attachments — Files section accepts external links/webpages; V76 =
  backfill parent_id into work_item_links as PARENT links — hierarchy surfaced in the Links
  section; V77 = project_team_members — per-project team roles (V70 role_key vocabulary) for the
  role-adaptive Sprint Cockpit; V78 = ceremony_sessions + ceremony_attendees — first-class sprint
  ceremonies with per-member attendance; V79 = type_field_prefs — per-type field visibility on the
  detail surface; V80 = unify card custom fields onto field_def + work_item_field_value — one
  definition store and one value store, EXPAND phase, old custom_field_definitions table +
  work_items.custom_fields JSONB left in place for a later contract migration to drop; V81 =
  raise_type on impediments — role-filtered cockpit Raise model (impediment/risk/dependency/
  scope-change/decision-needed/escalation); V82 = value_date on work_item_field_value — typed date
  projection so BQL can range-query custom date fields; V83 = drop bql_filter (contract phase) —
  saved queries unified onto saved_views, legacy rows migrated then table dropped; V84 = enrich
  Monthly-executive-summary + Customer-status report templates (Cap J) — forward-only UPDATE of the
  two V38-seeded rows to the full spec section set: exec = KPI grid + velocity/trend chart +
  narrative + risk summary; customer = customer health + SLA + open-requests table + narrative;
  V85 = bql_run_audit — append-only audit of saved-view / subscription BQL runs ("saved/automated
  runs only"; ad-hoc /bql/execute is not audited, automations keep their own automation_runs log);
  V86 = bql_subscriptions — per-user saved-view subscriptions (DAILY/WEEKLY, in-app + email), each
  delivery an audited workspace-scoped run; V87 = backfill_seed_work_item_event_history — synthesizes
  WORK_ITEM_CREATED + STATUS_CHANGED events for the ~356 seed work items that were bulk-inserted
  without writing to the append-only events log, so the Activity feed and status-timeline flow
  metrics render for them; idempotent (NOT EXISTS / "backfill":"V87" marker guards), tenant-scoped
  via INNER JOIN to projects, data-only/forward-only); V88 = insightful_report_templates — UPDATEs the
  three seeded report templates (exec-monthly / customer / release) to pivot-backed section sets
  (KPI grid + status/type/priority/workload-by-assignee pivot charts + open-work table + narrative),
  so "Use template" produces a genuinely useful report; forward-only data UPDATE; V89 =
  work_item_watchers — composite-PK follower rows (one per user per item) so a watcher is notified
  on any field change or new comment; FK to work_items cascades on hard delete; V90 =
  sprint_member_capacities — per-(sprint,member) capacity config (working-days override, time off,
  focus factor) for the role-adaptive Sprint Cockpit Capacity tab; the story-points budget is
  derived at read time from sprint working days × team velocity (not stored), so it always reflects
  current velocity/headcount; tenant-scoped via workspace_id + a sprint FK that cascades on delete.
- **Next migration:** **`V115__<description>.sql`**. *(Supersedes every stale lower-numbered reference.)*

---

## 7. Maintenance & distribution

- **This orchestrator + the rule books are canonical.** The per-tool files — `CLAUDE.md`,
  `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/bsmart.mdc`, `.windsurfrules` —
  are **generated** from them. Never hand-edit a generated file.
- **The generator must transform, not copy.** It emits each tool's native format: a short
  always-on core (this orchestrator's §0–§6) plus path-scoped slices from the rule books
  (Copilot `.github/instructions/*.instructions.md` with `applyTo`; Cursor `globs`; Claude nested
  `CLAUDE.md` per package). Backend rules attach to `**/*.java`; design rules to `works-frontend/**`.
- **Change a rule once, here, then regenerate and commit.** `generate-ai-rules.mjs --check` keeps
  every downstream file in sync.
- **Re-verify after each iteration:** update §6, bump the version + date in this header.
- This orchestrator is not overridden by any generated file.

---

# bSmart Works — Source of Truth & Precedence Policy

> **Read this before resolving any contradiction between documents.** It decides which
> source wins, for every kind of content. It exists so that Claude Code, Codex, Copilot,
> Cursor, and Windsurf all resolve conflicts the *same* way, every time.
>
> Version 1.0 · last verified 2026-06-09 · owner: Deepak Pandey

---

## 1. The three content domains and their authority

Authority is assigned by **content domain**, not by filename. Decide which domain a fact
belongs to, then apply that domain's source of truth.

| Domain | Source of truth | What it covers |
|--------|-----------------|----------------|
| **Tech Stack** (implementation reality) | `CLAUDE.md` + `AGENTS.md` | The stack as actually built: language, framework, build tool, frontend framework + language, auth mechanism, ORM/query approach, package naming, table naming, API versioning/path style, event-store table, dependency choices, "how it is built today". |
| **Software Specs** (product + architecture requirements) | `05-Capability-Map-Expansion-v3.5` + `06-Complete-Iteration-Guide` + `07-Tech-Stack-and-Architecture` (architectural-attributes content only) | Capabilities, the 20 iterations, the 5 architectural commitments, the 7 unification layers, the AI Control Plane, multi-tenancy, NFR/performance targets, security/privacy/data-governance requirements, BQL, field-level security — "what must be true / what we are building toward". |
| **Runbook / Playbook** (how to build, run, deploy, operate) | **All five documents combined** | Branching, environments/secrets, release, testing, PR flow, dependencies, CD, observability, tech-debt, the execution protocol, plus the specs' operational intent (AWS topology, Terraform, OpenTelemetry, performance budgets to test against, AI cost-ops thresholds, security/compliance ops). |

---

## 2. The rule that resolves the `07` overlap

`07-Tech-Stack-and-Architecture` is a **mixed document**. Split its content:

- **Its stack choices are Tech Stack** → `CLAUDE.md`/`AGENTS.md` **win and override them**.
  (Angular, Gradle, Spring Boot 3.x, OAuth2/SAML, jOOQ, singular tables, `com.bcits.works.*`,
  unversioned `/api/...`, `event_log`, RabbitMQ/SQS — all superseded; see the ledger in §4.)
- **Its architectural attributes & requirements are Software Spec** → **authoritative**.
  (Multi-tenant hard isolation, reliability, scalability, security depth, observability target,
  performance intent, AWS/Terraform/OTel target infrastructure.)

> **Test:** *"What is built and how it's built today"* → CLAUDE/AGENTS.
> *"What must be true and what we're building toward"* → specs.

---

## 3. Conflict-resolution order (apply top-down)

1. **Is it a tech-stack implementation fact?** → `CLAUDE.md`/`AGENTS.md` win. Full stop.
   Ignore any spec text that disagrees (it is recorded as superseded in §4).
2. **Is it a product or architecture requirement?** → the three specs win.
   (`07` counts only for architectural attributes, not for stack choices.)
3. **Is it operational** (build / run / deploy / test / release / incident)? → combine all
   sources: **CLAUDE/AGENTS govern current mechanics; specs govern target-state and thresholds.**
4. **Still ambiguous, or two specs disagree?** → **escalate to Deepak.** Never guess on data
   model, security, tenant isolation, or RBAC.

---

## 4. Tech-Stack Reconciliation Ledger — CLAUDE/AGENTS override the specs

Wherever this table applies, **ignore the spec and follow the canonical column.** If any of
these is ever intentionally reverted (e.g. the package rename), **update this ledger first.**

| Dimension | Spec said (`05`/`06`/`07`) | Canonical — CLAUDE/AGENTS | Note |
|-----------|---------------------------|---------------------------|------|
| Backend framework | Spring Boot 3.2+ | **Spring Boot 4.0.x** | per `pom.xml` |
| Frontend framework | Angular 18+ (default) or React | **React 19.2 + Vite 8** | per `package.json` |
| Frontend language | TypeScript (both paths) | **JavaScript / JSX** | stray `@types/react` unused |
| Build tool | Gradle (Kotlin DSL) preferred, or Maven | **Maven** (`pom.xml`, `mvnw`) | |
| Persistence / query | JPA + Hibernate + **jOOQ** | **JPA + Hibernate** (no jOOQ) | |
| Auth | Spring Security 6 + **OAuth2 + SAML** | **Spring Security + JWT (stateless)**, MFA TOTP | SSO not yet built |
| Backend package | `com.bcits.works.<domain>` | **`com.bcits.works`** (flat) | TD-001 rename complete 2026-06-08; sub-package split is a separate task |
| DB table naming | singular (`work_item`, `project`) | **plural** (`work_items`, `projects`) | |
| Entity / mapping | `<Domain>Entity` + MapStruct mapper + `<Domain>EventPublisher` | **`<Entity>` + `EventService` / `AppEvent`** | |
| API path | `/api/work-items` (unversioned) | **`/api/v1/work-items`** (versioned, kebab) | |
| Event store table | `event_log` | **`events`** | `event_log` dropped in V20 |
| Message broker | RabbitMQ / SQS early, Kafka at scale | **in-process events + outbox now; broker on service extraction** | per [ADR-0001](../docs/architecture/ADR-0001-service-decomposition.md) + RB-10 §2 |
| Real-time co-presence protocol | WebSocket (spec `06 §4.8`, iter 18) | **SSE (Server-Sent Events)** with heartbeat + `PresenceService` | SSE is unidirectional (server→client); sufficient for all current use cases; works through HTTP/2 proxies + CDN without sticky sessions. Decision 2026-06-08 — see TD-023. |
| Mobile apps | Native iOS (Swift) + Android (Kotlin) (spec `06 §4.9`, iter 18) | **PWA only** (service worker, offline drafts, Web Push, WebAuthn biometric) | Native apps are separate platform repos (`bsmart-works-ios`, `bsmart-works-android`) — not built in this codebase. Decision 2026-06-08 — see TD-020. |

> **DECISION REVERSAL (2026-06-20 — Deepak): maximal-scope completion.** The completion program
> (`docs/implementation/MASTER-COMPLETION-ROADMAP.md`) brings the following previously-superseded items
> **back into scope**; they will be built, each under its own EPIC plan with an explicit checkpoint:
>
> - **Message broker** (Kafka / RabbitMQ / SQS) for the event backbone — *in addition to* in-process events + outbox.
> - **Real-time:** add **WebSocket** for bidirectional needs *alongside* the existing SSE presence channel.
> - **Native iOS (Swift) + Android (Kotlin)** apps — *in addition to* the PWA.
> - **jOOQ** typed-query layer — *alongside* JPA/Hibernate.
> - **SAML / OAuth2 login SSO** — *in addition to* JWT + MFA + WebAuthn + SCIM.
> - **Target cloud infra:** AWS (ECS/EKS, RDS, ElastiCache, S3, CloudFront, Secrets Manager, ECR),
>   Terraform IaC, OpenTelemetry → CloudWatch/Grafana/Prometheus.
>
> The **Canonical** column above remains the *current-state* truth until each item ships; update the
> relevant row from "current" to the new reality as each EPIC merges. This reversal supersedes the
> per-row "Decision 2026-06-08" notes for these items only.

---

## 5. Software-Spec authority map — specs win; honor when building forward

These requirements are **spec-authoritative**. CLAUDE/AGENTS are currently silent or thinner on
them; that is a documentation gap to close, not a reason to skip them.

| Requirement | Source | Status in CLAUDE/AGENTS |
|-------------|--------|-------------------------|
| Multi-tenant **hard workspace isolation** (every query workspace-scoped; `workspace_id` on events) | `06 §5.2`, `07 §4.5`, event schema | Absent — add |
| **AI Control Plane**: 4-level scope (most-restrictive-wins), per-workspace budget caps (80%→Haiku, 100%→auto-disable), response caching, model tiering, per-call audit schema | `05 §1.2–1.6` | Principle only; detail missing |
| **BQL** — the one query language across filters, automations, compliance, KPIs, dashboards | `06 §3 Layer 3` | Absent — add |
| **Field-level security** (per-field, per-role, server-enforced) | `06 §5.5`, `06 §3 Layer 2` | Absent (RBAC ≠ field-level) |
| **NFR / performance budgets** (P50/P95/P99 table) | `06 §5.3` | Absent — add |
| **Data governance**: GDPR/DPDP, right-to-be-forgotten, data residency, AI data-boundary; reconcile vs append-only audit | `06 §5.5` + `06 §5.1` | Tension **resolved** in RB-40 §3 (crypto-shredding / PII-vault); detailed design at iter 7–9 |
| **Security depth**: TLS 1.3 min, AES-256 at rest, BYOK/KMS, WebAuthn/passkeys, conditional access, SOC 2 Type 2 + ISO 27001 (iteration 19) | `06 §5.4`, `07 §4.6` | Absent — add |
| **Target infra**: AWS (ECS/EKS, RDS Multi-AZ, ElastiCache/Redis, S3, CloudFront, Secrets Manager, ECR), Terraform IaC, OpenTelemetry → CloudWatch/Grafana/Prometheus | `07 §2.4`, `07 §4.7` | Roadmap-only mention |
| **Five architectural commitments** (compliance-first, SLA one-engine/two-contexts, config-without-code, privacy-by-design, event-sourced) | `06 §2` | Partial / implicit |
| **Seven unification layers** (one event store, one identity, one query language, one AI orchestration, one customization, one knowledge, one design system) | `06 §3`, `05 §3` | Partial |

---

## 6. Runbook / Playbook inputs — take all

The operational layer draws from **every** source. Operating rule: **current mechanics from
CLAUDE/AGENTS; target-state and thresholds from the specs.**

- **From CLAUDE/AGENTS:** branching (§7), environments & secrets (§8), release management (§9),
  testing strategy (§10), PR flow & size (§11), dependencies (§12), CD/deploy (§13),
  logging & observability (§14), technical-debt process (§20), the execution protocol (§21/§24).
- **From the specs:** target AWS deploy topology + Terraform (`07 §2.4`); OpenTelemetry →
  CloudWatch/Grafana/Prometheus (`07 §4.7`, `06 §5.6`); performance budgets to test against
  (`06 §5.3`); AI cost-ops thresholds and degrade/disable behavior (`05 §1.5`); security &
  compliance operations and the cert calendar — SOC 2 / ISO 27001 in iteration 19 (`06 §5.4`).

---

## 7. Maintenance

- This file is consulted **before** resolving any cross-document contradiction.
- Update the **ledger (§4)** before any intentional stack change — never after.
- Re-verify the ledger and the spec authority map **after each iteration**; bump the version
  and date in the header.
- This precedence policy itself is not overridden by any other document.

---

# Rule Book 05 — Task Execution & Ways of Working

> Owns **how any task — raised by the user *or* self-identified by an AI tool — goes from idea to
> merged-on-remote.** This is the detailed, gated expansion of [Orchestrator §2](../00-ORCHESTRATOR.md).
> Run it for **every** task; Stage 0 decides how much of it applies.
> **Enforced by:** the PR template (Definition of Done), the CI gate (blocks merge), `guardrails.sh`,
> and branch protection on `main`.

---

## Stage 0 — Intake & triage *(added)*

**Capture and classify** the task: feature · bug · refactor · chore · spike · hotfix.

**If *you* (the AI tool) surfaced this task, do not fold it into the current work.** Log it as its
own issue/PR and surface it. The default for self-identified work is **propose, never silently
expand scope** (RB-10 §9, scope discipline). Anything touching **data model, security, tenant
isolation, or RBAC → stop and get Deepak's sign-off first** (Orchestrator §5).

**Earns-its-place + iteration check:** confirm the task closes a real gap (RB-20 §1) and belongs to
the **active iteration** (Orchestrator §6). If it's iteration N+1 work, **park it — do not build
ahead** (RB-20 §2).

**Right-size the rigor — pick a lane** *(added)*:

| Lane | Examples | Process |
|------|----------|---------|
| **Trivial** | typo, copy, comment, doc | branch → fix → PR → CI green → squash-merge. Skip Stages 2–3. |
| **Small** | one layer, low risk, no schema/tenant/AI | light Stage 2–3 → standard flow |
| **Standard** | a feature, endpoint, or component | full workflow below |
| **Large / risky** | schema change, cross-cutting, new capability, **anything tenant/security/AI/compliance** | full workflow **+ Deepak checkpoint at Stage 2** |

---

## Stage 1 — Clarify & define (Definition of Ready)

- **Resolve ambiguity first.** If the task has 2+ valid interpretations, ask **one** sharp question
  rather than planning the wrong thing. Don't proceed on a guess for anything irreversible.
- **Definition of Ready** (gate to enter Stage 2): scope is clear · acceptance criteria drafted ·
  active iteration confirmed · dependencies known · the in-scope rule books are listed.

---

## Stage 2 — Multidimensional scope analysis — the holistic plan

Walk the [routing table](../00-ORCHESTRATOR.md#3-routing-table). For **each dimension the task
touches**, write what it requires — this *is* what "multidimensional" means here:

- **Product (RB-20):** which capability/iteration; does it earn its place.
- **Engineering (RB-10):** layers touched; data + migration (expand-contract if schema changes);
  API contract; BQL.
- **Design (RB-30):** screens/components; the five states; tokens.
- **Governance (RB-40):** workspace scoping; field-level security; AI Control Plane (scope, budget,
  fallback, audit); NFR budget; audit/compliance; data-governance.
- **Delivery (RB-10 ops):** branch, PR size, CD, release/tag.

**Holistic / second-order** *(systems-thinking)*: list dependencies, the ripple across the seven
unification layers, what could break elsewhere, affected downstream iterations, and reversibility.

**Output:** a short written plan — scope, the dimensions above, the approach, the risks, and the
migration plan if any. On the **Large/risky** lane, this plan is the Deepak checkpoint *before*
code.

---

## Stage 3 — Test & validation plan *(before code)*

- Turn acceptance criteria into **testable statements**.
- Enumerate the **mandatory scenario categories**: happy · edge · error · empty ·
  **unauthorized · cross-tenant** (RB-40 §1) · **performance vs NFR budget** if on a hot path
  (RB-40 §5) · **accessibility** if UI (RB-30 §6).
- Choose test levels: unit (JUnit 5 / Vitest) · integration (**Testcontainers, real Postgres**) ·
  E2E (Playwright when active).
- Define **"working as expected"** concretely: the exact checks/observations that will prove it.

---

## Stage 4 — Prepare the workspace *(added — was implicit)*

- Branch off `main`: `type/scope-short-desc` (RB-10 §9). **Never work on or push to `main`
  directly** — it is protected.
- Confirm local hooks are active (husky / pre-commit) so lint + guardrails run on staged files.

---

## Stage 5 — Build

Apply the in-scope rulebook principles — the build non-negotiables (Orchestrator §2.4):
one job per layer · **RBAC in the service** · **every query workspace-scoped** · **tokens not
literals** · one `apiClient` · one error shape · **Flyway-only** (next migration: Orchestrator §6) ·
validate every DTO at the boundary · **change only what the task needs** (drive-by improvements get
logged per Stage 0, never smuggled in). Commit in logical increments with clear messages.

---

## Stage 6 — Test & validate

- Run the Stage 3 plan: all levels, **all** mandatory scenario categories.
- Run the gate **locally first** — lint, guardrails, style, unit + integration must be green before
  you push.
- Validate against acceptance criteria and the "working as expected" definition. UI → verify the
  five states + a11y. Tenant/AI/perf → verify the RB-40 gates.
- **If anything fails → return to Stage 5. Never force a red change forward** *(failure path)*.

---

## Stage 7 — Review & merge *(gated)*

- Push the branch to origin; open the PR (draft early if WIP).
- **PR description is the communication + traceability artifact** (Orchestrator §2.6, RB-20 §6):
  what changed · why · capability + iteration · rule books applied · how it was verified.
- Complete the self-review checklist; **the PR template is the Definition of Done** (Orchestrator §4).
- **Merge is gated:** CI must be **green** (the gate blocks merge) **and** review approved →
  **squash-merge only**. Never merge red; never direct-push to `main`.
- *Agent note:* merging, pushing to protected `main`, tagging/releasing, and deploying are
  irreversible/remote actions — when an AI tool is executing, these require explicit human
  go-ahead, consistent with branch protection.

---

## Stage 8 — Post-merge verification & remote *(sharpened)*

**"Done on my laptop" is not done.** Confirm:

- the branch was pushed and the **PR is merged on github.com**;
- **`origin/main` actually contains the change** (not just your local main);
- **CI is green on `main`**; the feature branch is deleted.
- **Iteration boundary?** tag + CHANGELOG + release (RB-10 §9); CD deploys from `main`; verify the
  deploy health-check.

The **Definition of Done is met only when the change is on remote `main`, green, and (where
applicable) deployed.**

---

## Stage 9 — Failure & rollback paths *(added)*

- **CI red on the branch** → fix on the branch, re-run; never merge to clear it.
- **Validation shows it doesn't work** → back to Stage 5; the change does not ship.
- **A merged change breaks `main`** → revert or hotfix (RB-10 §9.5); `main` stays releasable.
- **Follow-ups discovered en route** → logged as new issues (Stage 0), not added to this PR.

---

### What's enforced here
Definition of Done → PR template; the whole gate that blocks merge → `ci.yml`; squash-merge + branch
protection → repo settings; build non-negotiables → `guardrails.sh` + ESLint + Checkstyle; behavior
→ JUnit/JaCoCo + Vitest. Triage, right-sizing, and the self-identified-work guardrail are review
discipline, anchored by Stage 0 and the PR template.

---

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
| Package | `com.bcits.works` (flat) | TD-001 rename complete; sub-package split is a separate planned task |

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

---

# Rule Book 20 — Product & Delivery

> Owns *what we build and whether it earns its place*. Read after the
> [Orchestrator](../00-ORCHESTRATOR.md). The live iteration number is in Orchestrator §6.
> **Enforced by:** the PR template (scope + iteration check) and human product review; the
> discipline here is mostly judgment, backed by `check-dod-sync`.

---

## 1. Every feature earns its place
The v3.5 capability map added exactly three things and said no to the rest — copy that discipline.
A feature ships only if it closes a specific product or architectural gap, not because it's
interesting. **When in doubt, cut it.**

## 2. Build to the active iteration, not the roadmap
There are 20 iterations (Orchestrator §6). Working ahead is the most expensive mistake on this
project — it creates half-built surfaces that block the iterations beneath them. **Confirm the
active iteration before starting. Never build iteration N+1 while N is in scope.**

## 3. Defaults for the 80%, customization for the 20%
Ship opinionated defaults that work for most teams out of the box. Customization is a deliberate,
separate layer — **never the price of entry**. If a new user must configure something to get value,
the default is wrong. (One customization framework — RB-40 / unification layers — never per-feature
settings silos.)

## 4. Honest software
Information density is a feature, not a flaw — don't hide complexity behind oversimplified UI.
Empty states explain *why* they're empty and *what to do next*; errors say *what went wrong* and
*what to do about it*; privacy is enforced at the API, not hidden in the UI (RB-40 §1, RB-30 states).

## 5. Compliance and audit are first-class
Compliance rules, SLA violations, and the audit trail are **core data, not bolt-ons** — this is why
we event-source from day one (RB-10 §3). If a change can't be reconstructed and audited, it isn't
done. SLA is **one engine in two contexts** (internal delivery + customer commitments) — not two
implementations.

## 6. PM traceability (non-negotiable process)
Every unit of work traces to its capability and iteration: **capability → iteration → issue → PR →
verification.** A PR states which capability/iteration it serves. Work with no traceable product
reason doesn't get merged. Keep the iteration's current-status accurate (Orchestrator §6, §2 step 6).

---

### How this connects
- *Is the work justified and in-scope?* → here (RB-20).
- *Is it tenant-safe, auditable, within budget/NFR?* → RB-40.
- *How is it built?* → RB-10. *How does it look and read?* → RB-30.

---

# Rule Book 30 — Design & UX

> Owns the **single design system** — look, feel, interaction, accessibility, content. Read after
> the [Orchestrator](../00-ORCHESTRATOR.md). **Enforced by:** ESLint (tokens, a11y) +
> `guardrails.sh` (hex, `gray-*`, `works-*`, z-index).
>
> **Note:** this book merges what were two overlapping design sections (CLAUDE.md §4 and §22) into
> one. Conflicts were resolved using the brand spec (`06 §6`) as tiebreaker; exact hex values are
> whatever `tailwind.config.js` ships (it is canonical for tokens). There is now **one** value per
> property — no second design section.

---

## 1. The non-negotiables
- **Tokens, never literals.** No raw hex, px, or font value in a component. Use token names
  (`brand-navy`, `brand-orange`, `neutral-600`, `semantic-danger`). Arbitrary values
  (`bg-[#0B2F5C]`, `p-[15px]`) and `works-*` / `gray-*` names **fail lint**. The token set is the
  contract — it is what keeps theming, dark mode, and white-label working.
- **One component pattern:** `cva` + `cn()` (see `button.jsx`). Every new component follows it.
- **Every interactive element has all five states:** default · hover · focus-visible · active ·
  disabled. None may be skipped.
- **Accessibility is WCAG 2.1 AA, non-negotiable** (§6).

## 2. Color tokens
Use names; `tailwind.config.js` holds the hex.

| Token | Use |
|-------|-----|
| `brand-navy` (#0B2F5C) | Primary brand, headers, primary actions |
| `brand-navy-tint` (#1E4D8C) | Hover/secondary brand, focus ring |
| `brand-orange` (#E94E1B) | Single accent — sparingly, for the one primary CTA |
| `semantic-success` (#0E7C5E) · `-warning` (#B97A00) · `-danger` (#C0392B) | Status only |
| `neutral-50 / 100 / 200 / 300 / 400 / 600 / 700 / 900` | Surfaces → text, light to dark |

Readable text uses `neutral-900` (primary) or `neutral-600` (muted). **Never `neutral-400` for
readable text — it fails AA contrast** (it is the disabled/placeholder color). *Open item:* brand
spec lists `neutral-700` as `#3C4858` vs the config's value — confirm the intended hex.

## 3. Typography — hierarchy through weight, not size soup
| Role | Class | Weight |
|------|-------|--------|
| Display (hero) | `text-3xl` | bold |
| H1 page title | `text-2xl` | bold |
| H2 section | `text-xl` | semibold |
| H3 sub-section | `text-base` | semibold |
| Body | `text-sm` | normal · `neutral-900` |
| Caption / meta | `text-xs` | normal · `neutral-600` |
| Eyebrow / label | `text-xs` uppercase, tracking-wide | semibold · `neutral-600` |
| Mono (IDs, code) | `font-mono` ~13px | — |

## 4. Spacing, radius, layout
- **4px base unit.** Card padding `p-4`/`p-6`; vertical rhythm `space-y-6` (24px between sections).
- **Radius:** `rounded-sm` 4 · `rounded-md` 8 · `rounded-lg` 12 · `rounded-xl` (22px in config —
  code is canonical; spec's 16px is superseded).
- **Widths:** dashboards/full surfaces `max-w-7xl` (1280px); **reading/detail content `max-w-[880px]`**
  (added from spec — keeps long text legible).
- **Three-zone shell (mandatory):** persistent left nav · top context bar · scrollable content.
  Nav has one expanded width and one collapsed width — pick the config token and use it everywhere
  (do not hand-set widths per screen).

## 5. Interaction & motion
- **Expand/collapse is the core model:** lists expand to detail in place or in a side panel; the
  shell persists. One pattern, applied everywhere.
- **Motion is purposeful, never decorative.** One scale: `duration-fast` 150ms (hover, press),
  `duration-base` 220ms (panels, accordions, drawers), `duration-slow` 320ms (page/large
  transitions). Respect `prefers-reduced-motion`.
- **State treatments (single canonical values):** focus → `focus-visible:ring-2
  ring-brand-navy-tint/40 ring-offset-2`; active/press → `active:translate-y-px`; disabled →
  `opacity-50` + `cursor-not-allowed`.

## 6. States, feedback & accessibility
- **Loading:** skeletons `animate-pulse bg-neutral-100` matching final layout — no spinners for
  content.
- **Empty:** explain *why* empty and *what to do next*; illustration icon `h-10 w-10 text-neutral-300`.
- **Error:** say *what went wrong* and *what to do about it*; never a raw stack trace.
- **WCAG 2.1 AA:** AA contrast on all text; full keyboard operability; visible focus; labelled
  controls; semantic HTML. Enforced by `eslint-plugin-jsx-a11y`.

## 7. Navigation, components, content
- **Navigation:** one nav model; current location always indicated; no dead ends.
- **Components:** atomic structure (atoms → molecules → organisms); a component renders one
  responsibility; no inline HTTP, no raw styling values.
- **Logo:** use the supplied lockups and clear-space; never recolor or stretch.
- **Content:** plain, specific, action-oriented; sentence case; verbs in buttons ("Create work
  item", not "Submit"); no jargon where a plain word works.

## 8. Formatting & iconography
- **Dates/times/numbers:** one formatting layer, locale-aware; relative time for recent events,
  absolute on hover; never hand-format in components.
- **Icons:** Lucide, default 2px stroke (config is canonical; spec's 1.5px is a target — confirm if
  changing). Sizes: `16` inline · `20` buttons · `24` section. Icons are decorative unless labelled.

## 9. Z-index — the single stacking scale
Use the named scale only (base → dropdown → sticky → overlay → modal → toast). Arbitrary `z-[...]`
**fails guardrails**. One source of truth for stacking; never invent a layer.

---

### What's enforced here
Tokens/no-hex/no-`gray-*`/no-`works-*`, a11y, z-index → ESLint + `guardrails.sh` (save, pre-commit,
CI). Everything else is design review against this single book.

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
- **Enforcement (partial):** `guardrails.sh` blocks any repository `@Query` SELECT lacking a
  workspace token, and **warns** on raw-`JdbcTemplate` `work_items` SQL in a Controller/Service that
  carries no tenant-scope signal anywhere in the file (workspace token, id-scope key, or `RbacService`
  call) — a coarse tripwire for new unscoped raw-SQL surfaces, not the guarantee. The leak-proof
  guarantee remains a **central Hibernate tenant filter / mandatory predicate applied once** (this §1:
  "scoping applied centrally, not re-typed per query"), tracked as **#243** (needs sign-off). A
  per-statement grep was deliberately rejected as too false-positive-prone (see
  `docs/INSIGHTS-AI-ALIGNMENT-REVIEW.md` §1.2). Every feature ships an **unauthorized** and a
  **cross-tenant** test.

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
  cheaper model tier (Haiku); at **100%**, auto-disable AI for the workspace and serve fallbacks.
  Per-user rate limits. **Response caching** for repeated prompts (meaningful spend reduction).
- **Model tiering:** cheap/fast tier (Haiku) for classification and intent; capable tier (Sonnet)
  for generation. Never default everything to the expensive tier.
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
> **Binding rules (detailed design lands with the compliance iterations, 7–9):**
> 1. **No raw PII outside the vault** — not in event payloads, projections, search indexes, logs, or
>    metrics; only tokens/ciphertext. (A `guardrails.sh` "no-PII-in-events" check is added once the
>    PII field inventory exists.)
> 2. **Backups must honour erasure** — a backup that can resurrect a destroyed key or pre-shred PII
>    defeats the right. Key retention ≤ backup retention, and key destruction propagates to
>    replicas/caches.
> 3. **Projections re-derivable from tokenized events alone** — a read-model rebuild after erasure
>    must never need the purged PII.
> 4. **Maintain a PII field inventory + data-residency map** (which vault, which region) — the single
>    artifact the access-audit and residency requirements both read from.
>
> *Scope:* this fixes the **architecture**. The PII field inventory, key-management/rotation design,
> retention windows, and backup-expiry mechanics are detailed designs to produce — and validate with
> legal/DPO — at the **start of iterations 7–9**, before any of this is built.

## 4. Security depth *(spec `06 §5.4`, `07 §4.6`)*

Engineering-surface hardening is in RB-10 §8. The platform commitments:

- **In transit:** TLS 1.3 minimum. **At rest:** AES-256. **BYOK** via KMS for tenants that require it.
- **Identity:** MFA for admins; **WebAuthn / passkeys**; **conditional access** (IP allow-list,
  device, geo, time-of-day).
- **Assurance:** annual penetration test + bug bounty; dependency/security scanning in CI (RB-10 §9).
- **Certification roadmap:** SOC 2 Type 2 + ISO 27001 targeted at **iteration 19**.

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

**Target infrastructure** *(spec `07 §2.4, §4.7`)*: AWS — ECS/EKS, RDS (Multi-AZ), ElastiCache
(Redis) for cache + AI response cache, S3 + CloudFront, Secrets Manager, ECR; **Terraform** IaC;
**OpenTelemetry → CloudWatch / Grafana / Prometheus**. Current local stack is Docker Compose
(RB-10 §9); the gap to AWS is a deliberate, planned step, not an assumption.

---

### What's enforced here
Today: server-side AI, security headers, CORS, rate limiting, dependency scanning → `guardrails.sh`
+ ESLint + CI. **To be added:** the workspace-scope query check (§1) and, as features land, NFR
checks against §5 and AI-budget/audit instrumentation (§2). Until a check exists, these are review
gates — flag them in the PR.
