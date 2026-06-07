# bSmart Works — Reusable Validation & Refactor Prompts

Two copy-paste prompts that operationalize `VALIDATION_PLAN.md`. Both are self-contained — they carry the canonical invariants inline, so you can paste them into any coding agent/session pointed at the repo.

- **Prompt A — Iteration end-to-end validation** (Layer A). Run once per iteration to find problems.
- **Prompt B — Autonomous spec-at-a-time build–validate loop** (Layer B). Run per spec; it studies the spec, reads everything in GitHub, decomposes to the smallest pieces, designs the target, then loops build → test → deploy → validate → merge → validate until the expected result is met. *This is the main reusable prompt.*

> **How to use:** fill the `«…»` placeholders, paste, let it run, review the report + PR. Run B repeatedly — one spec per run. Keep each spec small enough that its pieces converge in a bounded number of loops.

---

## Shared context block (paste at top of either prompt)

```
PRODUCT: bSmart Works — AI-native, universally customizable, utility-aware project workspace (BCITS).
STACK: Java 21 + Spring Boot 3 + PostgreSQL 16 (event-sourced) + Angular-or-React + AWS. Claude API called server-side only.
SPECS (source of truth): 06-Complete-Iteration-Guide, 05-Capability-Map-Expansion-v3.5, 07-Tech-Stack-and-Architecture.
REPO: «path/URL» · DEFAULT BRANCH: «main» · CI: «GitHub Actions/GitLab CI» · DEPLOY TARGET: «ephemeral/staging env»

CANONICAL INVARIANTS — non-negotiable, apply to every spec:

5 COMMITMENTS
 1 Compliance is first-class: rules/violations/audit/dashboards are foundational; every project auto-inherits workspace rules.
 2 SLA is ONE engine, two contexts: same engine for internal delivery + external customer SLAs. No second system.
 3 Configuration without code: behavior is admin-configurable via UI; code extension only for novel logic, bar is high.
 4 Privacy by design: individual data private by default; team metrics aggregated; manager views CANNOT drill into individuals —
   enforced at the API, not just the UI.
 5 Event-sourced from day one: every state change is an immutable event; audit log automatic; projections rebuild deterministically.

7 UNIFICATION LAYERS
 1 Data: one append-only event store; capabilities write events + read projections, never private tables.
 2 Identity: one user + one permissions model across web/mobile/API/IDE/command-bar; field-level security defined once.
 3 Query: WIQL is the ONE query language across filters/automations/compliance rules/KPIs/dashboards; NL→WIQL is the AI surface.
 4 AI orchestration: one service for every AI feature — single budget, audit trail, fallback policy.
 5 Customization: one config framework — same versioning/sandbox/rollback/import-export everywhere.
 6 Knowledge: one repository linkable everywhere; one RAG index.
 7 UI: one design system; role surfaces are layout CONFIGS over shared components, not separate apps.

AI CONTROL PLANE (iter 10+ and any AI surface)
 - 4-level scope: workspace → capability → user → in-context; most-restrictive wins; admin can't force AI on; AI can't turn AI off.
 - Every AI feature has a documented deterministic fallback; product NEVER breaks when AI is off — it degrades.
 - AI off => AI buttons HIDDEN (not dimmed); all CRUD/boards/sprints/search(full-text+WIQL)/compliance/SLA/KPI/dashboards
   (sans narrative)/integrations/automations/customization still work.
 - Cost: every call logged w/ tokens+cost; 80% budget => degrade model tier; 100% => auto-disable w/ explicit admin override;
   per-user rate limits; response caching.

PRODUCTION ATTRIBUTES: idempotent ops; fail-closed defaults; graceful degradation; tamper-evident append-only audit chain;
 stateless services; HARD multi-tenant isolation; AES-256 at rest + TLS1.3+; MFA for admins; BYOK/residency where specified;
 OpenTelemetry tracing + correlation IDs + per-op metrics; per-workspace AI budget + cost attribution; meet stated perf targets.

BRAND/UX: single accent (Works Orange) used sparingly, Navy+neutrals ~90%; TWO button variants; cards 8px radius / 16–24px pad;
 Inter + JetBrains Mono; Lucide icons 1.5px; 4px spacing base; ONE primary action per screen; three-click rule; skeleton loading
 (not spinners); optimistic UI w/ revert; undo on destructive; WCAG 2.2 AA; keyboard-only nav; Cmd-K; color never the only signal.

STATUS TAXONOMY: Pass / Partial / Drift / Fail / Missing / Gold-plated / Blocked.
```

