<!-- GENERATED FROM ai-rules/ — do not edit by hand.
     Edit the source in ai-rules/ and run: node scripts/generate-ai-rules.mjs
     This file is the GitHub Copilot (repo-wide core) view of the same rules. -->

<!-- CANONICAL SOURCE — human- and machine-facing. Per-tool files
     (CLAUDE.md, AGENTS.md, .github/copilot-instructions.md, .cursor/rules/*,
     .windsurfrules) are GENERATED from this orchestrator + the rule books.
     Never hand-edit generated files. See §7. -->

# bSmart Works — Orchestrator

> **Read this first, every task.** It is the control plane: it tells any developer or AI tool
> *what* to do, *why*, *when*, and *how* — and binds each action to the check that enforces it.
> It does not restate the rules; it **routes** to the rule book that owns them.
>
> Version 1.0 · last verified 2026-06-01 · owner: Deepak Pandey

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
| **Every repository query workspace-scoped** | **`guardrails.sh` tenant-scope check — TO BE ADDED (RB-40)** | pre-commit · CI |
| Java style | Checkstyle (currently reporting-mode; flip `failOnViolation=true` once baseline clean) | `./mvnw verify` · CI |
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
  Cap X + Admin Operations Center Cap Y), **17** (Universal Customization Engine Cap R), **19**
  (Enterprise Security + Compliance Certifications Cap T), and the Compliance/Service iterations (7–9).
- **Flyway high-water mark:** **V57** (`V57__user_locale_and_perf_indexes.sql`; note: V16 was
  skipped, V23 does not exist; V50 is iteration 16's `V50__iteration16_leadership_admin.sql`, V51 is
  iteration 17's `V51__iteration17_customization_engine.sql`, V52 is iteration 19's
  `V52__iteration19_enterprise_security.sql`; V53–V56 are iteration 20's advanced-AI / marketplace /
  knowledge / customer-chat migrations).
- **Next migration:** **`V58__<description>.sql`**. *(Supersedes every stale lower-numbered reference.)*

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
