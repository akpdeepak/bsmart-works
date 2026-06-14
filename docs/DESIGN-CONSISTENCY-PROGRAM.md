# bSmart Works — Design-Consistency Convergence Program

> **Goal:** one look, one feel, one interaction model across **every** surface, page, and feature —
> so the app reads as a single, calm, professional product rather than 95 views that each invented
> their own chrome.
>
> **Thesis:** this is a **convergence** problem, not a redesign. The design *system* already exists
> and is machine-enforced; the gap is **adoption** across the views. We finish converging the app
> onto the system, fill the few missing shared primitives, and lock it so it cannot drift again.
>
> Status: **proposed** · owner: Deepak Pandey · created 2026-06-14 · sibling of
> [`UX-PROGRESS.md`](./UX-PROGRESS.md) (the live extraction log) and governed by
> [`30-DESIGN.md`](../ai-rules/rulebooks/30-DESIGN.md) (RB-30, the canonical design system).

---

## 0. Why this exists (and what it is *not*)

The design system is not the problem. As of the 2026-06-14 scan the foundations are strong and
already gated in CI:

- **Tokens are single-source and enforced.** `tailwind.config.js` + `src/index.css` hold every
  colour / spacing / radius / shadow / duration / z-index / width token. ESLint + `guardrails.sh`
  block raw hex, `gray-*`, `works-*`, and arbitrary `z-[]` / `p-[]` at save · pre-commit · CI.
- **Canonical primitives exist and are a11y-correct:** the three-zone shell
  (`templates/three-zone-layout.jsx`), `Modal`, `FormField`, `Input`, `Button`, `Badge`,
  `EmptyState`, `Skeleton`, `Toast`, `ErrorBoundary`, `Collapsible`, `Avatar`.
- **Dark mode is universal** (`dark:` pairs everywhere; no hard-coded darks).
- **The `cva + cn()` pattern** (see `atoms/button.jsx`) is the agreed component model.
- **The convergence is already ~60% done:** `App.jsx` is down from ~8,400 → **~4,300 lines**, with
  **~95 views extracted** into `src/views/` and emoji-as-icons largely replaced by Lucide
  (see [`UX-PROGRESS.md`](./UX-PROGRESS.md), [`UX-CODEBASE-ANALYSIS.md`](./UX-CODEBASE-ANALYSIS.md)).

**This program is therefore NOT** a new visual language, a token rework, or a feature redesign. It
is the disciplined finish of convergence + the enforcement that keeps it converged. The visual
target remains the **"Calm Cockpit"** direction (navy/orange single-signal accent, Lucide icons,
expand-in-place, persona "Today", role-based nav) captured in the interactive mockup at
`C:\Users\user\bsmart-mockup\index.html`. **No feature is removed** — the Feature Parity Ledger
(RB-20 §1) still applies; we change *how* surfaces are built, never *what* they do.

---

## 1. Current-state scorecard (evidence, 2026-06-14 scan)

| Dimension | State | Evidence (approx.) |
|---|---|---|
| Tokens (colour/space/radius/z/width) | ✅ Canonical, enforced | single source; only **3 raw hex** repo-wide (`organisms/status-management-tab.jsx`) |
| Three-zone shell | ✅ Canonical | `templates/three-zone-layout.jsx`, used app-wide |
| Modal / FormField / Empty / Skeleton / Toast / ErrorBoundary | ✅ Exist, a11y-correct | `components/works/**` |
| Dark mode | ✅ Universal | `dark:` pairs everywhere |
| **Shared `Card`** | ❌ Missing | **~85 hand-rolled card blocks** across **29+ views** |
| **Shared `Tabs`** | ❌ Missing | tab bars rebuilt per view (`admin-ops`, `compliance`, `dashboard`, `sprint`, …) |
| **Shared `DataTable`** | ❌ Missing | hand-rolled `<table>` per view |
| **Shared `PageHeader`** | ❌ Missing | headers hand-coded; `h1` size/weight varies |
| Content width | ⚠️ Drifted | **~10 distinct `max-w-*`** values; RB-30 sanctions only `max-w-7xl` (dashboards) + `max-w-[880px]` (reading) |
| Page padding | ⚠️ Drifted | `p-4 / p-6 / p-8` mixed at page level |
| `Modal` adoption | ⚠️ Low | imported by **~5 / 95 views**; others build inline dialogs |
| `Button` adoption | ⚠️ Mixed | **~55 inline `<button>`** vs ~114 `<Button>` |
| Error states | ⚠️ Partial | rendered in **~29 / 95 views** |
| Loading states | ⚠️ Partial | `Skeleton`/`animate-pulse` in **~19 / 95 views** |
| Control labelling (a11y) | ⚠️ Partial | systematic `aria-label`/`htmlFor` in **~29 / 95 views** |
| `cva` adoption | ⚠️ Low | **4 / ~101** components (`button`, `badge`, `input`, `status-badge`) |
| Storybook coverage | ⚠️ Low | **4 / ~101** components have stories |

