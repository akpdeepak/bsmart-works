# EPIC 04 (Phase 2, full scope) — Frontend Architecture, Code-Split, AsyncBoundary & Token Debt

> Takes EPIC 4 from its shipped first slice (~5%) to full scope: decompose `AppShell.jsx`, code-split
> the FE monoliths, adopt `AsyncBoundary`, and clear the token/structure debt — **all
> behavior-preserving.** Lane: **Large/risky** (cross-cutting frontend) → this plan is the Stage-2
> checkpoint (RB-05). Sibling: [EPIC-03 Phase 2](EPIC-03-backend-modularization-phase2.md).
> Spine: [PHASE-2-EXECUTION-PLAN.md](../PHASE-2-EXECUTION-PLAN.md).
>
> Status: **DRAFT — for sign-off.** No production code changed by this document.
> **Note:** unlike EPIC-03's backend, most of EPIC-04 is **independent of Phase 1** (Phase 1 is
> backend security). The gating here is the **~20 live FE feature branches** (Today, knowledge/block
> editor, UIUX), not Phase 1.

---

## 1. `AppShell.jsx` decomposition (W2-c)

### Current state
`works-frontend/src/app/AppShell.jsx` = **4,606 lines**, one component: ~180 `useState`, ~120
fetch/handler functions, all routing + URL sync, auth/session bootstrap, tenant/RBAC context, the
two-tier nav rail + topbar chrome, every global overlay, and a ~45-case view switch. `App.jsx` (5
lines) just renders `<AppShell/>`. Responsibilities map (line ranges) is recorded in the discovery
notes; the major blocks: auth/session (933–1046), routing+URL-sync (552–582, 688–713), workspace
context (753–813), RBAC/lens (738–792, 3084–3102), realtime/presence (661–684), global shortcuts
(628–659), core work-item CRUD+DnD (1048–1227), per-feature state (1229–2560), `navigate` dispatcher
(3052–3082), command palette (3111–3179), topbar (3193–3368), nav rail (3370–3404), view switch
(3406–4367), global overlays tail (4369–4570).

### Guard test constraints (`app-architecture.test.js`)
- `App.jsx`: `<25` lines, must contain `import AppShell from '@/app/AppShell'` + `<AppShell />`, must
  **not** contain `eslint-disable` / `useState(` / `api.raw(`. → keep providers *inside* an
  `AppProviders` rendered by `AppShell`, never in `App.jsx`.
- `AppShell.jsx`: must keep `export default function AppShell()` and the substrings `pathToView` +
  `ModeRail`. → **repoint this guard in the same PR** that relocates `ModeRail`/`pathToView` (assert
  the new `AppRouter`/`NavRail` modules exist instead of forcing dead imports into the shell).

### Target modules
- `src/app/providers/AppProviders.jsx` — `QueryClientProvider` (move the `queryClient` singleton here),
  `DialogProvider`, theme/dark-mode, density, toast-emitter wiring (`setToastEmitter`).
- `src/app/session/SessionContext.jsx` (`useSession`) — `currentUser`/`token`/`readStoredSession` +
  all auth handlers + `handleLogout`; `src/app/session/AuthScreens.jsx` — the four auth early-returns.
