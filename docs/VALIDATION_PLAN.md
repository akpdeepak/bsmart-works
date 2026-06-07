# bSmart Works — Validation Plan (Iterations 1–20)

**Purpose:** Verify that every iteration of bSmart Works — across frontend, backend, integration, AI, customization, and cross-cutting concerns — is actually built **as planned** in the source specs, and drive a disciplined, spec-by-spec refactor where it isn't.

**Source of truth:** `06-Complete-Iteration-Guide.docx` (iterations, use cases, UX/AI/customization notes), `05-Capability-Map-Expansion-v3.5.docx` (AI Control Plane, role surfaces, fallbacks), `07-Tech-Stack-and-Architecture.docx` (Java 21 / Spring Boot 3 / PostgreSQL 16 / Angular-or-React / AWS).

**Approach (as agreed):** two layers.
- **Layer A — Iteration end-to-end validation.** Prove each iteration delivers its promised vertical slice and doesn't regress earlier ones.
- **Layer B — Spec-at-a-time validation + refactor.** Decompose each iteration into individual specs, validate each against the canonical invariants, classify it, and refactor to a high quality bar.

Layer A tells you *where* the problems are. Layer B *fixes* them, one spec at a time, with the reusable prompt in `REFACTOR_PROMPT.md`.

---

## 0. What "working per the plan" means

A spec is only "working as planned" when it passes on **all six dimensions** below. Functional-only validation is the most common failure mode of AI-assisted builds — it produces software that demos but violates the architecture.

| # | Dimension | The question it answers |
|---|-----------|--------------------------|
| 1 | **Functional** | Do the iteration's documented use cases actually work, end to end? |
| 2 | **Architectural** | Does it honor the 5 commitments and 7 unification layers? |
| 3 | **Experiential** | Does it match the UI/UX principles, brand system, and accessibility bar? |
| 4 | **Non-functional** | Does it meet performance, security, privacy, observability, and cost targets? |
| 5 | **AI behavior** | Does it respect the AI Control Plane and its documented OFF-state fallback? |
| 6 | **Scope fidelity** | Is it the spec — no missing sub-features, and no un-planned gold-plating? |

---

## 1. The canonical invariants (the rulebook for every check)

These are non-negotiable and apply to **every spec in every iteration**. They are the spine of both validation layers. Any violation is a defect regardless of whether the feature "works."

### 1.1 The five architectural commitments
1. **Compliance is a first-class primitive** — rules, violations, audit log, dashboards are foundational; every project auto-inherits workspace compliance rules.
2. **SLA is one engine, two contexts** — the *same* engine powers internal delivery SLAs and external customer SLAs. No second system.
3. **Configuration without code** — every behavior is admin-configurable via UI (workflows, fields, rules, automations, KPIs, dashboards). Code extension only for genuinely novel logic; the bar is high.
4. **Privacy by design at every layer** — individual data private by default; team metrics aggregated; manager views cannot drill into individuals — **enforced at the API, not just the UI.**
5. **Event-sourced from day one** — every state change is an immutable event; audit log is automatic; projections rebuild deterministically.

### 1.2 The seven unification layers
1. **Data** — one append-only event store. New capabilities write events and read projections; they never own private tables.
2. **Identity** — one user, one permissions model across web, mobile, API, IDE, command bar. Field-level security defined once, enforced everywhere.
3. **Query** — **WIQL is the one query language** across filters, automations, compliance rules, KPI definitions, dashboards. Natural-language→WIQL is the only AI surface on it.
4. **AI orchestration** — one service powers every AI feature: single budget, single audit trail, single fallback policy.
5. **Customization** — one configuration framework: same versioning, sandbox, rollback, import/export across all configurable surfaces.
6. **Knowledge** — one repository, linkable from everywhere; one RAG index.
7. **UI** — one design system. Role surfaces are layout *configurations* over shared components, **not separate apps.**

### 1.3 Production-grade attributes (sampled per iteration, fully audited at gates)
- **Reliability:** event-sourced, idempotent operations, fail-closed defaults, graceful degradation, append-only tamper-evident audit chain.
- **Scalability:** stateless services, hard multi-tenant isolation (no cross-tenant leakage), read replicas, async for heavy work, CDN static assets.
- **Performance:** meets the stated per-operation latency targets (validate the numbers in the spec, not vibes).
- **Security:** AES-256 at rest, TLS 1.3+ in transit, BYOK option, MFA for admins, conditional access, dependency + pen scanning in CI.
- **Privacy:** data minimization, per-field/per-role server-enforced security, layered KPI privacy, GDPR/DPDP export + erasure.
- **Observability:** OpenTelemetry tracing, structured logs with correlation IDs, per-operation metrics, in-product status page.
- **Cost:** per-workspace AI budget tracking, slow-query flagging, storage tiering, caching, per-customer cost attribution.