> **Read the metric correctly.** The target is **zero hand-rolled cards / tables / headers / dialogs
> inside `views/`**, not "100% `cva`". Atoms with no variants don't need `cva`; the `cva` count is a
> guide for *stateful* components only.

---

## 2. Definition of "consistent" (exit criteria)

A surface is **converged** when all of the following hold — and the whole app is converged when
every surface passes:

1. **Structure** — renders through one `PageLayout` (shell → `PageHeader` → content), with content
   width = exactly one of the two sanctioned values and one padding rhythm.
2. **Primitives** — no hand-rolled card / table / tab-bar / dialog / icon-button; all come from
   `components/works/**`.
3. **States** — every data region handles the five states it can be in: **default · loading
   (`Skeleton`) · empty (`EmptyState`, with a next action) · error (toast/inline, says what + what
   next) · partial**; every interactive element has the five interaction states (RB-30 §1).
4. **Tokens** — zero raw hex / arbitrary values (already lint-gated).
5. **A11y** — every control labelled; keyboard-operable; visible focus; WCAG 2.1 AA contrast
   (RB-30 §6); the view passes ESLint with **no `eslint-disable`**.
6. **Theme** — light + dark both verified.

---

## 3. The program — four workstreams

### WS1 · Fill the missing shared primitives  *(highest leverage)*
Each new primitive deletes dozens of hand-rolled copies. Build in `cva + cn()`, dark-mode-complete,
a11y-correct, with a Storybook story. These are the already-identified deferred items **A4 / C5 /
E3** from `UX-PROGRESS.md`.

| Primitive | Replaces | Notes |
|---|---|---|
| `Card` (`elevated` / `outlined` / `flat`) | ~85 inline card blocks | token padding/radius/shadow; header/body/footer slots |
| `PageHeader` | per-view headers | title + breadcrumb slot + actions slot; one `h1` scale |
| `Tabs` | per-view tab bars | roving-tabindex, `aria-selected`, active indicator |
| `DataTable` (+ head/body/row/cell) | hand-rolled `<table>` | sticky header, sortable, zebra, `overflow-x-auto` |
| `IconButton` | icon-only `<button>`s | enforced `aria-label`; sizes 16/20/24 |
| `Drawer` / `SidePanel` | inline right-panels | wraps the shell's overlay + collapse pattern |
| `Confirm` (over `Modal`) | ad-hoc confirm dialogs | pairs with the existing `useDialog()` |
| Form set: `Checkbox` `Radio` `Toggle` `Select` | raw inputs | complete the `FormField` family |
| `Badge` consolidation | `status` / `priority` / `role` / `meta` badges | one `Badge` with `variant`, semantic colours |

### WS2 · Standardise the page skeleton  *(one structure, every view)*
Introduce a single `PageLayout` that composes shell → `PageHeader` → a content wrapper exposing only
two widths (`width="dashboard"` → `max-w-7xl`, `width="reading"` → `max-w-[880px]`) and one padding
rhythm. Views stop hand-setting width / padding / headers. This is what makes pages *feel* the same.

### WS3 · Adopt across all ~95 views  *(the mechanical convergence)*
View-by-view, using the proven **extract-loop** from `UX-PROGRESS.md`
(*byte-identical extract → ESLint `no-undef` proves the prop set → RTL test → live smoke on real
data → small squash-merge*). Per view: swap inline cards/buttons/tables/tabs/dialogs for primitives;
add the missing loading/empty/error branches and `aria-label`s; remove the legacy `eslint-disable`.