- `src/app/workspace/WorkspaceContext.jsx` (`useWorkspace`) — `activeWorkspaceId`, `workspaces`,
  `fetchMyWorkspaces`, `switchWorkspace`, `wipLimits`. **Preserve the `window.location.reload()` in
  `switchWorkspace` verbatim** (every feature's state implicitly resets on tenant switch today).
- `src/app/rbac/RoleContext.jsx` (`useRole`) — `userRole`, `can()`, `lens`/`selectLens`/`exitPreview`,
  `visibility`, the `allowed`-based access guard effect.
- `src/app/AppRouter.jsx` + `src/app/routes/RouteOutlet.jsx` — `view`/`setView`, URL-sync effects,
  public early-return routes (share/embed/portal), the `<Suspense>` + view switch.
- `src/app/navigation/navigate.js` — the dispatcher becomes "set view + call the view's `onEnter()`"
  instead of a 30-case switch closing over every fetcher.
- `src/app/chrome/{TopBar,NavRail,CommandCenter}.jsx`; `src/app/overlays/GlobalOverlays.jsx`;
  `src/app/shortcuts/useGlobalShortcuts.js`.
- Per-feature hooks (most of the line mass): `src/features/<feature>/use<Feature>.js`, each owning its
  state + fetchers + its `onEnter()` load side-effect (work-items, sprints, backlog, dashboards,
  reports, compliance, service, pm, knowledge, settings/BQL, releases, cockpit, po, notifications).
  They call the existing `apiClient` — no new HTTP layer needed.

### Highest-risk shared state (extract LAST, behind context)
`activeWorkspaceId` (read everywhere; reload-on-switch), `workItems`/`setWorkItems` (optimistic
update + 409-conflict refetch in `handleDrop` 1143–1185; debounced `handleUpdateItem` 1188–1199),
`selectedItem` (detail panel + two URL-sync effects + popstate/deep-link), `showToast`/`setToastEmitter`
(wired to `reportError` via an in-render module side-effect — must re-register on provider mount, not
per-render), `statusResolver`/`fieldPrefs` (memoized; feed board + DnD). Singletons: `queryClient`
(→ `useQueryClient()`), `navigateRef` (mutable ref reassigned per render — preserve the indirection),
scattered `window.location/history` (centralize in `AppRouter`), `document.documentElement` mutations
(dark-mode class, `--brand-action` var → theme provider + branding effect).

### PR order (leaf-first; contested feature hooks gated on live branches)
1. `AppProviders` + `SessionContext` + `AuthScreens` + public routes.
2. `TopBar` + `NavRail` + `CommandCenter` + `GlobalOverlays` + `useGlobalShortcuts`.
3. `WorkspaceContext` + `RoleContext`.
4. **Quiet** feature hooks (releases, service, compliance, pm, reports, settings/BQL).
5. `AppRouter` + `RouteOutlet` + `navigate` hook (shrink the switch case-by-case).
6. **Contested** feature hooks — work-items core, **dashboards/Today**, **knowledge** — only **after**
   their in-flight branches merge (memory: configurable-Today 6-slice plan; `feat/know-editor-polish`).
7. Final shell slim-down + guard-test repoint. Keep `export default function AppShell()` + the two
   guarded substrings until step 7 so every intermediate PR stays green.

---

## 2. Code-split the FE monoliths (W2-d)

**First, add a bundle-budget gate — none exists.** No `manualChunks`, no `size-limit`, no
`chunkSizeWarningLimit`, no CI bundle check today. Add one (`size-limit` in CI, or Rollup
`manualChunks` + `build.chunkSizeWarningLimit`) so these wins don't silently regress. The FE already
uses `React.lazy` heavily (33 view chunks), so the philosophy is there — just unenforced.

- **`locales.js` (4,426)** — one eager module: `MESSAGES` holds 10 languages × ~428 flat-key blocks,
  so the full catalogue ships in the main bundle though a session uses one locale. **Split by
  language:** move each block to `src/lib/locales/<code>.js`; keep `en.js` as the only static import
  (guaranteed fallback + first paint); in `i18n.jsx` lazy-load the active non-`en` locale via
  `import(\`./locales/${code}.js\`)`, store the table in state, `t()` reads `merged[key] ?? en[key]
  ?? key`. ~9/10 i18n payload cut for English users. The existing fallback contract already tolerates
  a missing table. Update importers: `i18n.jsx` (only runtime consumer), `nav-model.js`,
  `language-switcher.jsx`, + i18n tests. (By-namespace split deferred — keys are flat, not nested.)
- **`BlockEditor.jsx` (2,176)** — the **one view-area import in `AppShell.jsx` (L107) NOT wrapped in
  `React.lazy`** (all 33 siblings are lazy); `knowledge-view.jsx` (L12) also imports it statically, so
  it's pulled into the eager graph regardless. **No heavy vendor libs** (mermaid = a textarea; charts
  = in-house; code = `shiki`, already a dep) — the win is the ~2.2k lines of JSX. **Make `BlockEditor`
  lazy** (remove the static imports; `React.lazy` + the existing `<Suspense>`); viewers who never edit
  never download it. Secondary (measure first): lazy the heavy sub-blocks (`Whiteboard`/`MindMap`/
  `Flowchart`/`Chart`/`Sheet`) at the `Block` dispatcher (L1519).
- **`knowledge-view.jsx` (1,828)** — already lazy itself, but statically fans out to ~35 children, so
  opening Know downloads the editor + every modal/panel even when just browsing. **Lazy the
  conditionally-rendered overlays:** `BlockEditor`, `TemplatePickerModal`, `BlockCommentsPanel`,
  `MeetingNotesAssistant`, `KnowledgeRoadmapPanel`, `KnowAiPanel`, `CreateWorkItemsFromChecklist` →
  `React.lazy` + `<Suspense>` at each render site. The browse path keeps only `ArticleCard`/`StatusBadge`/
  `Button`/`EmptyState`.
- **Collision note:** `BlockEditor`/`knowledge-view` work collides with live knowledge/block-editor
  branches — land **after** they merge.

---

## 3. Adopt `AsyncBoundary` (W2-e)

