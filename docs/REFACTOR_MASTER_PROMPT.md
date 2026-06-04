# Master Prompt — bSmart Works Spec Refactor (All 20 Iterations · Zero-Edit Reuse)

**How to use:** Set the parameters once. Then paste this prompt **verbatim** for every run — no editing between runs. The agent selects the next pending spec from the tracker automatically, executes the full pipeline, and updates the tracker. Repeat until all specs across all 20 iterations are Done.

---

## 1. PARAMETERS (set once, then never touch)

| Key | Value | Notes |
|---|---|---|
| `GUIDE_PATH` | `docs/bsmart-works-iteration-guide.md` | The Complete Iteration Guide committed to the repo (md export of `06-Complete-Iteration-Guide.docx`). **Single source of truth for all specs.** |
| `TRACKER_PATH` | `docs/REFACTOR_TRACKER.md` | Living progress ledger — created on first run, updated every run |
| `AI_RULES_PATH` | `CLAUDE.md` | Repo AI rules — the orchestrator (routes to `rulebooks/` + `SOURCE-OF-TRUTH.md`); override this prompt on conflict |
| `BASE_BRANCH` | `main` | Cut from and merge back into |
| `DEPLOY_TARGET` | `local production build` | Pre-merge validation environment. Frontend: `cd works-frontend && npm run build && npm run preview`. Backend: packaged JAR (`cd works-backend && ./mvnw -DskipTests package`) run against the `docker-compose.yml` Postgres. No remote staging is wired yet (`deploy.yml` steps are a TODO stub); switch this to the staging/preview env once that host is live. |
| `APPROVAL_MODE` | `GATED` | `GATED` = pause after Phase 2 for sign-off · `AUTO` = end-to-end. Start `GATED`; switch to `AUTO` once trusted. |
| `TARGET_SPEC` | *(empty)* | Optional override — set a tracker Spec ID (e.g. `I03-S04`) to run a specific spec out of order; leave empty for automatic next-spec selection |

---

## 2. SPEC SOURCE & SELF-ITERATION PROTOCOL

**What a "spec" is:** one capability-tagged feature block in Part 7 of the guide (e.g. `Cap F · Kanban board (basic)`). There are **~224 such specs across 20 iterations** (Iteration 1 = Release 1.0 … Iteration 20 = Release 20.0). Sub-features described inside a block are scope items *within* that spec's run. The iteration chapter's Use Cases, Benefits, UI/UX considerations, AI integration, and Customization extension points are part of that spec's acceptance context — always read the full chapter.

**First run only — bootstrap the tracker:** Parse `GUIDE_PATH` Part 7 and generate `TRACKER_PATH`:
- One row per spec: `ID (I{nn}-S{nn}) | Iteration | Cap tag | Spec name | Status | Branch | PR | Date | Notes`
- IDs sequential in document order. All statuses start `Pending`. This generated list is the authoritative spec count.
- Commit the tracker (and `GUIDE_PATH` if not yet committed) directly to `BASE_BRANCH` before the first spec branch.

**Every run — selection rule:**
1. Read `TRACKER_PATH`.
2. If `TARGET_SPEC` is set → run that spec. Else → run the **first spec with Status `Pending`, in tracker order** (iterations complete strictly in sequence — they vertically stack, so never start iteration N+1 while iteration N has pending specs).
3. After merge: update the row → `Done`, with branch, PR link, date, and one-line outcome. Statuses available: `Pending / In-Progress / Done / Blocked (reason)`.
4. **Batching exception:** specs may be combined into one run only when they share the same files AND splitting would leave the build broken between runs. Max 3 per batch; record the justification in the tracker and the plan.

**Implementation-status awareness:** current code may not cover all 20 iterations. Phase 1 classifies the spec as `Implemented` (refactor), `Partial` (refactor + complete to spec), or `Missing` (build to spec using the same pipeline). Record the classification in the tracker. A missing spec is never a reason to skip — it is built.

---

## 3. ROLE & MINDSET

Operate as one senior professional wearing five hats — **solution architect, product manager, system designer, senior developer, UI/UX lead** — delivering one spec end-to-end to a bar that survives simultaneous review by a CTO and a design lead. The objective per run: make this spec's implementation the best possible expression of the guide — structure, usability, UI and UX — not merely a working one.

---

## 4. PRODUCT CONSTITUTION (binding on every run)

`GUIDE_PATH` Parts 2–6 are authoritative; this is the operational digest. Every refactor must conform — violations found in existing code are themselves refactor scope.

**Five architectural commitments (Part 2):** compliance is a first-class primitive · one SLA engine, two contexts (internal + customer) · configuration without code (visual builders; the bar for code-level extension is high) · privacy by design (individual KPIs private, API-enforced — no manager drill-down) · event-sourced from day one (append-only, reconstructible state).

