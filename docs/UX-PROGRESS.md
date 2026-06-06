# UX Overhaul — Progress Log

Companion to `docs/UX-CODEBASE-ANALYSIS.md` (the roadmap). Tracks what has shipped to
`main` so the state is always legible. Newest first.

> Verification norm: CI runner is degraded, so each change is verified **locally** before
> merge — `vite build` + `vitest` + `eslint` (changed component files) +
> `scripts/guardrails.sh` (exit 0). `App.jsx` is the `/* eslint-disable */` monolith, so it
> relies on build + guardrails + careful review.
>
> **A full local stack now runs for live smoke-testing** (the gap UX-PROGRESS kept flagging):
> native PostgreSQL 17 on `:5432` (`works_db`, Flyway-migrated to head, seeded), Spring Boot
> backend on `:8080`, and the Vite dev server on `:5173` (`.env.local` → `:8080`). Every
> decomposition/behaviour change below is **smoke-tested in the running app against real data**,
> not just build-green.

## Shipped (this session)

| PR | Area | Finding(s) | Summary |
|----|------|-----------|---------|
| #115 | Visual / a11y | C1, D2/D6 | Interactive symbol glyphs + inline emoji in `App.jsx` → Lucide with aria-labels (✕/✏/★/☆/arrows/✓ + 🔐📅📍🔍🛡🖼 etc.) |
| #116 | a11y contrast | C2 | All ~267 light-mode `text-neutral-400` readable text → `text-neutral-600 dark:text-neutral-400` (dark-safe; WCAG AA) |
| #117 | Visual | C1 | De-emoji label arrays (backlog quick-filters, PM-artifact tabs, board swimlane labels, blocker cell) → Lucide via an `Icon` field |
| #118 | Visual / product | C1 | Work-item **type icons**: emoji-string model → curated Lucide set + **icon picker**; back-compat map for legacy rows; **no DB migration** |
| #119 | State/feedback | F1/F2 | 95 silent `.catch(() => {})` → one `reportError` toast contract (single-slot, no spam) |
| #120 | Architecture | A3/J | Removed dead shell code (`NavItem`, `NavCollapsedCtx`, `navBadge`, `navDot`) orphaned by the SidebarNav swap |
| #121 | Responsive | G1 | Responsive shell: sidebar → off-canvas drawer under `md` (hamburger + backdrop + close-on-navigate); responsive header/search |
| #123 | a11y modals | D2/E3, D1 | Routed 5 inline `fixed inset-0` dialogs through the accessible `<Modal>` (focus trap, Escape, scroll lock, real backdrop) — cross-project dep, PM create, scheduled delivery, rule builder, new customer |
| #124 | a11y forms | D3/E1 | `Field` helper now wraps its control in the `<label>` (implicit association) — ~95 inputs become labelled for AT in one change |
| #125 | a11y | D1 | Workflow accordion header made keyboard-operable (`role=button`, `tabIndex`, `onKeyDown`, `aria-expanded`, focus ring) |

**Result:** `App.jsx` UI is emoji-free (only the legacy type-icon back-compat data map
references emoji); no light-mode `neutral-400` readable text remains; failures surface as
toasts; the shell works on mobile; 5/6 modals are accessible; `Field` inputs are labelled.

## Shipped — decomposition & live-smoke session (newest first)

