# bSmart Works — UI/UX Holistic Analysis & Improvement Plan

> **Historical baseline (2026-06-05).** This is the original diagnostic audit that *justified* the
> UI/UX program. Its findings are now incorporated into [`UIUX-BENCHMARK-ROADMAP.md`](./UIUX-BENCHMARK-ROADMAP.md)
> (the current reference roadmap, Parts A–G) and tracked in [`UIUX-EXECUTION-PLAN.md`](./UIUX-EXECUTION-PLAN.md)
> (the live ledger). Read this for *why* the program exists; read those two for *what to do now*.

> Verified against the live codebase on branch `claude/ui-ux-codebase-analysis` (synced from
> `origin/main`, head `b488570`). Every finding below carries `file:line` evidence. Measured against
> the design rulebook **RB-30**, the brand spec (`docs/brand/brand-and-identity.md`), the iteration
> guide, and industry UI/UX best practice.
>
> Author: UX/codebase audit · Date: 2026-06-05

---

## 0. The one-sentence diagnosis

**A mature, well-built design system already exists — and the application almost entirely ignores
it.** `works-frontend/src/App.jsx` is a single **8,378-line** file whose `App()` component spans
lines 118–7520 (one component, **253 hooks**, ~30 views) and opens with `/* eslint-disable */`
(`App.jsx:1`) — so the entire product **bypasses every lint, accessibility, and design-token
guardrail** that RB-30 §"What's enforced here" promises. The polished primitives (`SidebarNav`,
`ThreeZoneLayout`, `Input`, `FormField`, `SearchInput`, `Skeleton`, `Collapsible`, `Badge`) are
written, tested — and **unused**. Almost everything you want (calm, minimal, fresh, soothing,
professional, productive) is *already designed*; the gap is **adoption + decomposition**, not
invention.

This is the highest-leverage fact in the whole report: we are not missing a design language, we are
failing to apply the one we have. The fix is mostly *convergence onto existing components*, which is
lower-risk than a redesign.

---

## 1. How today's experience scores against your goals

| Your goal | Today | Why (evidence) |
|---|---|---|
| **Calm / soothing** | ✗ | 25-item flat sidebar of mismatched **emoji** (`App.jsx:2283–2330`), no breathing room or grouping when collapsed; 83× duplicated card chrome competes for attention. |
| **Minimal / simple** | ✗ | Every feature dumped into one flat nav; no progressive disclosure; no role-based filtering — a developer sees Compliance, SLA, Service Desk, Integrations. |
| **Fresh / visually engaging** | ✗ | Emoji icons read as "toy", not "tool" — directly violates brand §5.1 ("operational, not playful… no emoji"). Inconsistent spacing (p-4/p-5/p-6 mixed) makes surfaces feel unsettled. |
| **Easy to navigate** | ✗ | **No routing** — views are local state (`App.jsx:145`); nothing is bookmarkable, browser back/forward dead, refresh resets to Home. No breadcrumbs, no ⌘K, no `c`/`/`/`g p` shortcuts the brand spec §5.2 promises. |
| **Efficient / productive** | ◐ | Good: optimistic delete+undo, drag-drop. Bad: most mutations trigger **full-list refetch**; **31+ silent `.catch(()=>{})`** hide failures; debounced saves give no confirmation. |
| **Professional** | ◐ | Strong tokens & Button component; undermined by emoji, AA contrast failures (346× `text-neutral-400`), and ad-hoc modals. |
| **Easy to adopt / work** | ✗ | Not responsive (~46 breakpoint usages in 8,378 lines); no mobile shell; forms lack per-field validation & required indicators. |
| **Accessible (WCAG 2.1 AA)** | ✗ | `eslint-disable` turns a11y lint off for the whole app; 19 clickable `<div>`s, ~89 unlabeled inputs, modals with no focus trap/Escape, no `prefers-reduced-motion`, no `aria-live` toasts. |

**Reconciliation of an apparent tension:** you asked for "exciting / engaging" while the brand spec
mandates "operational, not playful." These are compatible. The excitement of a *professional* tool
comes from **speed, responsiveness, confidence, and polish** — instant feedback, smooth 220 ms
transitions, zero jank, never losing your place — **not** from confetti or emoji. Every
recommendation here pursues "calm confidence," which is the engaging-for-power-users reading of your
brief and is exactly what the spec calls for.