### 1.4 The AI Control Plane contract (gates iterations 10+ and every AI surface)
- **Four-level scope hierarchy** (workspace → capability → user → in-context). Most-restrictive wins; admin cannot force AI on for a user who opted out; AI cannot turn AI off.
- **Fallback contract:** every AI feature has a documented deterministic fallback and the product never breaks when AI is off — it degrades.
- **When AI is OFF:** AI buttons are *hidden, not dimmed*; all CRUD, board ops, sprints, search (full-text + WIQL), compliance, SLA, KPI, dashboards (sans narrative), integrations, automations, customizations still work.
- **Cost discipline:** every call logged with tokens + cost; 80% budget → degrade model tier; 100% → auto-disable with explicit admin override; per-user rate limits; response caching.

### 1.5 Brand & UX guardrails
- Single accent (Works Orange) used sparingly; Navy + neutrals carry ~90% weight. Two button variants only. Cards 8px radius, 16–24px padding. Inter / JetBrains Mono. Lucide icons (1.5px). 4px spacing base.
- One primary action per screen; three-click rule; skeleton loading (not spinners); optimistic UI with revert; undo for destructive actions; **WCAG 2.2 AA**, keyboard-only nav, Cmd-K everywhere, color never the only signal.

> **Known spec drift to reconcile first:** the Iteration Guide (doc 06) places the **AI Control Plane in iteration 10** and role surfaces in iterations 14–16; the v3.5 expansion (doc 05) labels the AI Control Plane and role surfaces as **"iteration 19."** Lock the canonical iteration numbering **before** validating, and record the decision. Validating against an ambiguous map produces false defects.

---

## 2. Iteration map (validation scope)

Each iteration is a vertical slice. Validation runs **in iteration order 1→20**, because every iteration is specified to build on all prior ones "without rework" — that claim is itself a thing to test.

| It. | Theme | Primary layers to validate |
|----|-------|----------------------------|
| 1 | MVP: workspace, projects, work items, Kanban (no AI) | BE (event store, domain), FE (board), data |
| 2 | Scrum: sprints, backlog, sprint reports, links, saved filters | BE, FE, reporting |
| 3 | Custom fields, role permissions, workflows, **WIQL** | BE, customization, query, security |
| 4 | PM artifacts: RAID, decisions, meeting notes | BE, FE, data models |
| 5 | Knowledge base + releases | BE, FE, knowledge layer |
| 6 | Dashboards & reports (+ scheduled delivery, exports) | FE, BE, reporting · **Phase gate 1** |
| 7 | **Compliance engine** (differentiator) | BE, rules engine, audit |
| 8 | **SLA engine — internal** | BE, SLA engine, business-hours calc |
| 9 | **Customer portal + external SLA** (sellable line) | FE (portal), BE, integration · **Phase gate 2** |
| 10 | **AI Control Plane** + NL→WIQL + summarization | AI orchestration, fallbacks, cost |
| 11 | Broad AI expansion across capabilities | AI, every capability surface |
| 12 | Performance/KPI metrics with privacy layers | BE, privacy (API-enforced), FE · **Phase gate 3** |
| 13 | Automations & integrations (GitHub, Slack, email, calendar) | Integration, automation builder |
| 14 | Developer Workspace + IDE extension | FE, integration, AI |
| 15 | Scrum Master Cockpit + Product Owner Workspace | FE (role surfaces), AI |
| 16 | Leadership Console + Admin Ops Center | FE (role surfaces), AI, admin |
| 17 | Configuration framework (templates, sandbox, versioning) | Customization layer |
| 18 | Mobile, offline, real-time, performance, Cmd-K · **Phase gate 4** | Mobile FE, real-time, perf |
| 19 | Enterprise security (BYOK, residency, SOC2/ISO, anomaly) | Security, compliance |
| 20 | Multi-step AI agents, marketplace, localization, accessibility, polish | AI, platform, a11y, i18n |

---

## 3. Status taxonomy (how every spec is labeled)

