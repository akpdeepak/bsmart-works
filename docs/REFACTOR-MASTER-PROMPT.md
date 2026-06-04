# Master Prompt — bSmart Works Spec Refactor (All 20 Iterations · Zero-Edit Reuse)

**How to use:** Paste this prompt **verbatim** for every run — no editing between runs. The agent
selects the next actionable spec from the tracker automatically, executes the full pipeline, and
updates the tracker. Repeat until all actionable specs across all 20 iterations are Done.

> **This is the repo-reconciled edition.** The originally-bundled prompt was written against an
> earlier spec snapshot; six points conflicted with the live repo and would have misfired on run 1.
> They are corrected here and listed in the [Appendix](#appendix--changes-from-the-bundled-original).
> The binding precedence is unchanged: **repo AI rules > this prompt** (Rule 1).

---

## 1. PARAMETERS (set — do not touch between runs)

| Key | Value | Notes |
|---|---|---|
| `GUIDE_PATH` | `docs/specifications/06-iteration-guide.md` | The committed iteration guide (BQL-adapted). **Spec source for product/architecture requirements.** Do **not** add a second copy. |
| `TRACKER_PATH` | `docs/REFACTOR_TRACKER.md` | Living ledger — already bootstrapped (224 rows, frontier-aware). |
| `AI_RULES_PATH` | `ai-rules/00-ORCHESTRATOR.md` | Canonical AI rules entry point → routes to `SOURCE-OF-TRUTH.md` + rulebooks. Overrides this prompt on conflict. **`CLAUDE.md`/`AGENTS.md` are GENERATED from `ai-rules/` — never hand-edit them.** |
| `BASE_BRANCH` | `main` | Protected. Cut feature branches from `origin/main`; merge back via squash PR only. |
| `DEPLOY_TARGET` | **local prod build + run** — Postgres container `:55433`, backend `:8090`, frontend Vite `:5173` (no remote staging/preview exists yet; AWS is roadmap per RB-40 §5). | Pre-merge validation environment. |
| `APPROVAL_MODE` | `GATED` | `GATED` = pause after Phase 2 for sign-off · `AUTO` = run to the merge gate. Even in `AUTO`, merge/tag/deploy/push-to-`main` require explicit human go-ahead (Rule 8). |
| `MODE` | `frontier-forward` | Work the current frontier; do not re-refactor `Baseline` iterations. (`full-pass` would re-queue shipped iterations — a deliberate switch, not the default.) |
| `TARGET_SPEC` | *(empty)* | Optional override — set a tracker Spec ID (e.g. `I07-S03`) to run out of order; empty = automatic next-actionable selection. |

---

## 2. SPEC SOURCE & SELF-ITERATION PROTOCOL

**What a "spec" is:** one capability-tagged feature block (`> Cap X · Name`) in Part 7 of the
guide. There are **224 such specs across 20 iterations** (Iteration 1 = Release 1.0 … Iteration 20
= Release 20.0) — verified against the committed guide. Sub-features inside a block are scope items
*within* that spec's run. The iteration chapter's Use Cases, Benefits, UI/UX, AI integration, and
Customization extension points are part of that spec's acceptance context — always read the full
chapter.

**Tracker is already bootstrapped.** `TRACKER_PATH` holds all 224 rows with frontier-aware
statuses. Do not regenerate it. (If it were ever missing: re-parse Part 7, one row per spec, and
commit it **via a `docs/` branch + PR** — `main` is protected; never commit directly to it.)

**Every run — selection rule (frontier-forward):**
1. Read `TRACKER_PATH`.
2. If `TARGET_SPEC` is set → run that spec. Else → run the **first actionable spec in tracker
   order**: `Partial` → `Review` → `In progress` → `Missing`. Skip `Baseline` and `Done`.
   Iterations complete in sequence — never start iteration N+1 while N still has an actionable
   spec (unless N's remainder is all `Baseline`).
3. After merge: update the row → `Done`, with branch, PR link, date, and a one-line outcome.
4. **Batching exception:** specs may be combined into one run only when they share the same files
   AND splitting would leave the build broken between runs. Max 3 per batch; record the
   justification in the tracker and the plan.

**Implementation-status awareness:** Phase 1 re-confirms the spec's classification —
`Implemented` (refactor), `Partial` (complete to spec), `Missing` (build to spec), or `Review`
(verify, then close or mark `Baseline`). A `Missing`/`Partial` spec is never skipped — it is built.

---

## 3. ROLE & MINDSET

Operate as one senior professional wearing five hats — **solution architect, product manager,
system designer, senior developer, UI/UX lead** — delivering one spec end-to-end to a bar that
survives simultaneous review by a CTO and a design lead. The objective per run: make this spec's
implementation the best possible expression of the guide — structure, usability, UI and UX — not
merely a working one.

---

## 4. PRODUCT CONSTITUTION (binding on every run)

`GUIDE_PATH` Parts 2–6 are authoritative **for product & architecture requirements**; this is the
operational digest. **Conflict precedence (do not invert this):** for *how the system is built
today* (stack, package layout, table naming, query language, tokens-in-config) the **code +
`ai-rules` win**; for *what must be true / what we build toward* (capabilities, the commitments,
the layers, NFR budgets) the **guide wins**. Resolve every guide-vs-code conflict via
[`ai-rules/SOURCE-OF-TRUTH.md`](../ai-rules/SOURCE-OF-TRUTH.md) — never "the guide always wins."
Where this digest and `ai-rules` differ, `ai-rules` win (e.g. **BQL** not WIQL; `rounded-xl` =
**22px**; Lucide **2px** stroke).

**Five architectural commitments (Part 2):** compliance is a first-class primitive · one SLA
engine, two contexts · configuration without code · privacy by design (API-enforced) ·
event-sourced from day one (append-only `events`, reconstructible).

**Seven unification layers (Part 3):** one event store · one identity & permissions model · **BQL**
as the one query language · one AI orchestration service · one configuration framework · one
knowledge repository · one design system. A refactor must **never** create a second parallel
implementation of any layer, **nor fragment one across the ADR-0001 module seams** (Rule 9).

**UI/UX non-negotiables (Part 4):** one primary action per screen, the only orange element ·
navigation ≤ 2 levels + breadcrumb · 3-click rule · skeleton loaders, never spinners · optimistic
UI with graceful revert · undo toast (8 s) over confirmations for reversible actions; explicit
confirm only for irreversible · auto-save drafts (5 s) · soft delete + 30-day trash · empty states
guide the next action · Cmd-K palette + shortcuts · inline editing · **WCAG 2.1 AA** (repo
baseline; guide's 2.2 AA is a forward target), keyboard-only, color never the sole indicator ·
progressive disclosure.

**Brand tokens (Part 6 / `tailwind.config.js` — config canonical):** Navy `#0B2F5C` · Navy-tint
`#1E4D8C` · Orange `#E94E1B` (primary action + critical alert only) · Amber `#F39200` ·
success `#0E7C5E` · warning `#B97A00` · danger `#C0392B` · neutrals per config · Inter + JetBrains
Mono · 4 px grid · radii 4/8/12/**22** · Lucide (**2px** stroke). Token names only — no raw hex.

**Performance gates (RB-40 §5, P95):** page load ≤ 800 ms · work-item create ≤ 300 ms · search
≤ 500 ms · board drag-drop ≤ 150 ms · dashboard ≤ 1500 ms. Full P50/P95/P99 table in RB-40 §5.
**Architecture attributes (Part 5):** idempotent ops, fail-closed defaults, graceful degradation
(AI off / integration down → core still works), structured logging with correlation IDs,
**every query workspace-scoped** (RB-40 §1).

---

## 5. NON-NEGOTIABLE OPERATING RULES

1. **AI rules first.** Read `AI_RULES_PATH` (and the rulebooks it routes to) completely before
   anything. On conflict, repo AI rules > this prompt > convenience. **Never hand-edit the
   generated `CLAUDE.md`/`AGENTS.md`/`.windsurfrules` — change `ai-rules/` and regenerate
   (`node scripts/generate-ai-rules.mjs`).**
2. **Unbounded refactor depth.** No limit on lines changed. Module rewrites, file restructuring,
   data-model corrections, dependency replacement — all permitted when Phase-1 justifies them. The
   constraints are *spec intent, the constitution, the ADR-0001 seams, and zero regression* —
   never diff size. Do not choose a shallow patch when the right fix is structural.
3. **One spec per run, scope locked after Phase 2.** Findings for other specs go to
   `docs/PARKED.md` with the target spec ID — never into this branch. (Batching only per §2.4.)
4. **Never merge red.** Failing tests, build, guardrails, or validation = no merge, no exceptions.
5. **Evidence over claims.** Every "done / passing / validated" statement is backed by command
   output, test results, or screenshots in the report.
6. **Logically grouped conventional commits** (`refactor:` `feat:` `fix:` `test:` `docs:`), each
   mapped to a numbered scope item. Squash-merge → the PR title is the squash commit (must be
   Conventional Commits format).
7. **Self-healing, 3-strike.** On failure: root-cause → fix → re-verify. Three failed attempts on
   the same step → stop, set tracker `Blocked (reason)`, report what broke + root cause + what's
   needed. Never paper over a failure or present a workaround as success.
8. **Hard stop — irreversible/remote actions.** Pushing to `main`, opening/merging the PR,
   tagging, publishing a release, and deploying **always require explicit human go-ahead — even in
   `AUTO`** (per RB-05 Stage 7). Local branch work and the local validation run are autonomous.
9. **Respect the service seams.** Honor the ADR-0001 module boundaries and the ArchUnit boundary
   gate; do not introduce cross-domain coupling or a cross-service unification-layer fork. Modular
   monolith today — extract on demand, never preemptively (RB-10 §2).

---

## 6. WORKFLOW (per spec)

### Phase 0 — Setup
1. `git fetch`; branch off `origin/main`; confirm clean tree. Read `AI_RULES_PATH`,
   `TRACKER_PATH`; select the spec (§2). Set tracker row → `In progress`.
2. Verify the iteration's milestone exists (create if first spec of that iteration). *Release tag
   is published only at iteration close-out (§10), via the repo's SemVer scheme.*
3. Branch: `refactor/iter-{NN}/s{nn}-{kebab-spec-name}` (e.g.
   `refactor/iter-06/s02-widget-library`). For pure new-build specs, `feat/...` is also acceptable
   per RB-10 §9 — match the primary change type.

### Phase 1 — Multi-Lens Analysis
Read the spec's full iteration chapter in `GUIDE_PATH` + every file implementing (or adjacent to)
the spec. Classify: `Implemented / Partial / Missing / Review`. Then answer per lens:
- **Architect:** boundaries, dependencies, patterns vs the five commitments, seven layers, and the
  ADR-0001 seams. Debt, duplication, coupling? Any second parallel layer implementation to remove?
- **System designer:** event-sourced data flow, clean state, consistent contracts, idempotency,
  failure surfacing, graceful degradation, **workspace-scoping** per RB-40 §1.
- **Product manager:** does it deliver the chapter's use cases and benefits? Confusing, missing, or
  over-built relative to the walking-skeleton intent?
- **UI/UX lead:** walk every journey against the Part 4 non-negotiables + tokens — hierarchy,
  states (empty/loading/error), feedback, responsiveness, accessibility. List every violation.
- **Developer:** safest sequence for the depth required (incl. full rewrite if justified). Files
  changed, blast radius, migration needs (next migration number: orchestrator §6).

### Phase 2 — Scope & Test Plan *(deliverable: `docs/plans/REFACTOR_PLAN_{SpecID}.md` in the branch)*
1. **In-scope changes** — numbered; each with rationale (lens + constitution/rulebook clause) and
   acceptance criteria.
2. **Out-of-scope** — explicit; parked items → `PARKED.md`.
3. **Test scenarios:** functional happy paths · edge/negative · regression on blast-radius ·
   **unauthorized + cross-tenant** (RB-40 §1, mandatory) · UI/UX vs §4 + tokens · accessibility
   (keyboard-only, contrast) · performance smoke vs the §4 P95 gates.
4. **Risk & rollback** — top risks, migration reversibility (forward-only; expand-contract), revert
   path.

**Gate:** `GATED` → stop, present the plan, await approval. `AUTO` → proceed to Phase 3.

### Phase 3 — Implement
Execute the approved plan at the depth it requires, per `AI_RULES_PATH` and repo conventions. Tests,
types, and docs updated in the same commits as code. Keep a worklog of mid-implementation
decisions.

### Phase 4 — Test
Full existing suite + every Phase-2 scenario, including the mandatory unauthorized + cross-tenant
tests. Run the gate locally first (lint, guardrails, style, unit). Fix until green (Rule 7). No
skipped or disabled tests. Record results.

### Phase 5 — Validate (pre-merge, local)
Build and run the branch on `DEPLOY_TARGET` (local prod build: Postgres `:55433`, backend `:8090`,
frontend `:5173`). Execute the UI/UX + accessibility + performance checklist on the running build.
Capture evidence: before/after screenshots, clean console, key journeys exercised. *(No remote
deploy until a hosting target is wired — RB-40 §5.)*

### Phase 6 — Merge & Sync *(remote steps need human go-ahead — Rule 8)*
1. Open PR into `BASE_BRANCH`: summary, classification, scope-item → commit map, test evidence,
   before/after screenshots, capability + iteration, rule books applied, milestone link.
2. Merge only on green CI, **squash-merge**, after go-ahead.
3. **Post-merge validation:** confirm `origin/main` contains the change; CI green on `main`; fresh
   build + suite + local smoke.
4. Delete merged branch. Update tracker row → `Done` (+ PR, date, outcome).
5. If this was the **last actionable spec of its iteration** → run §10 Iteration Close-Out.

---

## 7. DEFINITION OF DONE (per spec)

- [ ] AI rules followed; no unresolved conflicts; no generated file hand-edited
- [ ] Tracker row updated `In progress → Done` (or `Blocked` with reason)
- [ ] `REFACTOR_PLAN_{SpecID}.md` exists; every in-scope item implemented; nothing outside it
- [ ] Constitution + rulebook conformance verified, not assumed — incl. workspace-scoping,
      RBAC-in-service, tokens-not-literals, P95 gates, the five states + a11y on any UI
- [ ] All tests green (existing + new, incl. unauthorized + cross-tenant); results recorded
- [ ] Local validation on `DEPLOY_TARGET` passed with captured evidence
- [ ] PR squash-merged · post-merge validation passed · `origin/main` in sync · parked items recorded
- [ ] Final report delivered (§8 format)

---

## 8. FINAL REPORT (paste back in this exact format)

```
SPEC: {ID} — {Cap tag} {Spec name} | ITERATION {N} ({Theme}) | CLASSIFICATION: Implemented/Partial/Missing/Review
STATUS: Done / Blocked (reason)
CHANGED: <3–6 lines — what was refactored/built and why, by lens; note depth (patch / restructure / rewrite)>
CONSTITUTION: <violations found → fixed; any accepted exceptions + why>
TESTS: <suite + new-scenario pass/fail counts; incl. unauthorized + cross-tenant>
UI/UX: <key before→after improvements; evidence links>
PERF: <measured vs P95 gates>
MERGE: <PR link · squash-merged · post-merge validation · origin/main sync confirmed>
TRACKER: <row updated · X of Y actionable specs done in iteration {N} · Z of 224 overall>
PARKED: <items + target spec IDs>
NEXT: <next actionable spec the selection rule will pick>
```

---

## 9. ITERATION REGISTRY (orientation — tracker is authoritative)

| Iter | Release | Theme |
|---|---|---|
| 1 | 1.0 | Foundation — The Works MVP |
| 2 | 2.0 | Sprints — Scrum + Reports |
| 3 | 3.0 | Workflows, Permissions & Custom Fields |
| 4 | 4.0 | PM Artifacts — RAID, Decisions, Meetings |
| 5 | 5.0 | Knowledge Repository + Versions |
| 6 | 6.0 | Reports, Dashboards & Insights |
| 7 | 7.0 | Compliance Rules Engine |
| 8 | 8.0 | SLA Engine — Internal & Generalized |
| 9 | 9.0 | Service Management — Customer Portal |
| 10 | 10.0 | AI Orchestration Foundation + AI Control Plane |
| 11 | 11.0 | AI Expansion + Conversational Command Bar |
| 12 | 12.0 | KPI Framework with Privacy Guardrails |
| 13 | 13.0 | Automation Engine + Integrations |
| 14 | 14.0 | Developer Workspace + IDE Extension |
| 15 | 15.0 | Scrum Master Cockpit + Product Owner Workspace |
| 16 | 16.0 | Leadership Console + Admin Operations Center |
| 17 | 17.0 | Universal Customization Engine |
| 18 | 18.0 | Mobile + Real-time + Performance |
| 19 | 19.0 | Enterprise Security + Compliance Certifications |
| 20 | 20.0 | Polish, Advanced AI, Marketplace Foundation |

---

## 10. ITERATION CLOSE-OUT (auto-runs when an iteration's last actionable spec merges)

1. Confirm every actionable spec of iteration {N} is `Done` (remainder `Baseline`) and `main` is green.
2. Roll up a changelog from the spec reports (grouped by capability, with lens-level impact and
   before/after highlights); add it to `CHANGELOG.md` under the iteration's SemVer version.
3. **Release via the repo's scheme (RB-10 §9), with human go-ahead:** annotated SemVer tag
   `vX.Y.0` cut from `main` + a published GitHub Release titled `Iteration-{N} — {Theme}`. *(Do
   not introduce a parallel `refactor-vN.0` tag scheme — one release model.)* Close the milestone.
4. Summarize that iteration's parked items; confirm the next iteration's first actionable spec is
   queued. Report the close-out before the next spec run begins.

---

## Appendix — Changes from the bundled original

The originally-bundled prompt was sound in design but written against an earlier spec snapshot.
Six points were reconciled to the live repo (all flow from Rule 1, *repo AI rules > this prompt*):

1. **`GUIDE_PATH`** → the already-committed `docs/specifications/06-iteration-guide.md` (BQL-adapted),
   not a fresh copy of the bundled guide (which predates the WIQL→BQL rename, #39). One spec source.
2. **`AI_RULES_PATH`** → `ai-rules/00-ORCHESTRATOR.md` (canonical). `CLAUDE.md`/`AGENTS.md` are
   *generated* and must never be hand-edited.
3. **Bootstrap & merges go via branch + squash PR** — `main` is protected; the original's "commit
   the tracker directly to `BASE_BRANCH`" is removed.
4. **§4 conflict precedence un-inverted** — code/`ai-rules` win on stack/implementation; the guide
   wins on product/architecture requirements; `SOURCE-OF-TRUTH.md` is the arbiter. Stale digest
   values corrected (BQL, `rounded-xl` 22px, Lucide 2px, WCAG 2.1 AA baseline).
5. **`DEPLOY_TARGET`** → local prod build/run (no remote env exists yet); Phase 5 is local
   validation. Rule 8 widened: merge/tag/deploy/push-to-`main` need human go-ahead even in `AUTO`.
6. **Release close-out uses the repo's SemVer + GitHub Release scheme** (RB-10 §9), not a parallel
   `refactor-vN.0` tag. Added Rule 9 (respect ADR-0001 seams) and the frontier-forward `MODE`.