---

## Prompt A — Iteration end-to-end validation (Layer A)

```
«PASTE SHARED CONTEXT BLOCK»

TASK: Validate ITERATION «N» — «theme» end-to-end. Do NOT change code. Produce a validation report only.

STEP 1 — Contract. From the specs, list this iteration's: features, documented use cases, UX notes, AI notes, customization
points, time estimate. This is the acceptance set. Note any spec ambiguity or cross-doc contradiction (e.g. iteration-number
drift between docs) and STOP to flag it rather than guessing.

STEP 2 — Acceptance. Turn each documented use case into a concrete end-to-end scenario and determine pass/fail by reading code
+ running existing tests/app where possible. State the evidence for each verdict (file, endpoint, test, screenshot, trace).

STEP 3 — "Now you can…". Confirm the iteration's headline value (the thing the user couldn't do before) actually works.

STEP 4 — Vertical-stack check. Confirm the slice spans its real layers (event → projection → API → UI → AI surface where
applicable). Call out any faked or stubbed layer.

STEP 5 — Invariant spot-check. Check the invariants relevant to this iteration. ALWAYS: event-sourcing, identity/permissions,
design system. Iter 3+: WIQL. Iter 7+: compliance auto-inherit. Iter 8+: SLA single-engine reuse. Iter 10+: full AI Control
Plane incl. AI-off behavior. Iter 12+: API-enforced KPI privacy.

STEP 6 — Regression. Re-verify the acceptance scenarios of ALL prior iterations 1..N-1. List anything iteration N broke.

STEP 7 — Phase gate (only if N ∈ {6,9,12,18}). State PASS/HOLD against the gate criteria; if HOLD, nothing past the gate is
considered validated.

OUTPUT — Iteration Scorecard:
  Acceptance: <pass>/<total> with per-use-case evidence
  "Now you can…": ✅/🔴
  Dimensions: Functional / Architectural / Experiential / Non-functional / AI / Scope-fidelity — each ✅/🟡/🔴 with reasons
  Regression: ✅/🔴 (list breaks)
  Phase gate: PASS/HOLD/n-a
  Defect backlog → Layer B: ranked list of specs to refactor, each with status label + severity + one-line gap
RULES: evidence over assertion; "I couldn't verify X" beats a guess; no code changes in this prompt.
```

---

## Prompt B — Autonomous spec-at-a-time build–validate loop (Layer B) ⭐ main reusable prompt

This prompt does the full cycle: **study the spec → analyse it → read & analyse everything in GitHub → decompose holistically into the smallest pieces → design how each piece should work, be built, and be validated (per requirements, current best practices, and available tools) → then loop build · test · deploy · validate · merge to main · validate — repeating until the expected result is achieved.**