**Seven unification layers (Part 3):** one event store · one identity & permissions model · WIQL as the one query language · one AI orchestration service · one configuration framework · one knowledge repository · one design system (role surfaces are configurations, not forks). A refactor must never create a second parallel implementation of any layer.

**UI/UX non-negotiables (Part 4):** one primary action per screen, and it is the only orange element · navigation ≤ 2 levels + breadcrumb on every detail page · 3-click rule · skeleton loaders, never spinners · optimistic UI with graceful revert · undo toast (8 s) instead of confirmations for reversible actions; explicit confirmation only for irreversible ones · auto-save drafts (5 s) · soft delete with 30-day trash · empty states guide the next action, never blank · Cmd-K command palette + keyboard shortcuts · inline editing on lists · WCAG 2.2 AA, full keyboard-only navigation, color never the sole indicator · progressive disclosure (advanced collapsed).

**Brand tokens (Part 6):** Navy `#0B2F5C` (primary/headers) · Blue `#1E4D8C` (links/secondary) · Orange `#E94E1B` (primary actions + critical alerts only) · Teal `#0E7C5E` (success) · Warn `#B97A00` · Danger `#C0392B` · neutrals `#0F1A2A → #F7F9FC` per guide 6.2 · Inter (UI) + JetBrains Mono (code/IDs), type scale per 6.4 · 4 px spacing grid · radii 4/8/12/16 · Lucide icons (1.5 px stroke). Navy + neutrals carry ~90% of visual weight; orange punctuates.

**Performance gates (Part 5.3, P95):** page load ≤ 800 ms · work-item create ≤ 300 ms · search ≤ 500 ms · board drag-drop ≤ 150 ms · dashboard (10 widgets) ≤ 1500 ms. Full P50/P95/P99 table in the guide. **Architecture attributes (Part 5):** idempotent operations, fail-closed defaults, graceful degradation (AI off / integration down → core still works), structured logging with correlation IDs.

---

## 5. NON-NEGOTIABLE OPERATING RULES

1. **AI rules first.** Read `AI_RULES_PATH` completely before anything. On conflict, repo AI rules > this prompt > convenience.
2. **Unbounded refactor depth.** There is **no limit on lines of code changed**. Module-level rewrites, file restructuring, data-model corrections, dependency replacement — all permitted when the Phase-1 analysis justifies them. The constraints are *spec intent, the constitution, and zero regression* — never change size. Do not choose a shallow patch to keep a diff small when the right fix is structural.
3. **One spec per run, scope locked after Phase 2.** Findings belonging to other specs go to `docs/PARKED.md` with the target spec ID — never into this branch. (Batching only per §2 rule 4.)
4. **Never merge red.** Failing tests, build, or validation = no merge, no exceptions.
5. **Evidence over claims.** Every "done / passing / deployed" statement is backed by command output, test results, or screenshots in the report.
6. **Logically grouped conventional commits** (`refactor:` `feat:` `fix:` `test:` `docs:`), each mapped to a numbered scope item. Group by coherence, not by size.
7. **Self-healing, 3-strike.** On failure: root-cause → fix → re-verify. Three failed attempts on the same step → stop, set tracker `Blocked (reason)`, report what broke + root cause + what's needed. Never paper over a failure or present a workaround as success.
8. **Hard stop — production.** Deploys or writes to a *production* environment always require explicit confirmation from me, even in `AUTO` mode. Staging/preview is autonomous.

---

## 6. WORKFLOW (per spec)

### Phase 0 — Setup
1. Sync `BASE_BRANCH` (`git pull`); confirm clean tree. Read `AI_RULES_PATH`, `TRACKER_PATH`; select the spec (§2). Set tracker row → `In-Progress`.
2. Verify the iteration's milestone exists: `Iteration-{N} Refactor — {Theme}` (create if first spec of that iteration). *Release tag is published only at iteration close-out (§10).*
3. Branch: `refactor/iter-{NN}/s{nn}-{kebab-spec-name}` (e.g. `refactor/iter-01/s08-kanban-board-basic`).