---

## 2. The best-practice framework this audit measures against

A holistic UI/UX program has nine layers. We grade each below.

1. **Foundations** — design tokens, type scale, spacing, color, elevation, motion. *(Strong, partly bypassed.)*
2. **Component system** — atomic, reusable, themable, accessible primitives. *(Built, unused.)*
3. **Information architecture** — grouping, hierarchy, progressive disclosure, role-aware nav. *(Weak.)*
4. **Navigation & wayfinding** — routing, deep-links, breadcrumbs, command palette, keyboard. *(Largely absent.)*
5. **Interaction design** — forms, modals/drawers, motion, density, tables. *(Ad-hoc.)*
6. **State & feedback** — loading/empty/error/success/optimistic, the "five states." *(Inconsistent.)*
7. **Accessibility** — WCAG 2.1 AA, keyboard, focus, ARIA, reduced motion. *(Off for the monolith.)*
8. **Responsive / adaptive** — mobile, tablet, desktop, dark mode. *(Desktop-only; dark mode ~80%.)*
9. **Performance (perceived & real)** — code-split, optimistic UI, skeletons, no layout shift. *(At risk.)*

---

## 3. Findings & improvements, by dimension

Each item: **what's wrong → evidence → what good looks like.** Priority tags: **P0** (blocks the
goal / a11y or trust break), **P1** (major UX lift), **P2** (polish).

### A. Architecture & design-system adoption — the root cause **(P0)**

- **A1. The monolith bypasses all enforcement.** `App.jsx:1` is `/* eslint-disable */`. RB-30 and
  the Orchestrator §4 promise ESLint (tokens, a11y, no-emoji) and `guardrails.sh` block merges — but
  the file that *is* the app is exempt. **Fix:** decompose `App.jsx` into per-view route modules
  under lint; delete the blanket disable as each slice is extracted. This is already logged as
  tech-debt (`docs/PARKED.md`, "App.jsx is a ~6700-line monolith").
- **A2. Built-but-unused primitives.** Confirmed zero app usage of `ThreeZoneLayout`
  (`templates/three-zone-layout.jsx`), `SidebarNav` (`organisms/sidebar-nav.jsx`), `Input`
  (`atoms/input.jsx`), `FormField`, `SearchInput`, `Skeleton`, `Collapsible`. Meanwhile `App.jsx`
  uses **169× raw `className="input"`**, builds its own white sidebar (`App.jsx:2210–2282`), and
  inlines `animate-pulse` skeletons. **Fix:** converge — adopt `ThreeZoneLayout` + `SidebarNav` for
  the shell; replace raw inputs with `FormField`+`Input`; replace inline skeletons with `Skeleton`.
- **A3. 253 hooks in one component.** `App()` re-renders the entire app on any state change — a real
  performance and "smoothness" tax, and the reason interactions can feel heavy. **Fix:** route-split
  so each view owns its state and data; lazy-load views (`React.lazy`) for fast first paint.
- **A4. 83× duplicated card chrome** (`bg-white dark:bg-neutral-800 border … rounded-xl p-5`) and 4
  inline badge variants (`TypeBadge`, `PriorityBadge`, `RoleBadge`, plus `StatusBadge`). **Fix:**
  one `<Card>` atom, one `<Badge tone>` for all chips. Consistency *is* calm.
- **A5. Dead code.** `App.css` is leftover Vite scaffolding (raw px, `.counter`, vite-logo styles)
  and is **not even imported**. **Fix:** delete.

### B. Information architecture & navigation **(P0/P1)**

- **B1. 25-item flat emoji sidebar** (`App.jsx:2283–2330`) with semantic collisions: ⚡ = Active
  Sprint *and* Automations; 📋 = Board *and* PM Artifacts; ⚙ = Workflows *and* Settings. Section
  labels vanish entirely when collapsed. **Fix:** adopt the existing sectioned `SidebarNav` and
  extend its `NAV_SECTIONS` (it currently covers ~15 of ~30 views). Group by workflow: *My Work ·
  Plan & Track · Insights · Service & Compliance · Configuration · Workspace*. Collapse advanced
  groups by default (progressive disclosure).