Use one label per spec. This is the vocabulary both layers and all reports share.

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ **Pass** | Meets spec on all six dimensions | None |
| 🟡 **Partial** | Functionally present, fails ≥1 non-functional/architectural dimension | Refactor (Layer B) |
| 🔵 **Drift** | Implemented, but differs from spec (different behavior/shape/naming) | Reconcile: fix code, or update spec with sign-off |
| 🔴 **Fail** | Use case does not work | Fix as defect |
| ⚪ **Missing** | Specified but not built | Build to spec |
| 🟣 **Gold-plated** | Built beyond spec / un-planned scope | Remove or get it added to spec |
| ⛔ **Blocked** | Can't validate (dependency, env, data) | Resolve blocker, re-queue |

---

## 4. Layer A — Iteration end-to-end validation

Run this **per iteration**, in order. Goal: prove the slice and protect everything beneath it.

### 4.1 Procedure
1. **Confirm the contract.** List the iteration's documented features, use cases, UX notes, AI notes, customization points, and time estimate from doc 06/05. This is the acceptance set.
2. **Run the use cases as acceptance scenarios.** Each documented use case (e.g. *"Team lead runs daily standup looking at the Kanban board — no separate tool needed"*) becomes a scripted end-to-end test. Pass/fail is binary.
3. **Verify the "now you can…" value statement** — the thing the user couldn't do before this iteration, can they now?
4. **Vertical-stack check.** Confirm the slice spans its real layers (event → projection → API → UI → AI surface where applicable) rather than faking a layer.
5. **Invariant spot-check.** Sample §1 invariants relevant to this iteration (every iteration: event-sourcing + identity + UI design system; iteration 3+: WIQL; 7+: compliance; 8+: SLA engine reuse; 10+: AI Control Plane).
6. **Regression gate.** Re-run the acceptance scenarios of **all prior iterations.** The spec's "builds on prior without rework" claim is void if iteration N breaks iteration N-3.
7. **Score the iteration** on the six dimensions; produce an **Iteration Scorecard** (template §7.2) and a ranked defect list feeding Layer B.

### 4.2 Phase gates (hard stops)
The spec phase-gates at iterations **6, 9, 12, 18.** No iteration past a gate is validated until the gate iteration is green on Functional + Architectural + the gate's headline differentiator:
- **Gate 1 (it. 6):** foundation + reporting solid; event store is the single source; design system consistent.
- **Gate 2 (it. 9):** sellable line — compliance, internal+external SLA on one engine, customer portal isolation.
- **Gate 3 (it. 12):** AI Control Plane fallback contract holds; KPI privacy is **API-enforced** (the headline test: a manager API call cannot retrieve individual data).
- **Gate 4 (it. 18):** mobile/offline/real-time + performance targets met under load.

### 4.3 Output of Layer A
- One **Iteration Scorecard** per iteration.
- A consolidated **Iteration 1–20 Heatmap** (iteration × dimension, colored by status).
- A prioritized backlog of specs needing Layer B, risk-ranked (§6).

---

## 5. Layer B — Spec-at-a-time validation + refactor

This is where quality is enforced. Drive it with the **spec-at-a-time refactor prompt** in `REFACTOR_PROMPT.md`.

### 5.1 What counts as "one spec"
The atomic unit you validate + refactor in a single run. Pick the granularity that keeps a run reviewable in one sitting (≈ one PR):
- A **layer-slice of an iteration** — e.g. *"Iteration 3 — backend: custom fields + permissions + workflow engine"*, or *"Iteration 9 — customer portal frontend."*
- A **single capability or sub-feature** when a slice is still too big — e.g. *"WIQL parser,"* *"SLA business-hours calculator,"* *"AI fallback for standup helper."*

Smaller is better: tighter diffs, cleaner review, lower blast radius.

### 5.2 Per-spec procedure — a closed, self-correcting loop

Each spec runs through six phases that go from *reading the spec* all the way to *merged-and-validated on main*, looping until the expected result is met. The reusable **Prompt B** in `REFACTOR_PROMPT.md` executes exactly this.