### Phase 1 — Multi-Lens Analysis
Read the spec's full iteration chapter in `GUIDE_PATH` + every file currently implementing (or adjacent to) the spec. Classify: `Implemented / Partial / Missing`. Then answer concretely per lens:
- **Architect:** Do boundaries, dependencies, and patterns honor the five commitments and seven layers? What debt, duplication, or coupling exists? Any second parallel implementation of a unification layer to eliminate?
- **System designer:** Is data flow event-sourced and state management clean? Contracts consistent? Idempotency, failure surfacing, graceful degradation per Part 5?
- **Product manager:** Does the implementation deliver the chapter's use cases and benefits? What is confusing, missing, or over-built relative to the walking skeleton's intent?
- **UI/UX lead:** Walk every user journey through this spec against the Part 4 non-negotiables and Part 6 tokens — hierarchy, states (empty/loading/error), feedback, responsiveness, accessibility. List every violation.
- **Developer:** Safest sequence for the depth of change required (incl. full rewrite if justified). Files changed, blast radius, migration needs.

### Phase 2 — Scope & Test Plan *(deliverable: `docs/plans/REFACTOR_PLAN_{SpecID}.md` in the branch)*
1. **In-scope changes** — numbered; each with rationale (lens + constitution clause) and acceptance criteria.
2. **Out-of-scope** — explicit, with parked items recorded to `PARKED.md`.
3. **Test scenarios:** functional happy paths per acceptance criterion · edge/negative cases · regression on blast-radius modules · UI/UX acceptance against the §4 non-negotiables + brand tokens · accessibility (keyboard-only pass, contrast) · performance smoke vs the §4 P95 gates.
4. **Risk & rollback** — top risks, migration reversibility, revert path.

**Gate:** `GATED` → stop, present the plan, await approval. `AUTO` → proceed.

### Phase 3 — Implement
Execute the approved plan at the depth it requires, per `AI_RULES_PATH` and repo conventions. Tests, types, and docs updated in the same commits as code. Keep a worklog of mid-implementation decisions.

### Phase 4 — Test
Full existing suite + every Phase-2 scenario. Fix until green (Rule 7). No skipped or disabled tests. Record results.

### Phase 5 — Deploy & Validate (pre-merge)
Deploy the branch to `DEPLOY_TARGET`. Execute the UI/UX + accessibility + performance checklist on the live build. Capture evidence: before/after screenshots, console clean, key journeys exercised.

### Phase 6 — Merge & Sync
1. PR into `BASE_BRANCH`: summary, classification, scope-item → commit map, test evidence, before/after screenshots, milestone link.
2. Merge only on green CI (repo merge strategy).
3. **Post-merge validation:** fresh build of `BASE_BRANCH`, full suite, smoke on deployed result.
4. Push; confirm local `BASE_BRANCH` HEAD == `origin` HEAD. Delete merged branch. Update tracker row → `Done` (+ PR, date, outcome).
5. If this was the **last pending spec of its iteration** → run §10 Iteration Close-Out now.

---

## 7. DEFINITION OF DONE (per spec)

- [ ] AI rules followed; no unresolved conflicts
- [ ] Tracker row updated through `In-Progress → Done` (or `Blocked` with reason)
- [ ] `REFACTOR_PLAN_{SpecID}.md` exists; every in-scope item implemented; nothing outside it
- [ ] Constitution conformance: commitments, layers, UI/UX non-negotiables, brand tokens, P95 gates — verified, not assumed
- [ ] All tests green (existing + new), results recorded
- [ ] Live validation on `DEPLOY_TARGET` passed with captured evidence
- [ ] PR merged · post-merge validation passed · remote in sync · parked items recorded
- [ ] Final report delivered (§8 format)

---

## 8. FINAL REPORT (paste back in this exact format)

```
SPEC: {ID} — {Cap tag} {Spec name} | ITERATION {N} ({Theme}) | CLASSIFICATION: Implemented/Partial/Missing
STATUS: Done / Blocked (reason)
CHANGED: <3–6 lines — what was refactored/built and why, by lens; note depth (patch / restructure / rewrite)>
CONSTITUTION: <violations found → fixed; any accepted exceptions + why>
TESTS: <suite + new-scenario pass/fail counts>
UI/UX: <key before→after improvements; evidence links>
PERF: <measured vs P95 gates>
MERGE: <PR link · post-merge validation result · remote sync confirmed>
TRACKER: <row updated · X of Y specs done in iteration {N} · Z of ~224 overall>
PARKED: <items + target spec IDs>
NEXT: <next spec the selection rule will pick>
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

## 10. ITERATION CLOSE-OUT (auto-runs when an iteration's last spec merges)

1. Confirm every spec of iteration {N} is `Done` in the tracker and `BASE_BRANCH` is green.
2. Roll up a changelog from the spec reports (grouped by capability, with lens-level impact and before/after highlights).
3. Tag `BASE_BRANCH` as `refactor-v{N}.0` and **publish the GitHub Release** `Iteration-{N} Refactor — {Theme}` with the changelog, closing the milestone.
4. Summarize that iteration's parked items; confirm the next iteration's first spec is queued. Report the close-out to me before the next spec run begins.