- **B2. No role-based nav.** All items show to everyone regardless of tier. **Fix:** filter nav by
  role/tier (the dashboard selector already knows `minTier`, `App.jsx:2459`). A developer should not
  see SLA/Compliance/Service Desk.
- **B3. No routing / deep-linking (P0).** `const [view] = useState('dashboard')` (`App.jsx:145`);
  the only `history` call is the password-reset redirect (`App.jsx:668`). **Fix:** introduce a
  router (e.g. React Router) so every view + key entity (work item, sprint, dashboard) has a URL;
  enables back/forward, refresh-safety, sharable links, and breadcrumbs.
- **B4. Thin top bar / weak wayfinding.** Header (`App.jsx:2358–2436`) has search + AI bar + create
  + bell + user menu, but **no breadcrumbs, no current-view title, no workspace indicator, no global
  role switcher.** **Fix:** add a breadcrumb/title zone and surface workspace + role in the header.
- **B5. No command palette / keyboard model.** Brand §5.2 promises `c` create, `/` search, `g p` go
  to projects, ⌘K. None exist (only local Enter handlers). **Fix:** add a ⌘K palette (navigate +
  quick-create + search) and the global shortcut set. This is a *huge* power-user productivity and
  "excitement" win.

### C. Visual language: emoji → Lucide, tokens, density **(P0/P1)**

- **C1. ~86–115 emoji used as UI icons** across nav, dashboard `StatCard`s, role tabs, empty states,
  work-item types, and the password reveal (🙈/👁, `App.jsx:2163`). This is the single biggest "toy,
  not tool" signal and violates RB-30 §8 *and* brand §5.1. **Fix:** replace every emoji with a Lucide
  icon at the standard sizes (16 inline / 20 button / 24 section), `aria-hidden` when decorative.
- **C2. AA contrast failures.** 346× `text-neutral-400` for readable text on light surfaces — RB-30
  §2 explicitly bans neutral-400 for text (it's the disabled/placeholder color). **Fix:** promote
  body/secondary text to `neutral-600`/`neutral-900`; reserve `neutral-400` for disabled/placeholder.
- **C3. Token leaks.** ~8 raw hex defaults (e.g. `#0B2F5C`, `#E94E1B`, a stray `#6b7280` at
  `App.jsx:1348`) and **40+ arbitrary `text-[10px]`**. **Fix:** use `brand-*` tokens for internal
  defaults (user-supplied branding hex is fine); standardize tiny text to `text-xs` (or add a token).
- **C4. Inconsistent density.** Padding mixes p-4/p-5/p-6 with no rule; max-widths swing 2xl→7xl
  arbitrarily. **Fix:** one density policy — reading/detail `max-w-[880px]` (RB-30 §4), dashboards
  `max-w-7xl`, cards `p-4`/`p-6`, sections `space-y-6`.
- **C5. Tables.** Only 1 of ~10 tables has a sticky header; none are sortable; rows lack scannable
  separators; audit log uses `text-[10px]`. **Fix:** a shared `<DataTable>` with sticky header,
  sortable columns, zebra/hover rows, and per-row actions.

### D. Accessibility — WCAG 2.1 AA **(P0)**

- **D1. 19 clickable `<div>`/`<span>`** with `onClick` but no `role`, keyboard handler, or focus ring
  (list rows, cards, articles — e.g. `App.jsx:2487, 2881, 5022, 5378, 7598, 8151`). Keyboard and
  screen-reader users can't operate them. **Fix:** use real `<button>`/`<a>` (or `role`+`tabIndex`
  +`onKeyDown`) with focus-visible.