1. **Phase 0 — Study the spec.** Read the spec slice in full; restate it as explicit + implied (invariant) testable requirements; flag any ambiguity or cross-doc contradiction and stop-and-ask if it's architecture-level.
2. **Phase 1 — Read & analyse the repo (GitHub).** Read *everything*, not just code: architecture docs, ADRs, plan files, OpenAPI/contracts, DB migrations + event schema, config, IaC, CI/CD, existing tests, lint configs, dependency manifests, CODEOWNERS, branch protection. Map the current implementation and the conventions already in use; identify which prior iterations/shared layers this spec depends on.
3. **Phase 2 — Holistic decomposition.** Take a whole-system view (how it fits the 7 layers), then break the spec into the **smallest independently buildable + testable pieces** (one event type, one projection, one endpoint, one permission rule, one WIQL predicate, one component, one AI-fallback path). Order them by dependency; each piece = one small reviewable diff.
4. **Phase 3 — Design the target.** For each piece, before coding, define — grounded in the requirements, current best practices for the stack, and the tools already in the repo — *how it should work* (acceptance criteria + edge cases), *how it should be built* (invariant-honoring design + any schema/event/migration impact), and *how it should be validated* (the exact tests/checks, written test-first where practical).
5. **Phase 4 — Execution loop (per piece, on a feature branch):**
   **build → test → deploy → validate → merge to main → post-merge validate.**
   - *Build* in small commits; behavior-preserving unless spec says behavior was wrong (Drift/Fail); no gold-plating.
   - *Test*: full relevant suite green (unit, integration w/ Testcontainers, contract, E2E, AI-off, privacy, multi-tenant, a11y, perf, security scan).
   - *Deploy* the branch to the target env; run migrations forward; confirm healthy.
   - *Validate* against the deployment: acceptance + non-functional + invariants hold at runtime; capture evidence.
   - *Merge* to main **only on all-green + green CI + no conflicts**, respecting branch protection (pause for human approval if required). Never merge red.
   - *Post-merge validate*: deploy from main, re-run this piece's acceptance + the iteration regression + prior-iteration regression.
   - *Self-heal*: on any failure, diagnose **root cause** (not symptoms), fix, re-run from the failed step; record each attempt.
6. **Phase 5 — Converge.** Repeat Phase 4 for every piece until all are merged-and-validated; run the spec's full acceptance + iteration regression once more on main. **The loop continues until the exit criteria (§5.5) are met.**

### 5.5 Exit criteria & loop bounds (when a spec is "done")
A spec is done only when **all** of these hold: every documented use case passes on a deployment *from main*; all six dimensions green; every applicable invariant verified at runtime; full test+scan suite green in CI on main; no regression to iterations 1..N-1; all changes merged; traceability rows = ✅ Pass (or signed-off Drift).

The loop is **bounded on purpose**: max ~5 self-heal attempts per piece on the same root cause, then stop-and-escalate with a diagnosis. **Weakening or skipping tests to force green is prohibited** — convergence means real green, never fake green.

### 5.3 Layer checklists (the per-spec rubric)

**Backend / domain**
- Canonical vocabulary exactly (`WorkItem`, `Project`, `Workflow`, `ComplianceRule`, …) — naming is an invariant, not taste.
- All state changes go through the event store; append-only; projections rebuild deterministically; no capability-private write tables.
- Operations idempotent; APIs safe to retry; no double-effects.
- Permissions + field-level security enforced **server-side**; fail-closed on uncertainty.
- WIQL used wherever a query/filter/rule/KPI/dashboard predicate appears (iter 3+).
- Transactions correct; errors typed and handled; observability wired (trace, correlation ID, metrics).

**Frontend**
- Design tokens + brand exactly; two button variants; one primary action per screen; two-tier nav; breadcrumbs; tabs.
- Skeleton loading, optimistic UI with revert, toasts auto-dismiss, undo for destructive actions.
- Progressive disclosure; helpful empty states (never blank); three-click rule.
- **WCAG 2.2 AA**; keyboard-only nav; Cmd-K; visible focus; color never the sole indicator; contrast verified light + dark.
- Components from the shared library (one implementation each); role surfaces are configs, not forks.

**Integration**
- Connectors via wizard-guided OAuth; least-privilege scopes.
- Webhooks/email/Slack/calendar/Git flows idempotent with retry + backoff; failures observable.
- Inbound external events become canonical work items with correct types (no re-entry, no shadow data).
- Contract tests on every external boundary.

**AI (iter 10+ and any AI surface)**
- Routed through the single orchestration service; Claude called server-side only.
- Respects the four-level scope; obeys most-restrictive; cannot bypass privacy/permission guardrails.
- Documented deterministic fallback exists **and is tested with AI off** (button hidden, feature degrades, nothing breaks).
- Every call logged with tokens + cost; budget caps + tiering + rate limits enforced.

