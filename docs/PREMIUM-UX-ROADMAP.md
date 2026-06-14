# Premium UI/UX End-to-End Roadmap — bSmart Works

> **The single source for premium UI/UX work.** Saying *"execute the premium UI/UX design roadmap"*
> means running this whole program, in order: **Part A — Converge & Lock** (finish adopting the
> existing design system across every surface and lock it so it can't drift) then **Part B —
> Elevate** (premium depth built on the converged base).
>
> This doc **absorbs** the *Design-Consistency Convergence Program*
> (`docs/DESIGN-CONSISTENCY-PROGRAM.md`, now superseded as the execution entry point) and the prior
> premium enhancement themes into one ordered scope.
>
> Status: proposal · created 2026-06-14 · owner: Deepak Pandey · governed by RB-30
> (`ai-rules/rulebooks/30-DESIGN.md`), executed per RB-05.

---

## 0. Why this exists (and what it is *not*)

bSmart Works already has a **mature, machine-governed design system** — not a greenfield. So this is
a **convergence + elevation** program, never a redesign or a token rework:

- **Tokens are single-source and enforced.** `works-frontend/tailwind.config.js` + `src/index.css`
  hold every colour / spacing / radius / shadow / duration / z-index / width token; ESLint +
  `scripts/guardrails.sh` block raw hex, `gray-*`, `works-*`, arbitrary `z-[]` / `p-[]` at
  save · pre-commit · CI.
- **Canonical primitives + `cva`+`cn()` pattern exist** (`atoms/button.jsx`), dark mode universal,
  three-zone shell (`templates/three-zone-layout.jsx`) app-wide.
- **Convergence is ~60% done:** `App.jsx` ~8,400 → **~4,300 lines**, **~95 views extracted**,
  emoji→Lucide largely complete (`docs/UX-PROGRESS.md`, `docs/UX-CODEBASE-ANALYSIS.md`).
- **Standout surfaces already premium:** role-tuned Today dashboards, Scrum Master Cockpit,
  AI Studio (Assistants/Agents/Ask), BQL builder, pivot-chart engine, command palette (⌘K),
  real-time SSE presence + offline sync, i18n ×10 incl. Arabic RTL, PWA.

**Not** a new visual language, not a token rework, not a feature change — the Feature Parity Ledger
(RB-20 §1) holds. Visual target = the **"Calm Cockpit"** direction (navy primary, single orange
accent, Lucide, expand-in-place, persona "Today", role-based nav); brand origin
`docs/brand/brand-and-identity.md`.

---

## 1. Current-state scorecard (evidence, 2026-06-14 scan)

| Dimension | State | Evidence (approx.) |
|---|---|---|
| Tokens (colour/space/radius/z/width) | ✅ Canonical, enforced | only **3 raw hex** repo-wide (`organisms/status-management-tab.jsx`) |
| Three-zone shell | ✅ Canonical | `templates/three-zone-layout.jsx`, app-wide |
| Modal / FormField / Empty / Skeleton / Toast / ErrorBoundary | ✅ Exist, a11y-correct | `components/works/**` |
| Dark mode | ✅ Universal | `dark:` pairs everywhere |
| **Shared `Card`** | ❌ Missing | ~85 hand-rolled card blocks across 29+ views |
| **Shared `Tabs`** | ❌ Missing | tab bars rebuilt per view |
| **Shared `DataTable`** | ❌ Missing | hand-rolled `<table>` per view |
| **Shared `PageHeader`** | ❌ Missing | headers hand-coded; `h1` scale varies |
| Content width | ⚠️ Drifted | ~10 distinct `max-w-*`; RB-30 sanctions only `max-w-7xl` + `max-w-[880px]` |
| Page padding | ⚠️ Drifted | `p-4 / p-6 / p-8` mixed at page level |
| `Modal` adoption | ⚠️ Low | ~5 / 95 views; others build inline dialogs |
| `Button` adoption | ⚠️ Mixed | ~55 inline `<button>` vs ~114 `<Button>` |
| Error / Loading states | ⚠️ Partial | error ~29/95, loading ~19/95 |
| Control labelling (a11y) | ⚠️ Partial | systematic `aria-label`/`htmlFor` ~29/95 |
| `cva` adoption | ⚠️ Low | 4/~101 components |
| Storybook coverage | ⚠️ Low | 4/~101 components |
| Routing / deep-link | ❌ Missing | `App.jsx` syncs URL by hand; sub-state lost on reload |
| Inclusivity (colour-blind / high-contrast / SR charts) | ❌ Missing | charts colour-only; no HC theme |

> **Read the metric correctly:** the target is **zero hand-rolled cards/tables/headers/dialogs in
> `views/`**, not "100% `cva`". `cva` matters for *stateful* components only.

---

## 2. Definition of done (exit criteria)

A surface is **converged** when: (1) it renders through one `PageLayout` (shell → `PageHeader` →
content) with exactly one of the two sanctioned widths + one padding rhythm; (2) no hand-rolled
card/table/tab-bar/dialog/icon-button — all from `components/works/**`; (3) every data region
handles **default · loading · empty (with next action) · error (what + what-next) · partial**, and
every control has the five interaction states (RB-30 §1); (4) zero raw hex/arbitrary values;
(5) every control labelled, keyboard-operable, visible focus, WCAG 2.1 AA, **no `eslint-disable`**;
(6) light + dark verified. A surface is **premium** when, on top of converged, it meets its Part-B
items (density, motion, deep-link, inclusivity) where applicable.

---

## 3. The unified primitive library (build once, in `cva`+`cn()`, dark-complete, a11y, RTL, Storybook)

| Primitive | Part | Replaces / Adds |
|---|---|---|
| `Card` (`elevated`/`outlined`/`flat`) | A | ~85 inline card blocks; header/body/footer slots |
| `PageHeader` | A | per-view headers; title + breadcrumb slot + actions slot; one `h1` scale |
| `Tabs` | A | per-view tab bars; roving-tabindex, `aria-selected`, active indicator |
| `DataTable` (+ head/body/row/cell) | A→B | hand-rolled `<table>`; **B adds** sticky header, multi-sort, column resize/reorder/show-hide, row-select + bulk bar (`z-bulkbar`), inline edit, density-aware, **virtualized** |
| `IconButton` | A | icon-only `<button>`s; enforced `aria-label`; sizes 16/20/24 |
| `Drawer` / `SidePanel` | A | inline right-panels; wraps shell overlay + collapse |
| `Confirm` (over `Modal`) | A | ad-hoc confirm dialogs; pairs with `useDialog()` |
| Form set: `Checkbox` `Radio` `Toggle/Switch` `Select`/`Combobox` | A | raw inputs; completes the `FormField` family |
| `Badge` consolidation | A | status/priority/role/meta badges → one `Badge variant` |
| `Tooltip` | B | new; hover/focus, delay, `aria-describedby` |
| `Popover` | B | new; generic anchored overlay (`z-dropdown`/`z-panel`) |
| `DatePicker` | B | new; keyboard + locale + RTL |
| `Pagination` | B | new; list endpoints (RB-10 §4) |
| `Breadcrumb` | B | new; mode → surface → record (Nav theme) |
| `Progress` | B | new; determinate/indeterminate |
| `Slider` | B | new |
| `Alert` (standalone) | B | new; inline banner, semantic tones |

---

## Part A — Converge & Lock (the "last 40%")

### A-WS1 · Fill the missing shared primitives *(highest leverage)*
Build the **Part-A** rows above (Card, PageHeader, Tabs, DataTable base, IconButton, Drawer,
Confirm, form set, Badge). Each deletes dozens of hand-rolled copies. (Deferred items A4/C5/E3 in
`UX-PROGRESS.md`.)

### A-WS2 · Standardise the page skeleton
One `PageLayout` composes shell → `PageHeader` → content wrapper exposing only two widths
(`width="dashboard"` → `max-w-7xl`, `width="reading"` → `max-w-[880px]`) and one padding rhythm.
Views stop hand-setting width/padding/headers — this is what makes pages *feel* the same.

### A-WS3 · Adopt across all ~95 views *(mechanical convergence)*
View-by-view via the proven **extract-loop** (byte-identical extract → ESLint `no-undef` proves the
prop set → RTL test → live smoke on real data → small squash-merge). Per view: swap inline
cards/buttons/tables/tabs/dialogs for primitives; add missing loading/empty/error + `aria-label`s;
remove legacy `eslint-disable`. **Start with the 4 exemplars** (~20% of view code, all patterns):
`pm-view.jsx` · `bql-view.jsx` · `admin-ops-view.jsx` · `compliance-view.jsx`.

### A-WS4 · Lock it so it cannot regress
Wire each rule to a check (Orchestrator §0):
- **New structural guardrails** (`eslint.config.js` / `guardrails.sh`, scoped to `views/`): ban raw
  `<table>`, inline card-chrome cluster, raw `<button>`; restrict page-level `max-w-*` to the two
  sanctioned values; warn on a data view with no empty/error branch.
- **Re-enable guardrails on 100% of `views/`** — delete every remaining `eslint-disable`.
- **Storybook → visual regression** (Chromatic or equiv.); ≥ 50 stories.
- **One-page `docs/COMPONENT-SYSTEM.md`**: when `cva` vs `cn()`; atom/molecule/organism; per-component
  a11y checklist; icon sizes 16/20/24/32; token notes (e.g. `neutral-400` = placeholder/disabled
  only, never readable text).

---

## Part B — Elevate (premium depth on the converged base)

### Theme 1 — Design-system depth
- **1.1 Premium primitives:** the **Part-B** rows above (Tooltip, Popover, DatePicker, Pagination,
  Breadcrumb, Progress, Slider, Alert).
- **1.2 Elevation & density:** 3-level elevation ramp (`shadow-sm/md/lg` → resting/hover/overlay) +
  a global **density mode** (compact/comfortable/spacious) via a `useDensity()` hook + token-driven
  padding scale (generalize the board's existing toggle). *Gap:* data-dense DISCOM users want
  compact; today only the board offers it.
- **1.3 Motion choreography:** standardize panel/modal/toast/accordion entrance-exit on
  `duration-base` + `out-quint`; reserve `spring` for press/drag; add optimistic-update shimmer +
  success check-morph. Codify a motion "recipe."
- **1.4 Token additions:** `text-2xs`/`text-3xs` (retire `App.jsx` `text-[10px]` exemption);
  focus-ring alias; categorical chart-palette tokens (see §Colours).

### Theme 2 — Navigation & shell
- **2.1 Real router + deep-linkable state** (React Router / TanStack): view + sub-state (selected
  item, active tab, filters, panel-open) in the URL. *Large refactor → its own task;
  **stop-and-ask** (touches `App.jsx` / TD-003).*
- **2.2 Breadcrumbs** in the top context bar (uses the `Breadcrumb` primitive).
- **2.3 Command palette → action layer:** extend `command-palette.jsx` to actions (create, change
  status, assign, run saved view, toggle theme) + recent/frequent.
- **2.4 Persisted view state:** filters/sort/density/collapsed-rails/open-tab per surface
  (URL + per-user pref) so context survives reload and is shareable.

### Theme 3 — Data surfaces
- **3.1 Premium `DataTable`** (the Part-B upgrade of the converged table): virtualization, multi-sort,
  column ops, bulk bar, inline edit, density-aware. Unifies BQL results, reports, admin lists.
- **3.2 Board & list scale:** virtual scroll for 1000+ cards; lazy-load off-screen charts
  (`IntersectionObserver`). *Holds RB-40 §5 NFR budgets.*
- **3.3 Richer analytics:** comparison charts (plan-vs-actual, period-over-period),
  capacity/utilization heatmaps, workflow Sankey — **extend** the pivot engine
  (`src/lib/pivot*.js`, `molecules/*-chart.jsx`); interactive legend; drill-through into `DataTable`.
- **3.4 Detail-panel polish:** inline-edit affordances, presence cursors in panel, "what changed
  since you last viewed" diff on the Activity tab.

### Theme 4 — AI & inclusivity
- **4.1 Deeper, honest AI:** title/description suggestions, task breakdown, duplicate detection —
  each **routes through the AI Control Plane** with a visible verdict badge (`aiVerdictLabel`) and a
  documented deterministic fallback. *RB-40 §2: no fallback documented = it does not ship; AI
  budget/scope is **stop-and-ask**.*
- **4.2 Streaming affordances:** token-streaming, "thinking" states, stop/regenerate, cached-vs-live
  indicator — consistent across AI Studio, conversational dashboards, comment summarize.
- **4.3 Inclusivity → WCAG 2.2 AA (iter 20 Cap A):** colour-blind-safe categorical chart palette
  (never colour-only — pair shape/label); **high-contrast theme** as a third mode; **screen-reader
  chart fallback** (every chart exposes an accessible `<table>`); audit `neutral-400`-as-text misuse.

---

## Colours & visual specs (cross-cutting)
- **Keep the brand spine:** `brand-navy` primary; `brand-orange` the single sparing CTA accent
  (RB-30 §2) — do **not** broaden the accent palette.
- **Add, in tokens only:** categorical chart palette (6–8 hues, colour-blind-safe); high-contrast
  theme variables; `text-2xs`/`text-3xs`. All via `tailwind.config.js` — never raw hex (guardrail
  BLOCK).
- **Spec hygiene:** flip `z-[]` + arbitrary-spacing guardrails **WARN → BLOCK** once baseline clean.

---

## Unified sequencing (one ordered program)

| Phase | Scope | Notes |
|---|---|---|
| **0 — Prove (days)** | A-WS1 start: `Card` + `PageHeader` + `Tabs`; 3 structural lint rules (warn-only); pilot-migrate the 4 exemplar views | foundation |
| **1 — Core primitives (1–2 wk)** | A-WS1 finish: `DataTable` base + `Drawer` + `IconButton` + form set + `Badge`; A-WS2 `PageLayout`; migrate ~20 data-heavy views; token adds `text-2xs/3xs` | |
| **2 — Breadth (2–3 wk)** | A-WS3 remaining views; app-wide loading/empty/error + `aria-label` sweep; A-WS4 Storybook + visual regression; build Part-B premium primitives (Tooltip/Popover/Pagination/Breadcrumb/Progress/Slider/Alert/DatePicker) | |
| **3 — Harden + Premium P0 (ongoing)** | A-WS4 flip lint to error, remove all `eslint-disable`, `React.lazy` per route, dark-contrast audit; **Premium P0:** inclusivity (colour-blind palette, HC theme, SR charts), elevation/density spec, motion choreography, guardrail WARN→BLOCK | base now premium-ready |
| **4 — Premium P1** | breadcrumbs (2.2), command-palette actions (2.3), premium `DataTable` (3.1), density preference (1.2), surface polish pass | builds on converged base |
| **5 — Premium P2 (stop-and-ask)** | router/deep-linking (2.1, `App.jsx`), board virtualization (3.2), richer analytics (3.3), deeper/streaming AI (4.1–4.2) | each its own gated task |

Each step is a **small, single-purpose, lint-clean PR** through RB-05 — no big-bang rewrite, no
feature change.

---

## Tracking & metrics (drive to zero / 100%)
inline card blocks in `views/` → **0** · raw `<table>` / raw `<button>` in `views/` → **0** ·
distinct page-level `max-w-*` → **2** · views with full loading/empty/error → **100%** · views with
`eslint-disable` → **0** · Storybook stories → **≥ 50** w/ visual-regression · plus Part-B: charts
with SR fallback → 100%, themes shipped → light/dark/high-contrast. Logged newest-first in
`docs/UX-PROGRESS.md`, tagged `[consistency]` / `[premium]`.

---

## Governance & references
Canonical design law: RB-30 (`ai-rules/rulebooks/30-DESIGN.md`) — this program *adopts* it. Process:
RB-05 (every migration a gated PR; scope discipline RB-10 §9 / RB-20). Tenant/AI/NFR: RB-40 (§2 AI
fallback, §5 NFR budgets). DoD per item: tests prove behaviour · tokens not literals · WCAG AA ·
unauthorized + cross-tenant tests where data is touched · NFR budget on hot paths · CI green;
AI + structural items need a Deepak checkpoint (stop-and-ask). History:
`docs/UX-CODEBASE-ANALYSIS.md`, `docs/UX-PROGRESS.md`; absorbed: `docs/DESIGN-CONSISTENCY-PROGRAM.md`.

---

*One product, one design system, enforced by machines not memory — converge the last 40% onto it,
then elevate it to premium, and keep it there.*
