# UX Overhaul — Progress Log

The append-only progress log for UI/UX work. Companion to
[`UIUX-BENCHMARK-ROADMAP.md`](./UIUX-BENCHMARK-ROADMAP.md) (the reference roadmap) and
[`UIUX-EXECUTION-PLAN.md`](./UIUX-EXECUTION-PLAN.md) (the live status ledger — work-items WI-01…WI-49;
the resume protocol reads this log). `UX-CODEBASE-ANALYSIS.md` is the original 2026-06-05 baseline
audit. Tracks what has shipped to `main` so the state is always legible. Newest first; tag entries
`[consistency]` / `[premium]` / `[benchmark]`.

## WI-19 [consistency] — 5 new atom stories + Chromatic CI (139 stories total) (2026-06-15)

Storybook already had 108 stories across 17 files (≥50 target met by prior WIs). This WI adds
31 more stories for 5 atoms that had no coverage, and wires Chromatic visual regression into CI.

**New story files (31 stories):**
- `empty-state.stories.jsx` — 6 stories: default · with-action · search-no-results · error-state · no-team-members · no-subtitle
- `avatar.stories.jsx` — 8 stories: xs/sm/md/lg sizes · single-word · no-name · default · avatar-group
- `input.stories.jsx` — 8 stories: default · small · large · error · disabled · with-value · with-label · with-label-and-error
- `collapsible.stories.jsx` — 4 stories: open-by-default · closed-by-default · no-count · nested-sections
- `toast.stories.jsx` — 5 stories: success · error · undo-with-action · undo-without-action · empty

**Chromatic CI job** — new `chromatic` job in `ci.yml`: runs on every push + PR from the same
repo, uses `chromaui/action@latest` with `CHROMATIC_PROJECT_TOKEN` secret. `exitZeroOnChanges:
true` so visual diffs are reviewed in the Chromatic UI (non-blocking gate — visual review is
a human responsibility, not an automated binary).

**Total: 139 stories across 22 files.** Baseline for WI-44 (Premium Bar).

Branch: `feat/uiux-wi19-storybook`.

---

## WI-09 [benchmark] — HEART activation-funnel instrumentation (2026-06-15)

Server-side funnel telemetry wired into the events store via a new `FunnelService`. No PII,
no third-party SDKs, every event workspace-scoped (RB-40 §3). Four emission points live:

**V91 migration** — adds `created_at` to `workspaces`; backfills from earliest workspace-scoped
event. Required for step-5 day-2 detection.

**`FunnelService`** (new `@Service`) — 4 idempotent methods, all non-fatal (telemetry failures
cannot roll back business writes):
- `onTemplateApplied()` → `WORKSPACE_TEMPLATE_APPLIED` (step 2)
- `onFirstValueCandidate()` → `WORKSPACE_FIRST_VALUE` (step 3, idempotent per workspace)
- `onTeammateInvited()` → `WORKSPACE_TEAMMATE_INVITED` (step 4, every invite)
- `onMeaningfulAction()` → `WORKSPACE_DAY_2_RETURN` (step 5, idempotent, day-1…30 window)

**Wired into 3 existing services:**
- `ConfigTemplateService.apply()` → step 2
- `WorkItemController.createWorkItem()` → steps 3 + 5 (when wsId ≠ null)
- `WorkspaceService.addMember()` → step 4

**`EventRepository`** — added `existsByWorkspaceIdAndEventType()` for O(1) idempotency guard.

**Step 1 (`WORKSPACE_CREATED`)** — deferred to WI-12 (onboarding wizard builds the workspace
creation flow).

**Tests:** 17 new unit tests in `FunnelServiceTest` covering all 4 steps, idempotency,
guard-null, window boundary (too soon / too old), and EventService resilience.

**WI-08 + WI-09 both marked ✅.** WI-10 (HEART/funnel dashboard) is now unblocked.

---

## WI-07 [consistency] — Retire App.jsx arbitrary-value exemption (2026-06-15)