`src/components/works/atoms/async-boundary.jsx` (81 lines, well-tested, **0 production consumers**)
resolves loading / error / empty in one component (`aria-busy` skeleton; `EmptyState` + `ShieldAlert`
+ `{code,message}` mapping + optional retry; caller-supplied empty). It was built for RB-30 §6 and
never adopted. Hand-rolled patterns it would replace (in `src/views/`): ~28 files with loading
literals, 39 using `EmptyState` directly, 17 hand-built `animate-pulse` skeletons, 13 with hand-rolled
error state. **~30–45 call sites.**

**Adoption plan (per-view, incremental):** (1) list/table views (`my-works`, `projects`, `releases`,
`reports`, `notifications`, `trash`) first to validate the API; (2) dashboard/console renders
(`dashboards/*`, `leadership-console`, `admin-ops`, cockpit tabs); (3) detail/management panels
(`status-management-tab`, `settings3/*`, `service-view`, `support-inbox`). Each replaces its
`if(loading)`/`if(error)`/empty-check triad with one `<AsyncBoundary …>`. Pairs naturally with the
AppShell feature-hook extraction (§1).

---

## 4. Token & structure debt (W2-f)

- **3 hex in `status-management-tab.jsx`** — all the **same** literal `#94A3B8` (Tailwind slate-400,
  **not** a bSmart token) at L44 (new-status form default), L117 (reset after add), L259 (color-input
  fallback). It feeds an `<input type="color">` + is persisted as a hex string, so it can't be a
  Tailwind class. The status `category` default is `'TODO'`, whose palette token is `status.todo`
  `#5A6B7E` (= `neutral-600`). **Fix:** define a `STATUS_CATEGORY_COLORS` map (or read the resolved
  token) so the form default matches the rendered TODO color — one source of truth, no raw hex.
  (Caught by `guardrails.sh` WARN, not ESLint error — non-blocking baseline debt today.)
- **The "48-file legacy warn block" = ESLint `worksViewStructureLegacy`** (`eslint.config.js`
  L187–243), **exactly 43 files** (TD-021), registered last so it overrides the error-level rules. It
  downgrades four custom rules from `error`→`warn` for legacy `src/views/**`: `works-view/no-raw-table`
  (use `<DataTable>`), `no-raw-button` (use `<Button>`), `no-inline-card-chrome` (use `<Card>`),
  `sanctioned-page-widths` (only `max-w-workspace`/`max-w-reading`). For **new** views these are
  `error` (CI-blocking). **Fix (per-file, incremental):** migrate each file's raw primitives →
  sanctioned components, delete its entry from the L191–235 array; when empty, delete the whole block
  (L187–243) + its export entry (L290) → all four rules become `error` for `src/views/**`, TD-021 closed.

---

## 5. Slicing — what's independent vs. gated

**Independent of Phase 1 (start when approved, isolated worktrees):**
1. Token debt: 3 hex → token (tiny); begin the 43-file `worksViewStructureLegacy` migration (per-file).
2. Add the bundle-budget gate.
3. `locales.js` by-language split.
4. AsyncBoundary adoption (list views first).
5. AppShell **leaf** extractions (PR order §1 steps 1–5): providers, session, auth, public routes,
   chrome (TopBar/NavRail/CommandCenter), overlays, shortcuts, contexts, quiet feature hooks.

**Gated on the live FE feature branches merging (not Phase 1):**
6. `BlockEditor` lazy-load + `knowledge-view` modal lazy-loading (after knowledge/block-editor branches).
7. AppShell **contested** feature hooks: work-items core, dashboards/Today, knowledge (§1 step 6).

---

## 6. Verification (per PR)

`npm test` (Vitest) for touched units + the `app-architecture.test.js` guard (repointed in the
`ModeRail`/`pathToView` relocation PR) → `npm run build` (proves the new lazy chunks resolve and
nothing regressed to eager) → `npm run lint` (token + `works-view` structure rules) → the new
bundle-budget gate → adversarial re-verify that behavior + the five interactive states are unchanged
(RB-30 §6, roadmap §10.5). For AppShell extractions: manual smoke of the affected views, since the
guard test is string-based, not behavioral.

---

## 7. Decisions for Deepak

- **a.** Approve the independent block (§5 items 1–5) to start ahead of Phase 1 close.
- **b.** Confirm AppShell leaf-first PR order (§1) and that contested feature hooks (work-items/Today/
  knowledge) wait for their live branches to merge.
- **c.** Confirm the bundle-budget mechanism (`size-limit` vs Rollup `manualChunks` +
  `chunkSizeWarningLimit`) — recommendation: `size-limit` in CI for an explicit, reviewable budget.
- **d.** Confirm the `locales.js` sync→async `translate()` change is acceptable (keeps `en` static as
  fallback; behavior preserved by the existing missing-key→English contract).
