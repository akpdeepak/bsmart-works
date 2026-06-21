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
- **Flyway high-water mark:** **V116**. (V116 = idx_field_visibility_role_def — indexes the
  field_visibility→role_def foreign key, the join used by the hot field-level-security read-redaction
  path and write resolver; the only prior index on field_visibility was UNIQUE(field_def_id, role_def_id)
  whose leading column does not serve a role_def_id lookup. W1 Field-Level-Security Slice 3; additive,
  forward-only.) (V110–V114 are the Phase-1 PII-vault / crypto-shredding
  migrations — V110 = users.subject_token + subject_data_keys (per-subject envelope-wrapped DEK);
  V111 = users.email_hmac blind index (email tokenization, Slice 2); V112 = customer_users
  subject_token + email_hmac, stakeholder subject_token, and customer_subject_token on
  chat_conversations + customer_feedback_items (Slice 3 — customer/stakeholder subjects + denorm
  tokenization); V113 = field_def.pii flag + work_item_field_value.subject_token (Slice 4b — tenant-
  declared PII custom fields route their text values to the vault); V114 = notifications.actor_id
  (Slice 4c — watcher/mention notification messages stored name-free, actor name resolved at render).
  V115 = users.tokens_valid_after + customer_users.tokens_valid_after (token-version JWT revocation,
  W1 rate-limit/JWT PR1 — a nullable per-subject cutoff; a token is rejected when its iat predates it;
  bumped on erase / password change / reset, with customer-portal parity).
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
- **Next migration:** **`V117__<description>.sql`**. *(Supersedes every stale lower-numbered reference.)*

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