`text-2xs` token (10px / 0.625rem) was already present in `tailwind.config.js`; no arbitrary
`text-[10px]` values remained in App.jsx. WI-07 closes the loop by removing the stale
`'src/App.jsx'` entry from `worksArbitraryValueRule.ignores` in `eslint.config.js` and updating
the block comment to reflect completed status. App.jsx now passes the arbitrary-value rule with 0
errors. `text-3xs` deferred — no current usages; token will be added on first concrete need.

Execution Plan WI-06 and WI-07 marked ✅. Milestone 0 — Foundation — is complete.

---

## WI-06 [consistency] — Migrate 11 views onto PageLayout (2026-06-15)

Wraps the outer page div in `PageLayout` across 11 data-heavy views: `account`, `workspace`,
`notifications`, `trash`, `projects`, `developer-portal`, `settings3`, `marketplace`,
`my-works`, `pm`, and `bql`. Titles / descriptions / action buttons extracted into PageLayout
props where applicable; `pm-view` and `bql-view` retain their existing `PageHeader` inside.

Sanctioned-page-widths warnings reduced from 218 → 206 (−12 outer-wrapper hits). 0 errors
throughout. 990/990 tests pass. Branch: `claude/bsmart-uiux-program-uv3ulr`.

---

## WI-05 [consistency] — PageLayout template (2 widths, 1 padding rhythm) (2026-06-15)

New `templates/page-layout.jsx` — the mandatory content wrapper for every view surface (A-WS2).

Composes `PageHeader` + a width-constrained, padded content zone. Two sanctioned widths:
- `width="dashboard"` (default) → `max-w-7xl` (1280px) — boards, lists, analytics
- `width="reading"` → `max-w-reading` (880px, Tailwind token) — detail panels, documents, settings

One canonical padding rhythm: `px-6 py-6 md:px-8`. Props:
- `title` / `description` / `breadcrumb` / `actions` — forwarded to `PageHeader`
- `header` — node; replaces `PageHeader` entirely (`null` = no header)
- `noPadding` — omits padding for full-bleed surfaces (boards, calendars)
- `className` — merged onto the outer wrapper

14 tests (156 files, 990 tests total, all green). 6-story Storybook entry covers
dashboard/reading/breadcrumb/custom-header/no-header/no-padding variants.

ESLint fix: `max-w-[880px]` is a guardrail-blocked arbitrary value — swapped to `max-w-reading`
token from `tailwind.config.js` throughout. Execution Plan WI-05 marked ✅.

---

## WI-04 [consistency] — DataTable + Drawer + form atoms + badge consolidation (2026-06-15)

**8 new components + 3 badge refactors + 52 tests + 9 Storybook stories.**

### New atoms

| File | What it is |
|------|-----------|
| `atoms/icon-button.jsx` | Square icon-only button — ghost/primary/secondary/danger variants, xs/sm/md/lg sizes, cva+cn, forwardRef |
| `atoms/checkbox.jsx` | Native `<input type="checkbox">` overlaid on a styled visual box; controlled + uncontrolled; indeterminate support; forwardRef |
| `atoms/radio.jsx` | `RadioGroup` context wrapper (controlled via `value`/`onChange`, uncontrolled via `defaultValue`) + `Radio` atom reading context |
| `atoms/toggle.jsx` | Pill-shaped `role="switch"` toggle; cva compound variants for thumb translate; sm/md sizes; forwardRef |
| `atoms/select.jsx` | Native `<select>` with `appearance-none` + `ChevronDown` icon; cva matching `input.jsx`; forwardRef |
| `atoms/data-table.jsx` | Base table: sortable columns, zebra stripe, skeleton loading (4 rows), empty state, `renderCell`, `onRowClick`; no virtualisation (WI-33) |

### New molecules

| File | What it is |
|------|-----------|
| `molecules/drawer.jsx` | Side-panel drawer (right/left); same focus-trap/Escape/scroll-lock/aria-modal as Modal; sm/md/lg/xl/full sizes; optional `footer` slot |
| `molecules/confirm-dialog.jsx` | Thin Modal wrapper with confirm/cancel button pair; danger variant; `loading` disables both buttons |

### Badge consolidation (cva)