| PR | Area | Finding(s) | Summary |
|----|------|-----------|---------|
| #127 | Bug / a11y | C1 fallout | **P0 home-dashboard crash fixed.** `lucide-react` 1.17 ships icons as `forwardRef` objects, so the `typeof Icon === 'function'` guards in `EmptyState`/`StatCard`/`PmArtifactList` rendered the icon object as a child → "Objects are not valid as a React child", blanking the dashboard. New pure `isIconComponent` helper (`lib/utils.js`, unit-tested) used at the 3 sites. Found only because the app now boots against a DB. |
| #128 | Architecture | A3/H2 | **Decomposition begun.** `EmptyState` (51 call-sites) extracted to a tested atom (`atoms/empty-state.jsx`); **Notifications** view → `views/notifications-view.jsx` (props-driven, lint-clean, RTL-smoke-tested). Pattern established: extract → eslint `no-undef` proves the prop set → RTL test → live smoke. |
| #129 | Architecture | A3/H2 (+A4 prep) | **Work-item type module + Trash view.** `TYPES`/icon-set/`resolveTypeIcon` → `lib/work-item-types.js`; `TypeBadge`/`TypeIcon` → `components/works/work-item-type.jsx` (lint surfaced & fixed `react-hooks/static-components` via `createElement`). **Trash** view → `views/trash-view.jsx`. Smoke: 319 `TypeBadge`s render on Backlog, type-icon picker intact, zero console errors. |
| #130 | Architecture | A3/H2 (+D3) | **Releases** view → `views/releases-view.jsx` (17 props, RTL-tested). Extraction also labelled the search box + project filter (`aria-label`). Smoke: two-pane list/detail renders, empty state + CTA work, zero console errors. App.jsx now 8,338 lines (was 8,520). |
| #131 | Architecture | A3/H2 (+D1/D3) | **PriorityBadge module + BQL view.** `PriorityBadge` → `components/works/priority-badge.jsx`; **BQL** view → `views/bql-view.jsx`. Extraction associated the Query `<label>`, labelled the filter-name input, and made result rows keyboard-operable. Smoke: live query `type = Bug` → 18 results with priority badges, zero console errors. App.jsx 8,267 lines. |
| #132 | Architecture | A3/H2 | **My Works** view → `views/my-works-view.jsx` (tabbed: Assigned / Starred / Mentions / Activity; 9 props, RTL-tested). Smoke: all four tabs render and switch, empty states correct, zero console errors. App.jsx 8,194 lines. |
| #133 | Architecture | A3/H2 | **Projects** view → `views/projects-view.jsx` (5 props, RTL-tested). Smoke: 2 real projects render with item counts + progress bars, zero console errors. App.jsx 8,144 lines. |
| #134 | Architecture | A3/H2 | **Sprint Reports** view → `views/reports-view.jsx` (7 props, RTL-tested). Smoke: velocity chart + sprint selector render across real sprints; clicking a sprint loads KPI cards + burndown; zero console errors. App.jsx **below 8,000 → 7,978 lines** (was 8,520 at session start). |
| #135 | Architecture | A3/H2 (+A4/D1) | **Shared helpers `StatCard` / `RoleBadge` / `Field` + `onPressKey`.** Extracted to `components/works/{stat-card,role-badge,field}.jsx` and `lib/utils.js` — foundational, unblocks the dashboard / settings / cockpits (StatCard 32×, Field 95×). Lint surfaced & fixed two hidden a11y issues (StatCard click-without-keys; cleaner interactive pattern). Smoke: dashboard StatCards + Workspace-Settings Fields/RoleBadges render, zero console errors. App.jsx 7,930 lines. |
| #137 | Architecture | A3/H2 (+C3) | **Home dashboard** (the flagship, 413 lines) → `views/dashboard-view.jsx` + `Avatar` atom (16×). 21 props across 5 role panels (developer/SM/PO/exec/admin); RTL-tested (tier-filtered tabs, loading, role switch). Lint surfaced & fixed an arbitrary `max-w-[150px]` (→ flex truncation). Smoke: all 5 role tabs load **real data** (Developer 5 open / Sprint 3; SM 35% health; Admin 2 members / 78 events), tab-switch refetches, zero console errors. App.jsx 7,930 → **7,533 lines** (−987 from the 8,520 session start). |
| #138 | Architecture | A3/H2 (+D3/E1) | **Workspace Settings** view (212 lines) → `views/workspace-view.jsx` (32 props: members, invite, notification prefs, MFA enrol, role management, branding, project members; RTL-tested). Lint surfaced & fixed two unassociated `<label>`s (branding colour + description → `htmlFor`/`id`). Smoke: all 6 sections render with 4 real members + MFA setup, zero console errors. App.jsx **7,356 lines**. |
| #139 | Architecture | A3/H2 | **PO Workspace cockpit** (211 lines) → `views/po-workspace-view.jsx` (40 props, 6 tabs: roadmap / ideas / feedback / OKRs / release-notes / stakeholders; RTL-tested) + **`AiMetaBadge`** atom (6× — unblocks the SM & PO AI cockpits). Smoke: all 6 tabs render, real project selector, feedback log form, zero console errors. App.jsx **7,177 lines**. |

## Remaining — and why each is deferred

These are the open P1 (and one P0) findings. Each is deferred for a concrete reason: it
either needs a **running app** to verify (the static gate can't prove it works) or is a
**high-churn refactor whose value is "done right" = a visual change** that should be eyeballed.

- **A4 (P0) — one `<Card>` atom + unified `<Badge tone>`.** 83 duplicated card-chrome blocks
  and 4 badge components (`TypeBadge`/`PriorityBadge`/`RoleBadge`/`StatusBadge`). Consolidating
  *well* means standardising the inconsistent density (p-4/p-5/p-6) and folding domain
  colour-logic into a tone prop — i.e. deliberate **visual** + behavioural change. Safe to do,
  but should be reviewed in a running app, not merged blind.
- **C5 — shared `<DataTable>`** (sticky header, sortable, zebra/hover). New component + ~10
  table call-sites; visual, wants runtime review.
- **D3/E1 (rest)** — raw placeholder-only inputs *not* wrapped in `Field`, and inline
  `<label>…</label><input>` pairs that aren't associated, still need labels; the full
  `FormField`+`Input` migration (required `*`, `aria-describedby/invalid`, inline validation,
  submit-loading) is a large per-site change.
- **E3 — drawers.** Move the large New Item / New Project flows into a right-side drawer
  (`ThreeZoneLayout` `panel` slot). The dashboard drill-down modal (already `role=dialog` +
  `aria-modal` + Escape + autoFocus) can also move onto `<Modal>` for focus-trap/scroll-lock.
- **F5 — optimistic updates** + targeted query invalidation (replace refetch-on-mutation).
  Changes mutation/caching behaviour — needs runtime verification.
- **F4 / G2** — uniform empty-state next-actions; full dark-mode contrast audit.
- **A3/H2 + H1 + J — decompose `App.jsx`** into per-view route modules under lint, then
  `React.lazy` per route and re-enable the guardrail gate (export libs are already lazy).
  **In progress** — the running full stack (above) makes this safe; views are now extracted one
  at a time and smoke-tested live. Done so far: `EmptyState` atom + **Notifications** view.
  Remaining views (~26): My Works, Board, Projects, Developer, Backlog, Sprint, Reports,
  Workspace/Settings, Workflows, BQL, PM Artifacts, Dashboards, Report builder, Knowledge,
  Releases, SM/PO cockpits, Compliance, Service Desk, Trash, etc. After extraction:
  `React.lazy` per route (H1) and re-enable ESLint/guardrails on the de-`eslint-disable`d
  slices (J).

## Needs a human runtime smoke (merged on the static gate)
- #119 error toasts — trigger a failed save (offline) → expect one error toast.
- #121 responsive shell — check 375 / 768 / 1280 px: drawer open/close, backdrop tap, nav.
- #123 modals — open each converted dialog: Escape + backdrop close, tab stays trapped.
- #118 type-icon picker — Settings → Work Item Types: pick an icon, create a custom type.