- **D2. Modals are inaccessible.** The `Modal()` helper (`App.jsx:7532`) has **no `role="dialog"`,
  no `aria-modal`, no Escape, no focus trap, no focus restoration, no scroll lock**, and an emoji ✕
  close with no `aria-label`; hardcoded `z-50` instead of `z-modal`. Only 2 of 12 dialogs set proper
  ARIA. **Fix:** one accessible `<Modal>` (focus trap, Escape, restore focus, scroll lock,
  `aria-modal`, labelled title, backdrop close, `z-modal`). Move >50-line flows (New Item, New
  Project) into a **right-side drawer/page**, not a modal.
- **D3. ~89 unlabeled inputs** (~40% of form controls) — placeholder-only. **Fix:** route all
  through `FormField` (it already wires `<label htmlFor>`, error, required `*`, `aria-describedby`,
  `aria-invalid`, helper text).
- **D4. Toasts not announced.** `showToast` (`App.jsx:489`) renders without `role="alert"`/
  `aria-live` — screen readers miss every success/error. **Fix:** `aria-live="polite"` region (assertive for errors).
- **D5. No `prefers-reduced-motion`** anywhere. **Fix:** global reduced-motion guard that neutralizes
  transitions/animations (WCAG 2.3.3).
- **D6. Decorative emoji not hidden.** Legacy `NavItem` (`App.jsx:7520`) renders the emoji in a
  `<span>` with no `aria-hidden`, so SR announces "house". (Moot once C1 lands.)

### E. Interaction: forms, modals, motion **(P1)**

- **E1. Forms reinvented 169×** with raw inputs — no per-field validation, no error linkage, no
  required indicator, no submit loading state (Button has `loading`, rarely used). **Fix:** adopt
  `FormField`+`Input`; show inline errors; disable+spin submit during async; confirm on success.
- **E2. Motion is hardcoded & off-spec.** `duration-[120ms]`/`[150ms]` and a one-off `ease-out-quint`
  instead of the token scale (fast 150 / base 220 / slow 320) the config already defines; many
  transitions omit duration. **Fix:** use `duration-fast/base/slow`; standardize easing; honor D5.
- **E3. Modal vs drawer mismatch** (see D2) — complex creation crammed into centered modals. **Fix:**
  the `ThreeZoneLayout` panel already exists for exactly this (slide-in detail/edit). Use it.

### F. State & feedback — the "five states" **(P0/P1)**

- **F1. 31+ silent `.catch(()=>{})`** (e.g. `App.jsx:454–457` and many fetchers) — failures vanish.
  **Fix:** every catch surfaces a toast/inline error; add a top-level **Error Boundary**.
- **F2. Inconsistent errors** — toast vs `setMfaSetupMsg` vs `setForgotMsg` (`App.jsx:638/648/656`).
  **Fix:** one error-presentation contract (toast for transient, inline for form/field).
- **F3. Loading inconsistency** — good column skeletons (`App.jsx:2966`) but a literal spinner in the
  public dashboard (`App.jsx:7780`, against the "no spinners" rule) and text-only "Loading…" in
  several places that cause layout shift. **Fix:** `Skeleton` everywhere, matched to final layout.
- **F4. Weak empty states** — several lists show "Backlog is empty."/"No runs yet." with no next
  action; `EmptyState` (`App.jsx:72`) is good but not used uniformly, and some empties use emoji
  icons. **Fix:** every empty state = why-empty + primary action + Lucide icon.
- **F5. Refetch-on-mutation jank** — create/update/delete generally refetch the whole list (e.g.
  `App.jsx:938/966/1071`). **Fix:** optimistic updates via TanStack Query cache (`apiClient` already
  uses it) + targeted invalidation; show success confirmation (incl. debounced saves, `App.jsx:755`).

### G. Responsive / adaptive & dark mode **(P1)**

- **G1. Not responsive.** ~46 `sm/md/lg` usages across 8,378 lines; fixed `w-56`/`w-12` sidebar, no
  hamburger/drawer, `w-72` header search overflows mobile. **Fix:** responsive shell — sidebar
  collapses to a drawer under `md`, fluid header, responsive content padding; verify at 375/768/1280.
- **G2. Dark mode ~80%** — `dark:` is broad but with gaps; no in-product toggle surfaced beyond the
  user menu. **Fix:** audit remaining light-only surfaces; confirm AA contrast in dark too.

### H. Performance (perceived & real) **(P1)**