**Cross-cutting / other**
- Multi-tenant isolation proven (cross-tenant access test fails closed).
- Privacy: API-level test that aggregated/manager views cannot return individual rows.
- Security: encryption, MFA, conditional access, BYOK/residency where specified.
- Compliance engine: projects auto-inherit workspace rules; violations + audit logged.
- SLA: confirm the *same* engine serves internal and external — not a duplicate.
- Performance against the spec's stated targets; cost attribution present.

### 5.4 Sequencing within an iteration
Validate/refactor in dependency order so fixes don't get re-broken:
**domain + events → API/permissions → WIQL/query → integrations → frontend → AI surface → cross-cutting (privacy/security/perf/observability).**
Re-run that iteration's regression gate after the last spec.

---

## 6. Risk-based prioritization

Validate everything, but fix in this order — these carry the most structural risk:
1. **Foundation (it. 1–3):** event store, identity/permissions, WIQL. Everything stacks on these; a defect here multiplies.
2. **Differentiators (it. 7, 8, 9, 10, 12):** compliance, SLA single-engine, portal isolation, AI Control Plane, API-enforced privacy. These are the strategic bets and the things customers/regulators will test.
3. **Event-sourcing + multi-tenant isolation** wherever they appear — silent violations here are the most expensive to unwind later.
4. Everything else by user-facing impact.

---

## 7. Tooling & evidence

### 7.1 Test/scan stack (map to the doc-07 stack)
- **Unit** (JUnit) + **integration with Testcontainers** (real PostgreSQL) — already recommended in doc 07.
- **Contract tests** (Spring Cloud Contract / Pact) on every API and integration boundary.
- **E2E** (Playwright/Cypress) scripting each iteration's documented use cases.
- **Event-store replay tests** — rebuild projections from events; assert determinism.
- **WIQL conformance suite** — one query exercised across filter/automation/rule/KPI/dashboard to prove single-language reuse.
- **AI-off matrix** — every AI feature toggled off at each of the four scope levels; assert fallback + hidden buttons.
- **Privacy enforcement tests** — manager/aggregate API calls must not return individual rows.
- **Multi-tenant isolation tests** — tenant A cannot read tenant B by any path.
- **Accessibility** (axe) for AA; **security** (OWASP ZAP + Snyk/dependency scan in CI); **performance** (k6/Gatling vs stated targets).

### 7.2 Iteration Scorecard (Layer A template)
```
Iteration N — <theme>
Acceptance use cases: <pass>/<total>
"Now you can…" value delivered:   ✅ / 🔴
Dimension scores:
  Functional      ✅ / 🟡 / 🔴
  Architectural   ✅ / 🟡 / 🔴   (invariants checked: …)
  Experiential    ✅ / 🟡 / 🔴
  Non-functional  ✅ / 🟡 / 🔴
  AI behavior     ✅ / 🟡 / 🔴 / n-a
  Scope fidelity  ✅ / 🟣
Regression on prior iterations:   ✅ / 🔴 (list breaks)
Phase gate (if applicable):       PASS / HOLD
Top defects → Layer B:            [ranked list]
```

### 7.3 Traceability matrix (Layer B ledger — keep as `traceability.csv`)
```
spec_id | iteration | layer | spec_ref (doc/section) | impl_artifact | test_ref | dimension_fails | status | severity | owner | PR | notes
```
One row per spec. This is the single artifact that answers "is iteration 1–20 working per the plan?" — when every row is ✅ Pass, you're done.

---

## 8. How the two layers run together

```
For each iteration 1 → 20 (respecting phase gates):
   Layer A: run end-to-end acceptance + regression   → Iteration Scorecard + defect backlog
   Layer B: for each spec in dependency order (Prompt B closed loop):
              study spec → analyse repo/GitHub → decompose to smallest pieces → design target
              for each piece:
                 loop { build → test → deploy → validate → merge to main → post-merge validate }
                 self-heal on failure (root cause); bounded retries; never fake green
              converge until exit criteria met
   Re-run Layer A regression for this iteration        → confirm green
   At gates 6/9/12/18: hard stop until gate criteria pass
Maintain: Iteration Heatmap + traceability.csv as living status
```

**Done definition for the whole effort:** every iteration scorecard is green on Functional + Architectural + AI + Scope; every traceability row is ✅ Pass or an explicitly signed-off Drift; all four phase gates passed; CI runs the full test/scan stack on every change.

---

*Companion file: `REFACTOR_PROMPT.md` — the two reusable prompts (iteration end-to-end, and spec-at-a-time refactor) that operationalize this plan.*
