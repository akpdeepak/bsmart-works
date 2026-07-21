# Phase 2 — Structural Refactors: Execution Plan & Sequencing Spine

> **Workstream W2** of `MASTER-COMPLETION-ROADMAP.md`. Phase goal (roadmap §9): *"real module
> split + AppShell decomposition; god classes within budget."* This document is the authoritative
> **execution spine** for Phase 2 — the sequencing, dependency graph, conflict strategy, migration
> coordination, DoD/verification approach, and the Deepak checkpoints. The two detailed EPIC plans
> it indexes are the Large/risky **Stage-2 checkpoints** (RB-05) that must be approved before code.
>
> Created: 2026-06-20 (overnight planning session) · Owner: Deepak Pandey · Status: **DRAFT — for
> sign-off.** No production code is changed by this document.

---

## 0. TL;DR — read this first

> **Status refresh, 2026-07-21.** This plan was authored 2026-06-20 and sat unmerged while the work
> it describes was executed. Phase 1 closed **2026-06-21** (PRs #415–#441) and the first Phase 2
> tranche merged **2026-07-19** (PRs #446–#452, #454–#478). The original §0 dependency argument and
> the §1 "verified state" column were therefore both overtaken by events; both are corrected below,
> and §7 of each EPIC plan now records which decisions shipped. **Eight of the nine sign-off
> decisions are closed by merged code. One remains open: the frontend bundle-budget mechanism
> (EPIC-04 §7.c).** Sections 2–6 (Definition of Done, slicing, verification) were not affected and
> stand as written.

1. **The Phase 1 dependency wall is discharged.** Phase 2's backend split relocated the same
   cross-cutting files Phase 1 was editing (tenant filter, field-level security, PII vault), so the
   two could not run concurrently. Phase 1 reached its exit gate on 2026-06-21, and the module carve
   then ran cleanly against it — §3 is retained as the historical rationale, not a live blocker.
2. **The carve and the FE code-split landed; the decomposition did not.** 14 modules are populated
   and the flat root fell 291→72 source files; `locales.js` is code-split; token debt is zero. But
   three of the four god classes are still over budget, `AppShell` remains a 2,946-line component,
   `AsyncBoundary` reaches 14 of 36 views, and **no bundle budget was ever added** — see §1.
3. **What remains of Phase 2 is decomposition, not relocation.** Splitting `ArticleService`,
   `KpiService` and `WorkItemCommandService`; decomposing `RouteOutlet`; finishing the
   `AsyncBoundary` rollout; adding module→module ArchUnit rules and the `api`/`internal` split that
   the "API-first modular monolith" goal actually requires; and landing a bundle gate.
4. **The ratchets must be lowered as work lands.** Both size gates currently sit at their present
   value — flat root `≤72` with 72, `AppShell` `<3000` with 2,946 — so neither blocks regression.
   Each Phase 2 PR lowers its gate to the new value.

---

## 1. Scope (the W2 ledger rows, mapped to EPICs)

Measured on `main` at `ef031e0e`, 2026-07-21. "Was" is the 2026-06-20 baseline this plan was written against.

| # | W2 item (roadmap §5) | Was (06-20) | Measured now | Remaining | Owning EPIC plan |
|---|----------------------|-------------|--------------|-----------|------------------|
| W2-a | Split flat `com.bcits.works` into domain modules with ArchUnit boundaries | 0 classes moved | **DONE for relocation** — 14 modules populated, flat root 291→72 | **API-first goal not met:** no `api`/`internal` split anywhere, no module→module ArchUnit rule (`auth.UserRepository` imported 14× cross-module, `workitems.WorkItemRepository` 10×); the 72 flat-root files match no slice so the cycle gate skips them | [EPIC-03 full](epics/EPIC-03-backend-modularization-phase2.md) |
| W2-b | God classes within budget | `KpiService` 716, `BqlCompiler` 650, `ArticleController` 630, `WorkItemCommandService` 559 | `BqlCompiler` **56** (genuinely split → Parser 255 / Emitter 355 / Lexer 106); `ArticleController` 297 **but `ArticleService` 730**; `KpiService` **612**; `WorkItemCommandService` **558** | 1 of 4 decomposed. `ArticleService` is now the largest backend file in the repo — relocated, not split. `KpiService` −104, `WorkItemCommandService` −1 | [EPIC-03 full](epics/EPIC-03-backend-modularization-phase2.md) |
| W2-c | Decompose `AppShell.jsx` into router + providers + overlays + feature state | 4,606 lines, ~180 `useState` | **2,946 lines, 197 `useState`** | Gate is `<3000` — 54 lines of headroom, so it ratchets nothing. `RouteOutlet.jsx` is 927 lines, opens with a file-level `eslint-disable`, and destructures ~600 props from one object. `app/lazy-views.js` is dead code (0 references) | [EPIC-04 full](epics/EPIC-04-frontend-architecture-phase2.md) |
| W2-d | FE monoliths code-split, lazy | eager | `locales.js` **4,426→49** + 10 per-language files — **DONE**. `BlockEditor.jsx` **2,176 (unchanged)** and `knowledge-view.jsx` **1,828→1,783** were made lazy, not decomposed | **No bundle budget exists** — `vite.config.js` has `manualChunks`, but nothing in `quality-gates.mjs`, `verification-manifest.json` or `ci.yml` asserts a size limit. This is open decision EPIC-04 §7.c | [EPIC-04 full](epics/EPIC-04-frontend-architecture-phase2.md) |
| W2-e | Adopt `AsyncBoundary`; retire hand-rolled async states | 0 production imports | **14 of 36 views**, 1 component | 22 views. DoD is "all primary async surfaces" | [EPIC-04 full](epics/EPIC-04-frontend-architecture-phase2.md) |
| W2-f | Token debt: hex literals + legacy `warn` block | 3 hex; 43-file legacy block | **0 raw hex** in views and components; CI-blocking via `guardrails.sh` | **DONE** | [EPIC-04 full](epics/EPIC-04-frontend-architecture-phase2.md) |

> Phase 2 ≈ taking **EPIC 3 (backend modularization)** and **EPIC 4 (frontend architecture)** from
> their shipped first slices (~4% / ~5%) to full scope, plus the FE quality debt (W2-e/f).

---

## 2. The Definition of Done for every Phase 2 unit

Phase 2 is overwhelmingly **behavior-preserving refactor**, which sets a specific bar:

1. **No behavior change.** Public API contracts (REST paths, request/response shapes), and
   observable UI behavior are byte-for-byte preserved. Refactor PRs add no features.
2. **Tenant-scoping, RBAC, and field-level-security logic moves verbatim.** Every `rbac.require`,
   every workspace-scoped predicate, every manual tenant guard identified in the EPIC plans is
   preserved exactly. This is the single highest risk of a structural refactor: silently dropping a
   security check while moving code (RB-40 §1).
3. **Proven by tests *and* a fresh-DB boot.** Green CI is necessary, not sufficient
   (memory: `bsmart-ci-no-db-boot` — CI never boots the app against a DB; `ddl-auto=validate` and
   package/case-collision faults slip through). Every backend refactor PR is validated with a
   fresh-DB boot before merge.
4. **The architecture gate tightens, never loosens.** `ArchitectureTest` rules are added as each
   module/seam lands; no rule is downgraded to make a PR pass.
5. **Adversarially re-verified** (roadmap §10.5): an independent check that the moved code's
   security predicates and contracts match pre-refactor, on every "done."
6. **Merged on remote `main`, CI-green**, completion note written, `ROADMAP-STATE.md` + the master
   ledger updated.

---

## 3. The dependency wall — *why* Phase 2 waits on Phase 1 (verified)

The current working tree (`feat/p1-pii-vault`) is editing the exact cross-cutting files the backend
module split must relocate. Verified file-level overlap:

| Phase 1 in-flight (modified / new) | Phase 2 backend destination | Collision |
|---|---|---|
| `EncryptionService`, `KmsProvider`, `AwsKmsProvider`, `LocalKmsProvider` | `shared` kernel | **High** — `EncryptionService` is kernel; PII vault depends on it |
| `User`, `UserRepository`, `AuthController`, `ScimController` | `auth` | **High** — highest-fan-in identity files, all currently modified |
| new `PiiVaultService`, `PiiVaultPolicy`, `SubjectDataKey(+Repo)`, `UserPiiService`, `V110__…sql` | `security` | **High** — moving a file that doesn't exist on `main` yet = rename-during-creation |
| root `package-info.java` `@FilterDef`, `WorkspaceFilterActivator` (fan-in 120), `TenantContext` | `shared` / `workspaces` | **Highest blast radius** — moving the package-scoped `@FilterDef` ripples to 120 files and risks re-tripping the #243 case-collision boot bug |
| `FieldVisibilityService` + FLS path (#416, Slice 2+ ongoing) | `security` | **Medium** |

The same wall applies to two god classes (§ EPIC-03 plan): **`WorkItemCommandService`** sits on the
#243 tenant-filter front + the FLS write-side + PII event-payload rule simultaneously (highest
collision); **`BqlCompiler`** is the canonical FLS/BQL-tenant engine that future FLS slices re-enter.

**Conclusion:** the backend module split and the `WorkItemCommandService` / `BqlCompiler` splits
**must not** start until Phase 1's tenant-filter / FLS / PII-vault slices have merged to `main`.

---

## 4. Execution order (dependency-ordered)

### Independent of Phase 1 — can start as soon as approved (in isolated worktrees)

These touch frontend-only or backend areas Phase 1 is not editing. They are sequenced to minimize
collision with the **~20 live feature branches** (Today, knowledge/block-editor, UIUX), not Phase 1.

| Order | Unit | EPIC | Phase-1 dep | Live-branch conflict risk |
|------:|------|------|:-----------:|---------------------------|
| I-1 | **Token debt** — 3 hex → token; begin migrating the 43 `worksViewStructureLegacy` files (per-file, incremental) | 04 | none | Low (per-file, isolated) |
| I-2 | **Add a bundle-budget gate** (none exists today) — `size-limit` or Rollup `manualChunks` + `chunkSizeWarningLimit` in CI | 04 | none | Low |
| I-3 | **Code-split `locales.js`** by language (dynamic `import()`, keep `en` static) → ~9/10 i18n payload cut | 04 | none | Low |
| I-4 | **Lazy-load `BlockEditor`** (it is the one non-lazy view import) + lazy the `knowledge-view` modals/panels | 04 | none | **Med** — collides with live knowledge/block-editor branches; land *after* they merge |
| I-5 | **Adopt `AsyncBoundary`** across ~30–45 sites, simplest list views first | 04 | none | Low–Med (per-view) |
| I-6 | **`ArticleController` god-class split** (push logic into `ArticleService`) | 03 | none (lowest collision of the four) | Low |
| I-7 | **`KpiService` god-class split** (isolate the FLS tier gate into `MetricDefinitionService`) | 03 | low–med | Low |

### Gated on Phase 1 reaching its exit criteria (#243 + FLS + PII vault verified on `main`)

| Order | Unit | EPIC | Why gated |
|------:|------|------|-----------|
| G-1 | **Move the `shared` kernel first** (`ApiException` fan-in 165, `AuthenticatedUser` 136, `EventService` 85, `WorkspaceFilterActivator`/`@FilterDef` 120, BQL, encryption) — turns on the acyclic-slices rule with the smallest blast radius | 03 | Touches the tenant `@FilterDef` + encryption that Phase 1 is editing |
| G-2 | **Carve domain modules, "Identity first"** (ADR-0001 platform-layer order): `auth` → `workspaces` → `security` → then the rest; add a per-module dependency rule to `ArchitectureTest` as each lands | 03 | Moves `User`/`auth`/tenant files Phase 1 owns |
| G-3 | **`WorkItemCommandService` split** | 03 | Highest Phase-1 collision (tenant filter + FLS write-side + PII events) — co-own with / sequence after those slices |
| G-4 | **`BqlCompiler` split** (Parser/Emitter extraction) | 03 | Canonical FLS/BQL-tenant engine; fold into or follow FLS slices |
| G-5 | **AppShell feature-hook extraction for the contested views** (work-items core, dashboards/Today, knowledge) | 04 | Not Phase-1 gated, but gated on the live Today/knowledge branches merging |

> AppShell's *leaf* extractions (providers, session, auth screens, public routes, TopBar, NavRail,
> CommandCenter, GlobalOverlays, global shortcuts) are independent and can run in the I-block — see
> the EPIC-04 plan's PR order. Only the contested feature hooks are gated (G-5).

---

## 5. Conflict & worktree strategy (≈20 live branches)

- **Every Phase 2 unit runs in its own isolated git worktree off the latest `origin/main`**
  (memory: `bsmart-concurrent-agents` — agents sharing the main worktree mutate it live; never work
  Phase 2 in the shared main worktree while Phase 1 is checked out there).
- **Leaf-first, hot-center-last.** Both the backend split (move `shared` before domains) and the
  AppShell teardown (extract overlays/chrome before feature state) follow the same principle: take
  the low-collision perimeter first; defer the files that live feature branches are mid-edit on.
- **Rebase on `main` before every push**; keep each PR small and single-purpose (RB-10 §9). The
  acyclic-slices rule will surface back-edges immediately on each move — fix in-PR, never downgrade.
- **Sequence around live branches, don't fight them.** Land the in-flight Today and know-editor
  feature work *first*, then extract those feature hooks / lazy-load those modules (I-4, G-5).

---

## 6. Migration coordination

- Phase 2's **backend module split is pure repackaging — no schema migrations.** The one watch-item
  is the root `package-info.java` `@FilterDef` (package-scoped); moving it must not re-trip the #243
  case-collision boot failure that `ArchitectureTest.modulePackagesDoNotCaseCollideWithTopLevelClasses`
  guards. Keep module names plural (`projects`, `workitems`, `workspaces`) — they already dodge it.
- **Flyway high-water mark is owned by Orchestrator §6.** Phase 1's PII vault claims **V110**
  (`V110__pii_vault_subject_tokens_and_keys.sql`, currently untracked on `feat/p1-pii-vault`). Phase 2
  adds no migrations, so there is no Phase-1/Phase-2 migration-number contention — but confirm §6's
  high-water mark before any Phase 2 work that *does* (none currently planned).

---

## 7. Verification strategy

- **Backend:** focused unit tests on each moved/split class → `mvnw -Dgroups=unit verify` →
  Testcontainers integration → **fresh-DB boot** (the `bsmart-ci-no-db-boot` guard) → `ArchitectureTest`
  green with the *new* rule for the landed module → guardrails + Checkstyle. For each god-class split,
  an explicit diff-of-security-predicates check (the `rbac.require` / tenant-predicate inventory in
  the EPIC plan must be present, unchanged, post-split).
- **Frontend:** `npm test` (Vitest) for the touched units + the `app-architecture.test.js` guard
  (repointed in the same PR that relocates `ModeRail`/`pathToView`) → `npm run build` (proves the new
  lazy chunks resolve) → `npm run lint` (token + structure rules) → the new bundle-budget gate.
- **Adversarial re-verify** every "done" (roadmap §10.5) — an independent reviewer confirms the
  refactor preserved behavior + security, not just that CI is green.

---

## 8. Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Silently dropping a tenant/RBAC/FLS check while moving code | Med | EPIC plans inventory every security predicate per class; adversarial diff-of-predicates gate (§7) |
| Re-tripping the #243 case-collision boot bug via package names | Low | Keep plural module names; `ArchitectureTest` guards it; fresh-DB boot catches it |
| `WorkItemController`'s hand-rolled `new WorkItemCommandService(...)` not Spring-wired — extracted sub-services silently un-injected | Med | EPIC-03 plan flags it; switch to constructor injection in the same PR; test |
| AppShell teardown collides with live Today/knowledge branches | High | Leaf-first; defer contested feature hooks (G-5) until those branches merge |
| `locales.js` sync→async `translate()` change breaks first-paint i18n | Low | Keep `en` statically bundled as guaranteed fallback; existing fallback contract tolerates a missing table |
| `switchWorkspace` full-`reload()` behavior lost during `WorkspaceContext` extraction | Med | EPIC-04 plan: preserve the `window.location.reload()` guarantee verbatim |
| Phase 1 slips (PII-vault build is large; #243/FLS still Slice 1; BYOK/WebAuthn/etc. follow) → Phase 2 backend can't start | — | Independent I-block (§4) proceeds; backend split waits — do not force it |

---

## 9. Decisions for Deepak (the Phase 2 checkpoints)

Phase 2 does not proceed past these:

- **a. Approve the independent I-block to start ahead of Phase 1 close** (token debt, bundle gate,
  `locales` split, AsyncBoundary, `ArticleController`/`KpiService` splits). These are safe to run now
  in isolated worktrees. *Recommendation: yes — they're the lowest-risk, highest-immediate-value
  Phase 2 work and unblock nothing on Phase 1.*
- **b. Confirm the backend module boundary set** (14 modules + `shared` kernel; fold Config →
  `shared`/`workspaces`, Onboarding → `workspaces`; or add two markers, which means editing the
  ArchUnit `MODULE_PACKAGES` list). See EPIC-03 plan §2.
- **c. Confirm "move `shared` kernel first, then Identity-first domain order"** as the split
  sequence (ADR-0001 platform-layer order).
- **d. Confirm the god-class split timing**: `ArticleController` + `KpiService` now (independent);
  `WorkItemCommandService` + `BqlCompiler` deferred to co-own with Phase 1 FLS/tenant work.
- **e. Confirm AppShell teardown sequencing**: leaf extractions now; contested feature hooks after
  the live Today/knowledge branches merge.

---

## 10. Index

- [EPIC-03 — Backend Modularization & God-Class Splits (full scope)](epics/EPIC-03-backend-modularization-phase2.md)
- [EPIC-04 — Frontend Architecture, Code-Split, AsyncBoundary & Token Debt (full scope)](epics/EPIC-04-frontend-architecture-phase2.md)
- Master ledger: [MASTER-COMPLETION-ROADMAP.md](MASTER-COMPLETION-ROADMAP.md) (W2)
- Resume ledger: [ROADMAP-STATE.md](ROADMAP-STATE.md)