**Start with the four biggest exemplars** (~20% of view code, and they contain every pattern):
`pm-view.jsx` · `bql-view.jsx` · `admin-ops-view.jsx` · `compliance-view.jsx`.

### WS4 · Lock it so it cannot regress  *(the part that makes consistency permanent)*
Consistency that depends on memory decays (Orchestrator §0). Wire each rule to a check:

- **New structural guardrails** (extend `eslint.config.js` / `guardrails.sh`), scoped to `views/`:
  - ban raw `<table>` (use `DataTable`);
  - ban inline card-chrome (`bg-white …border…rounded-(lg|xl)` cluster) — use `Card`;
  - ban raw `<button>` in views — use `Button` / `IconButton`;
  - restrict page-level `max-w-*` to the two sanctioned values;
  - warn on a data view with no empty/error branch.
- **Re-enable guardrails on 100% of `views/`** — delete every remaining `/* eslint-disable */`.
- **Storybook → visual-regression**: a story per primitive + per converged view state, with
  Chromatic (or equivalent) so drift is caught visually in CI. Target ≥ 50 stories.
- **One-page Component-System guide** (`docs/COMPONENT-SYSTEM.md`): when `cva` vs `cn()`,
  atom/molecule/organism, the per-component a11y checklist, icon sizes (16/20/24/32), and the token
  usage notes (e.g. *`neutral-400` is placeholder/disabled only — never readable text*).

---

## 4. Sequencing

| Phase | Scope | Maps to |
|---|---|---|
| **0 — Prove it (days)** | Build `Card` + `PageHeader` + `Tabs`; add the 3 structural lint rules (warn-only); pilot-migrate the 4 exemplar views | A4 (start) |
| **1 — Core primitives (1–2 wk)** | `DataTable` + `Drawer` + `IconButton` + form set; consolidate `Badge`; migrate next ~20 data-heavy views | A4 / C5 / E3 |
| **2 — Breadth (2–3 wk)** | Remaining views; app-wide loading/empty/error + `aria-label` sweep; Storybook + visual regression | F4 / E1 |
| **3 — Harden (ongoing)** | Flip structural lint rules to **error**; remove all `eslint-disable`; `React.lazy` per route; dark-mode contrast audit | G2 / H1 / J |

Each step is a **small, single-purpose, lint-clean PR** through RB-05 — no big-bang rewrite, no
feature change, Feature Parity Ledger respected.

---

## 5. Tracking

Progress is logged in [`UX-PROGRESS.md`](./UX-PROGRESS.md) (newest-first), tagged `[consistency]`.
Headline metrics to drive to zero / 100%:

- inline card blocks in `views/` → **0**
- raw `<table>` / raw `<button>` in `views/` → **0**
- distinct page-level `max-w-*` values → **2**
- views with full loading/empty/error coverage → **100%**
- views with `eslint-disable` → **0**
- Storybook stories → **≥ 50**, with visual-regression in CI

---

## 6. Governance & references

- **Canonical design law:** [`30-DESIGN.md`](../ai-rules/rulebooks/30-DESIGN.md) (RB-30). This program
  *adopts* it; it does not redefine it.
- **Process:** [`05-TASK-EXECUTION.md`](../ai-rules/rulebooks/05-TASK-EXECUTION.md) (RB-05) — every
  migration is a gated PR. Scope discipline: change only the surface in hand (RB-20 / RB-10 §9).
- **Brand origin:** `docs/brand/brand-and-identity.md`.
- **Visual target:** `C:\Users\user\bsmart-mockup\index.html` (Calm Cockpit, desktop).
- **History:** [`UX-CODEBASE-ANALYSIS.md`](./UX-CODEBASE-ANALYSIS.md) (the 2026-06-05 diagnosis that
  started the convergence) and [`UX-PROGRESS.md`](./UX-PROGRESS.md) (what has shipped since).

---

*One product, one design system, enforced by machines, not memory. This program is how we get the
last 40% of the app to honour it — and how we keep it there.*