`PriorityBadge`, `RoleBadge`, and `LapseBadge` converted from inline config-object patterns to
`class-variance-authority`. Unknown values now fall back gracefully (`MEDIUM` / `MEMBER`) rather
than rendering raw keys. `StatusBadge` was already cva; `TypeBadge` and `AiMetaBadge` kept
as-is (special domain logic). Consolidated badge Storybook story added at `badges.stories.jsx`.

### ESLint fix

Removed unsupported `aria-invalid` from `Radio`'s `<input type="radio">` (jsx-a11y/role-supports-aria-props).
Removed dev-only `process.env` check from `IconButton` (no `process` in browser context). Removed
unused `import * as React` from `DataTable`.

All 976 tests pass (155 files, 0 lint errors). Execution Plan WI-04 marked ✅.

---

## WI-03 [consistency] — pilot-migrate 4 exemplar views onto Card/PageHeader/Tabs primitives (2026-06-15)

Migrated `bql-view`, `admin-ops-view`, `compliance-view`, and `pm-view` onto the WI-01 atoms.
Every view now uses `<PageHeader>` (one `h1`, breadcrumb + actions slot) and, where the view is
tabbed, the `<Tabs>`/`<TabList>`/`<Tab>`/`<TabPanel>` set. Inline card-chrome replaced by `<Card>`.

| View | What changed |
|------|-------------|
| `bql-view` | `PageHeader` header; 6 card-chrome blocks → `<Card variant="..." padding="...">` |
| `admin-ops-view` | `PageHeader`; tab bar + `border-b` div → `<Tabs>`/`<TabList>`/`<Tab>`; content areas → 8 `<TabPanel>`s; local `Card` / `Stat` helpers now use `AtomCard` internally (`Card as AtomCard` alias avoids name collision) |
| `compliance-view` | `PageHeader`; outer `flex flex-col h-full` div → `<Tabs className="flex flex-col h-full overflow-hidden">`; tab buttons + `border-b` → `<TabList>` (provides own border); content blocks → 4 `<TabPanel className="pt-0">` |
| `pm-view` | `PageHeader` + project-selector in `actions` slot; 11-tab bar → `<TabList>`; 11 content conditionals → `<TabPanel value="...">` for each; virtual `meeting-detail` tab handled by passing `value=""` to `<Tabs>` when active (hides TabList, keeps detail view as direct conditional) |

**Bug fixed in `tabs.jsx` atom**: `TabPanel` previously returned `null` when inactive, leaving
`Tab`'s `aria-controls` pointing at non-existent IDs — an axe `aria-valid-attr-value` violation in
any state where panels are conditionally absent. Fixed to always render a `<div id hidden />` shell
for inactive panels (lazy — no children mounted). All 899 tests pass; the previously failing
`compliance-view` tab-role test and `admin-ops-view` error-state a11y test are now green.

Execution Plan WI-03 marked ✅.

---

## WI-02 [consistency] — structural lint guardrails for `views/` (warn-only) (2026-06-15)

Inline ESLint plugin (`works-view/*`) added to `eslint.config.js`, scoped to `src/views/**`.
Four warn-only rules surface hand-rolled patterns for migration to primitives (flipped to error in WI-21):

| Rule | Catches | Guides toward |
|------|---------|---------------|
| `works-view/no-raw-table` | `<table>` in views | `<DataTable>` (WI-04) |
| `works-view/no-raw-button` | `<button>` in views | `<Button>` from components/works |
| `works-view/no-inline-card-chrome` | className with both `rounded-*` + `shadow-*` | `<Card>` (WI-01) |
| `works-view/sanctioned-page-widths` | `max-w-*` other than `max-w-7xl` / `max-w-reading` | sanctioned page widths only (RB-30 §4) |

Implemented as an inline plugin (not `no-restricted-syntax`) so the existing error-level arch rules
(`no-restricted-syntax` for raw hex / `works-*` / inline fetch) are NOT overridden for views files.
Confirmed: arch rules stay at severity 2 for views; view rules fire as warnings only; rules do not
fire on `atoms/` or `molecules/`. Execution Plan WI-02 marked ✅.