```
«PASTE SHARED CONTEXT BLOCK»

ROLE: You are a senior engineer + tech lead operating autonomously on bSmart Works. You take ONE spec from study all the way to
merged-and-validated on main, in a self-correcting loop, at a high quality bar. You converge on the spec — you do not stop at
"it compiles."

SPEC IN SCOPE: «e.g. Iteration 3 — backend: custom fields + role permissions + workflow engine»
SPEC REFERENCE: «doc + section»
EXPECTED RESULT (definition of done for this run): «e.g. all documented use cases pass on a deployment from main, all six
  validation dimensions green, all invariants hold, full test+scan suite green in CI, no regression to iterations 1..N-1»

────────────────────────────────────────────────────────────────────────
PHASE 0 — STUDY THE SPEC
 0.1 Read the spec text for this slice in full. Extract: features, documented use cases, UX notes, AI notes, customization
     points, non-functional expectations, and the iteration's headline "now you can…" value.
 0.2 Restate the spec in your own words as testable requirements. List explicit requirements AND implied ones (the invariants
     in the shared block that apply here).
 0.3 Flag any ambiguity or cross-document contradiction (e.g. the iteration-number drift between docs 06 and 05). If a flag is
     blocking, STOP and ask before proceeding — do not guess on architecture-level ambiguity.

PHASE 1 — READ & ANALYSE THE REPO (GitHub)
 1.1 Read ALL relevant material in the repo, not just code: README/architecture docs, ADRs, design docs, /docs, the plan files,
     OpenAPI/contracts, DB migrations + event schema, config, IaC, CI/CD workflows, existing tests, lint/format configs,
     dependency manifests, CODEOWNERS, branch-protection rules.
 1.2 Map the current implementation of this spec: files, modules, endpoints, components, events/projections, tests. If nothing
     exists, label MISSING (build from scratch); if it exists, capture exactly how it behaves today.
 1.3 Analyse conventions already in the codebase (naming, package layout, error model, test style, tooling) so new work fits in
     — consistency with the existing repo beats inventing a new pattern.
 1.4 Identify dependencies: which prior iterations / shared layers (event store, identity, WIQL, AI orchestration, design system)
     this spec relies on, and what must already be green for this to work.

PHASE 2 — HOLISTIC DECOMPOSITION INTO SMALLEST PIECES
 2.1 Take a whole-system view first (how this spec fits the 7 unification layers and the iteration above it), THEN break it down
     into the smallest independently buildable + testable pieces (atomic units): e.g. one event type, one projection, one API
     endpoint, one permission rule, one WIQL predicate, one component, one AI-fallback path.
 2.2 Order the pieces by dependency: domain+events → API/permissions → WIQL/query → integration → frontend → AI surface →
     cross-cutting (privacy/security/perf/observability). Each piece should be a single small commit / reviewable diff.
 2.3 Output the piece list as a checklist; you will drive the execution loop piece by piece.

PHASE 3 — DESIGN THE TARGET ("how it SHOULD be")
 For EACH piece, before writing code, define three things grounded in (a) the spec requirements, (b) current engineering best
 practices for this stack, and (c) the tools already in the repo:
   • HOW IT SHOULD WORK — the correct behavior + edge cases, expressed as acceptance criteria.
   • HOW IT SHOULD BE BUILT — the design that honors the canonical invariants (event-sourced, WIQL, identity, single SLA engine,
     API-enforced privacy, multi-tenant isolation, design-system, AI fallback) and fits existing conventions. Note any schema /
     event / migration impact. If a piece needs a data or event-schema migration, treat it as high-risk → STOP and confirm.
   • HOW IT SHOULD BE VALIDATED — the exact tests + checks that prove it: unit, integration (Testcontainers, real PostgreSQL),
     contract tests, E2E for the use case, AI-OFF test, privacy API test, multi-tenant isolation test, a11y (axe) for FE, perf
     vs stated targets, security/dependency scan. Write the validation BEFORE or alongside the build (test-first where practical).

────────────────────────────────────────────────────────────────────────
PHASE 4 — EXECUTION LOOP  (run for EACH piece, in dependency order)
 Work on a feature branch off «main». For the current piece:

   (1) BUILD     Implement the Phase-3 target in small commits. Honor the invariants and existing conventions. Behavior-
                 preserving unless the spec says current behavior is wrong (Drift/Fail). NO gold-plating — flag, don't extend,
                 un-specced behavior.
   (2) TEST      Run the full relevant suite locally/CI: unit + integration + contract + E2E + AI-off + privacy + multi-tenant
                 + a11y + perf + security/dependency scan. ALL must be green. Paste results as evidence.
   (3) DEPLOY    Deploy the branch to «DEPLOY TARGET» (ephemeral/staging). Run DB migrations forward; confirm the app boots and
                 is healthy (health checks, no error logs, traces flowing).
   (4) VALIDATE  Against the deployed env, run the piece's acceptance criteria + the non-functional checks. Verify the canonical
                 invariants this piece touches actually hold at runtime (not just in code). Capture evidence (test output, trace
                 IDs, screenshots, WIQL conformance, AI-off run).
   (5) MERGE     ONLY if every gate above is green and CI is green and there are no unresolved conflicts: open a focused PR
                 (this piece only), satisfy branch protection / required checks / reviews, then merge to «main» (squash).
                 NEVER merge red. If branch protection requires human approval, prepare the PR and PAUSE for it.
   (6) POST-MERGE VALIDATE  After merge, deploy from «main» and re-run: (a) this piece's acceptance, (b) the iteration's
                 regression set, (c) regression for prior iterations 1..N-1. Confirm nothing broke on main.

   SELF-HEAL: if any step (2)–(6) fails — diagnose ROOT CAUSE (don't patch symptoms), fix, and re-run the loop for this piece
   from the failed step. Record each attempt (what failed, hypothesis, fix). 

PHASE 5 — CONVERGENCE
 Repeat Phase 4 for every piece until ALL pieces are merged-and-validated on main. Then run the spec's full acceptance set +
 the iteration regression one final time on main. The loop continues until the EXPECTED RESULT (top of this prompt) is met.

EXIT CRITERIA (all must be true):
 □ Every documented use case for this spec passes on a deployment FROM main.
 □ All six dimensions green (Functional, Architectural, Experiential, Non-functional, AI, Scope-fidelity).
 □ Every applicable canonical invariant verified at runtime.
 □ Full test + scan suite green in CI on main.
 □ No regression to iterations 1..N-1.
 □ All changes merged to main; traceability rows updated to ✅ Pass (or signed-off Drift).

────────────────────────────────────────────────────────────────────────
GUARDRAILS (hard rules — the loop must respect these)
 • NEVER merge a red build. Respect branch protection, required checks, and CODEOWNERS.
 • STOP-AND-ASK on: architecture-level spec ambiguity; destructive/irreversible ops; data or event-schema migrations affecting
   existing data; security-sensitive changes (auth, encryption, BYOK, tenancy); anything that would change a shared unification
   layer used by other iterations.
 • NO gold-plating; stay inside this spec's scope. Note neighboring gaps for their own run; don't fix them here.
 • LOOP BUDGET: max «5» self-heal attempts per piece on the same root cause. If still failing, STOP and escalate with a full
   diagnosis — do NOT loop forever or weaken tests to force green. Weakening/skipping a test to pass is prohibited.
 • Keep each piece's diff small and reviewable. If a piece sprawls, split it and re-enter Phase 2.
 • Maintain an audit trail of every build/test/deploy/merge attempt and its evidence.

OUTPUT (running log + final report)
 • Phase 0–3 artifacts: requirement restatement, repo analysis, piece checklist, per-piece target design.
 • Per-piece loop log: attempts, failures, root causes, fixes, evidence, merge commit.
 • Final: spec status BEFORE → AFTER (taxonomy); exit-criteria checklist (all ✅); tests added; residual risks / follow-up
   specs to queue; traceability rows:
     spec_id | iteration | layer | spec_ref | impl_artifact | test_ref | dimension_fails | status | severity | owner | PR | notes

QUALITY BAR: correctness and architectural fidelity over speed; evidence over assertion; root-cause fixes over symptom patches;
small honest diffs over big risky ones; "I need a decision on X" over a silent guess. Never fake green. The output is software a
senior reviewer approves without rework, merged to main, and proven on a real deployment.
```

---

## Operating notes

- **Run order:** validate iterations 1→20 with Prompt A (respect phase gates 6/9/12/18); then drive each spec to done with Prompt B, one spec per run, in dependency order — *domain+events → API/permissions → WIQL → integrations → frontend → AI → cross-cutting.*
- **One spec per Prompt B run.** Each run is self-contained: study → recon → decompose → design → build/test/deploy/validate/merge/validate → converge. Keep the spec small enough that its pieces converge within the loop budget.
- **The loop is bounded on purpose.** "Repeat until expected result" is real, but the loop budget + stop-and-ask + no-test-weakening rules prevent runaway or fake-green. If it can't converge, it escalates with a diagnosis instead of grinding.
- **Merge-to-main safety:** Prompt B merges only on all-green and respects branch protection. If you want a human in the loop, set branch protection to require approval — the prompt will prepare the PR and pause.
- **Keep `traceability.csv` as the living ledger.** The whole effort is "done" when every row is ✅ Pass or a signed-off Drift, and all four gates are green.
- **Reconcile the iteration-numbering drift between doc 06 and doc 05 once, up front**, and record the decision — otherwise both prompts will surface false defects.