- **H1.** No code-splitting; all ~30 views + charts/pdf/html2canvas load eagerly. **Fix:** `React.lazy`
  per route; lazy-load heavy export libs (`jspdf`, `html2canvas`) on demand.
- **H2.** Whole-app re-renders from the 253-hook root (A3). **Fix:** route-split; memo where needed.
- **H3.** Validate against RB-40 §5 NFR budgets (page load P95 800 ms, board drag P95 150 ms) once
  decomposed — they're currently untested on the frontend.

### I. Content & microcopy **(P2)**

- Mostly solid and on-brand. Tighten: button verbs ("Create work item" not "Submit"), empty-state
  next-actions (F4), and error copy that says *what to do* (RB-20 §4). Avoid the playful "✓"/"✨"
  tone the brand spec bans.

### J. Enforcement & guardrails — make it stick **(P0)**

- The reason this drifted is that enforcement was switched off for the one file that matters. As each
  view is extracted: (1) remove its code from the `eslint-disable` blast radius; (2) let the existing
  no-emoji / token / a11y ESLint rules and `guardrails.sh` gate it; (3) add the **workspace-scope**
  and **no-PII-in-events** checks RB-40 still lists as "to be added." Convergence without
  re-enabling the gate will simply rot again.

---

## 4. Prioritized roadmap (sequenced, low-risk first)

**Phase 0 — Stop the bleeding (P0, days):** delete dead `App.css`; add Error Boundary + `aria-live`
toasts; replace the `Modal()` helper with the accessible one (focus trap/Escape/scroll-lock/ARIA);
add `prefers-reduced-motion` guard. These are localized, high-trust wins.

**Phase 1 — Shell convergence (P0/P1):** adopt `ThreeZoneLayout` + `SidebarNav`; kill the emoji
sidebar; regroup + role-filter nav; add header breadcrumbs/title + workspace/role. Introduce routing
(URLs per view) and the ⌘K palette + `c`/`/`/`g p` shortcuts.

**Phase 2 — Visual + a11y pass (P1):** global emoji→Lucide; fix neutral-400 contrast; token-ize hex
& `text-[10px]`; one `<Card>` + unified `<Badge>`; convert clickable `<div>`s to buttons; label all
inputs via `FormField`.

**Phase 3 — Interaction depth (P1):** migrate forms to `FormField`+`Input` with inline validation;
move large flows into drawers; `<DataTable>` (sticky/sortable); optimistic mutations + success
confirmation; `Skeleton` everywhere; responsive/mobile shell.

**Phase 4 — Performance + decomposition (P1):** route-split `App.jsx` into per-view modules under
lint; `React.lazy`; lazy-load export libs; validate RB-40 §5 budgets; remove `eslint-disable` for
good and turn the guardrails back on.

---

## 5. Spec / rulebook traceability

| Finding cluster | Authority |
|---|---|
| Emoji→Lucide, tokens, density, z-index, five states | RB-30 §1/§2/§4/§8/§9; brand §5.1, §3 |
| WCAG 2.1 AA (focus, labels, ARIA, reduced motion) | RB-30 §6; brand a11y |
| Routing, shortcuts, predictability, ≤2-click nav | brand §5.2 |
| Empty/error honesty, defaults-for-80% | RB-20 §3/§4; brand §5.4/§5.5 |
| One design system, one apiClient, no inline fetch | Orchestrator §2.4; RB-10 §1 |
| NFR budgets, tenant-scope/field-level checks to add | RB-40 §1/§5 |
| Decompose the monolith; converge on SidebarNav | `docs/PARKED.md`, `TECH-DEBT.md` |

---

## 6. The good news (don't regress these)

Strong `Button` (all 5 states, focus-visible, loading) with 119 adoptions; clean token system in
`tailwind.config.js` (color, spacing, radius, shadow, **motion**, layout-width, z-index scales);
accessible `Input`/`FormField`/`SearchInput`/`SidebarNav`/`ThreeZoneLayout` already written and
tested; optimistic delete-with-undo; TanStack Query via a single `apiClient`; ~80% dark-mode reach.
**The destination is already in the repo — the work is to move into it.**