---

## WI-01 [consistency] — `Card` + `PageHeader` + `Tabs` primitives (2026-06-15)

Three canonical atoms added to `components/works/atoms/`:

| File | What | Status |
|------|------|--------|
| `card.jsx` + tests + stories | `Card` (elevated/outlined/flat, forwardRef), `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `CardFooter` — replaces ~85 inline card-chrome blocks | ✅ |
| `page-header.jsx` + tests + stories | `PageHeader` — single h1 per view (text-2xl bold), breadcrumb + actions slots | ✅ |
| `tabs.jsx` + tests + stories | `Tabs`/`TabList`/`Tab`/`TabPanel` — roving tabindex, ARIA linked (aria-controls/aria-labelledby), keyboard (↑↓/Home/End), controlled+uncontrolled | ✅ |

36 tests pass; ESLint clean; guardrails clean (pre-existing baseline debt only); dark-mode `dark:` pairs on all three. Each has 1 Storybook story (stories file). Execution Plan WI-01 marked ✅.

---

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
| #140 | Tests | RB-10 §7 | Backfilled the two missing view-level RTL tests (`notifications-view`, `trash-view`) — the first two extractions had relied on their atoms' tests + live smoke. +8 tests (238 total). Also refreshed this log's "Remaining" section to the true post-extraction state. |

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
  `React.lazy` per route and re-enable the guardrail gate. **Well under way** — the running full
  stack makes it safe; each view is extracted one at a time, RTL-tested, and smoke-tested live.
  Repeatable loop: script-extract the JSX byte-identical → `eslint no-undef` proves the prop set
  → RTL test → live smoke against real data → squash-merge. **App.jsx 8,520 → 7,177 lines (−16%).**
  - **Foundational shared layer — DONE** (every small/medium shared helper is now an own-file,
    lint-clean, tested component): `EmptyState`, `work-item-type` (TYPES/`TypeBadge`/`TypeIcon`),
    `priority-badge`, `stat-card`, `role-badge`, `field`, `avatar`, `ai-meta-badge`, plus the
    `isIconComponent`/`onPressKey` utils. This unblocks the remaining views.
  - **Views extracted (10/~24):** Notifications, Trash, Releases, BQL, My Works, Projects,
    Sprint Reports, **Home dashboard** (flagship, 5 role panels), Workspace Settings, PO Workspace.
    (Developer, SLA, Performance, Automations, Integrations were already organism-delegated.)
  - **Remaining views (~13), grouped by what they still need:**
    - *Use only already-extracted helpers (tractable now):* **SM Cockpit** (7 tabs; uses
      `StatCard`+`AiMetaBadge` — note `text-[11px]`/`max-w-[880px]` to tokenise), **Compliance**,
      **Service Desk**.
    - *Need their own big helper extracted first:* **Board / Backlog / Sprint** (→ `SprintBoard`,
      `SprintItemList`), **Custom Dashboards** (→ `DashboardWidgetCard`, `DashboardDrillModal`,
      `PublicDashboardEmbed`), **Report builder** (→ `ReportSectionCard`/`Controls`), **Knowledge**
      (→ `RichTextEditor`), **PM Artifacts** (→ `PmArtifactList`).
    - *Giant, do with fresh context:* **Settings/Workflows&Fields** (~594 lines), **PM Artifacts**
      (~552 lines).
  - **Then:** `React.lazy` per route (H1) — defer until most views are out so the Suspense
    boundary is placed once (the content `<div>` has a same-class sibling inside a helper, so a
    single boundary needs care) — and re-enable ESLint/guardrails on the de-`eslint-disable`d
    slices (J).

## Needs a human runtime smoke (merged on the static gate)
- #119 error toasts — trigger a failed save (offline) → expect one error toast.
- #121 responsive shell — check 375 / 768 / 1280 px: drawer open/close, backdrop tap, nav.
- #123 modals — open each converted dialog: Escape + backdrop close, tab stays trapped.
- #118 type-icon picker — Settings → Work Item Types: pick an icon, create a custom type.
