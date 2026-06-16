# bSmart Works — UI/UX Program: Execution Plan & Session Triggers

> **What this is:** the **live execution + tracking layer** for the UI/UX program. It turns the
> reference roadmap into an *ordered, resumable* plan with a status ledger, session triggers, and a
> step-by-step resume protocol — so the work can be started, paused, and continued across any number
> of fresh sessions **without re-deriving scope or making assumptions**.
>
> **Companion docs (read together):**
> - [`UIUX-BENCHMARK-ROADMAP.md`](./UIUX-BENCHMARK-ROADMAP.md) — the **reference** (what / why / how;
>   benchmark Parts A–G + premium Part H + reconciliation Part I). This execution plan does not
>   restate the detail; it points into the roadmap per work-item.
> - [`UX-PROGRESS.md`](./UX-PROGRESS.md) — the **append-only progress log** (newest-first). Every
>   completed work-item is logged there *and* checked off in the ledger here (§5).
>
> Status: **active plan (not yet started)** · created 2026-06-14 · owner: Deepak Pandey · governed by
> RB-30 (design) / RB-05 (process) / RB-40 (governance, AI, NFR). No feature change — Feature Parity
> Ledger (RB-20 §1) holds.

---

## 1. How to use this document

- **You (Deepak)** drive it with one of the **session triggers** in §2.
- **The assistant**, on any trigger, runs the **resume protocol** in §3: it reads this ledger + the
  progress log, reconciles against the live git state, finds the next actionable work-item, confirms
  scope with you, executes it as one small gated PR (§6), then updates the ledger (§5) and logs it in
  `UX-PROGRESS.md`.
- **One work-item = one PR.** The program is never a big-bang rewrite. Each step is small,
  single-purpose, lint-clean, and merged before the next begins (RB-05).
- **This file is the source of truth for *progress and order*.** The roadmap is the source of truth
  for *content*. The code is the source of truth for *current reality* — always reconcile (§3 step 2).

---

## 2. Session triggers

Type any of these (close variants are fine) at the start of — or during — any session. The assistant
matches the intent, not the exact words.

| Trigger phrase | Intent | What the assistant does |
|---|---|---|
| **"start the bSmart UIUX program"** (also: *"execute the premium UIUX design roadmap"* — legacy alias, same program) | **START** | Runs the resume protocol (§3). With nothing done yet, the next actionable item is **WI-01**, so it begins Milestone 0. |
| **"resume the bSmart UIUX program"** (also: *"continue the bSmart UIUX roadmap"*, *"pick up the UIUX work"*) | **RESUME** | Runs the resume protocol (§3): finds the next unfinished item from the ledger and continues. |
| **"bSmart UIUX status"** (also: *"where are we on the UIUX program"*) | **STATUS** | Reports the ledger state — done / in-progress / next / blocked — and the latest `UX-PROGRESS.md` entries. **Read-only; changes nothing.** |
| **"stop / pause the UIUX program"** | **PAUSE** | Finishes or safely parks the in-flight item, updates its ledger status, and stops. |

> START and RESUME run the **same** protocol — START is just RESUME when the ledger is empty. There is
> no separate "begin" path to get out of sync. STATUS never mutates anything.

**Hard rule:** the program is **gated on an explicit trigger**. Do **not** auto-start or
auto-continue this program unprompted in a session, even if UI/UX comes up — wait for a §2 trigger.

---

## 3. Resume protocol (what the assistant runs on START / RESUME)

Deterministic, every time:

1. **Orient.** Read this file (§5 ledger + §6 loop + §7 rules), then `UX-PROGRESS.md` (latest entries),
   then the relevant roadmap section for the target item.
2. **Reconcile against reality** (never trust the ledger blindly — concurrent agents mutate the repo,
   see [[bsmart-concurrent-agents]]):
   - `git fetch origin`; inspect `origin/main` and open PRs/branches.
   - For each ledger item marked done/in-progress, confirm it actually landed (a primitive file
     exists, a view is migrated, a PR merged). If the code disagrees with the ledger, **the code
     wins** — correct the ledger before proceeding.
3. **Select the next actionable item.** The first item that is **not** `✅ done`, whose `Depends on`
   are all `✅ done`, and that is not `⛔ blocked`. Prefer an existing `◐ in progress` item over
   starting a new one. Respect milestone order; within a milestone, respect the listed order.
4. **Confirm scope with Deepak** in one sentence ("Next is WI-NN: <title>, scoped to <X>, touching
   <files> — proceeding"). Proceed without waiting only if the item is trivial and unambiguous.
   **Stop-and-ask** (do not proceed without an answer) when the item is flagged ⚠️ in §5 (AI
   budget/scope, data-model/RBAC/tenant, router/`App.jsx` structural).
5. **Execute** the item via the per-item loop (§6) in an **isolated git worktree** off `origin/main`
   (§7), as one small RB-05 PR.
6. **Close the loop.** On merge: set the item `✅ done` in §5 (add the PR link), append a newest-first
   entry to `UX-PROGRESS.md` tagged `[consistency]` / `[premium]` / `[benchmark]`, then either pick the
   next item (if Deepak said keep going) or stop and report.
7. **If blocked** (e.g. `main` is red from unrelated work — see history of PR #319/#325): mark the item
   `⛔ blocked` with the reason, surface it, and either pick an unblocked item or stop. Do not merge
   onto a red base.

---

## 4. Full scope inventory (everything discussed in this program)

So nothing is lost or assumed, the complete scope captured across the originating conversation:

| Source thread | Where it lives now | In the ledger as |
|---|---|---|
| **Doc-pack assessment** ("AI-Optional, Metadata-Driven Work OS" pack) | Decision: **do not implement** — already built & surpassed; one real gap = tenant branding | *Context only* (not executable here); branding tracked separately if pursued |
| **Benchmark study** of ChatGPT/Claude/Meta/LinkedIn/Jira/Confluence/MS Word/Trello/AirBNB/Uber/Notion/Linear/Asana/Figma (+ Gmail/Superhuman as supporting exemplars) | Roadmap **Part B** (design DNA) | Informs every WI ("borrowed from") |
| **Engagement / productivity / principles / frameworks / methods / practices** | Roadmap **Part C** (behavioral, productivity, design principles, frameworks, methods, practices) | Milestone 1 (measurement) + woven through |
| **Benchmark feature roadmap** (Horizons 1–4) | Roadmap **Part D** | Milestones 2, 4, 5 |
| **HEART + activation funnel** first milestone | Roadmap **Part F** | Milestone 1 |
| **Premium program** (Converge & Lock → Elevate) | Roadmap **Part H** | Milestones 0, 3, 4, 5 |
| **Reconciliation / combined order** | Roadmap **Part I** | The milestone ordering below |
| **UI visual craft / premium aesthetic** | Roadmap **Part H Theme 5** | Milestones 3–4 (WI-41…WI-49) |
| **Premium everywhere** (the Premium Bar as a universal merge gate, 100% surface coverage) | Roadmap **Part H §H.2.1** | WI-44 (define) · WI-48 (enforce + track) · WI-46/WI-49 (apply to 100%) |

### 4.1 Related & input docs (cross-links)

These feed specific work-items or constrain all of them. Full roles in the roadmap's **document map** (§2).

| Doc | Relationship | Applies to |
|-----|--------------|-----------|
| `docs/A11Y.md` | WCAG 2.2 AA audit framework (lint → axe → Storybook → manual) — *how* a11y is validated | WI-22 (remediation); WI-44 / WI-48 (Premium Bar enforcement) |
| `docs/I18N.md` | i18n runtime + pattern (10 langs, RTL) — a **prerequisite for every UI surface** | All WIs touching UI text |
| `docs/KNOW-STUDIO.md` (spec) + `plans/KNOW-STUDIO-PLAN.md` (build order) | Definitive surface spec + build order for the knowledge editor / block ecosystem | WI-29 |
| `plans/sprint-cockpit-ux-plan.md` | Sprint-Cockpit UX — **iteration-15 parallel work, out of this ledger** | Log in `UX-PROGRESS.md` if it lands; don't pull in |
| `docs/brand/brand-and-identity.md` · RB-30 | Canonical brand + design law this program adopts | Every WI (reference, don't restate) |

---

## 5. The execution ledger

Milestones run in order (M0 → M5). The combined order follows roadmap **Part I**: build the
**foundation** first, **measure** second, then **activation wins**, then **breadth/harden**, then
**differentiators**, then **stop-and-ask platform** items.

**Status key:** `☐` not started · `◐` in progress · `✅` done · `⛔` blocked · `⏸` deferred/stop-and-ask
· **⚠️** = stop-and-ask before executing · **🎨** = benefits from designer / Figma input (confirm the
visual source before building).

### Milestone 0 — Foundation: primitives + page skeleton  *(Premium Phase 0–1 · roadmap §H.4)*

| ID | Work item | Maps to | Depends on | Status | PR |
|----|-----------|---------|-----------|--------|----|
| WI-01 | Build `Card` + `PageHeader` + `Tabs` (cva+cn, dark, a11y, 1 Storybook story each) | H.3, H.4 A-WS1; D #7 | — | ✅ | claude/bsmart-uiux-program-uv3ulr |
| WI-02 | Add 3 structural lint rules **warn-only**, scoped to `views/` (ban inline card-chrome, raw `<table>`, raw `<button>`; restrict page `max-w-*` to the 2 sanctioned) | H.4 A-WS4 | WI-01 | ✅ | claude/bsmart-uiux-program-uv3ulr |
| WI-03 | Pilot-migrate the 4 exemplar views (`pm-view`, `bql-view`, `admin-ops-view`, `compliance-view`) onto the primitives | H.4 A-WS3 | WI-01 | ✅ | claude/bsmart-uiux-program-uv3ulr |
| WI-04 | Build `DataTable` base + `Drawer` + `IconButton` + form set (`Checkbox`/`Radio`/`Toggle`/`Select`) + `Confirm` + consolidate 6 badges → 1 | H.3, H.4 A-WS1 | WI-01 | ✅ | claude/bsmart-uiux-program-uv3ulr |
| WI-05 | `PageLayout` (shell → `PageHeader` → content; 2 widths, 1 padding rhythm) | H.4 A-WS2 | WI-01, WI-04 | ✅ | claude/bsmart-uiux-program-uv3ulr |
| WI-06 | Migrate ~20 data-heavy views onto primitives + `PageLayout` | H.4 A-WS3 | WI-05 | ✅ | claude/bsmart-uiux-program-uv3ulr |
| WI-07 | Token adds: `text-2xs` / `text-3xs`; retire `App.jsx` `text-[10px]` exemption | H.5 1.4 | — | ✅ | claude/bsmart-uiux-program-uv3ulr |

### Milestone 1 — Measurement: HEART + activation funnel  *(Benchmark Part F · roadmap §F)*

| ID | Work item | Maps to | Depends on | Status | PR |
|----|-----------|---------|-----------|--------|----|
| WI-08 | Define HEART goals→signals→metrics; define the explicit **"first value"** event | F | — | ✅ | PR #373 (merged) |
| WI-09 | Instrument the activation funnel (signup→workspace→template→first item→invite→day-2) via `EventService` / `events` store (DPDP-safe, server-side) | F; RB-40 | WI-08 | ✅ | PR #373 (merged) |
| WI-10 | Internal HEART/funnel dashboard (dogfood via the `Dashboard`/BQL stack) | F | WI-09 | ✅ | feat/uiux-wi10-heart-dashboard · PR #376 |
| WI-11 | Feature-flag layer (prereq for A/B + safe UX rollout) | C.6; D | — | ✅ | feat/uiux-wi11-feature-flags |

### Milestone 2 — Activation & list ergonomics  *(Benchmark Horizon 1 · roadmap §D-H1)*

| ID | Work item | Maps to | Depends on | Status | PR |
|----|-----------|---------|-----------|--------|----|
| WI-12 | First-run onboarding wizard + project templates (Scrum / Kanban / Bug / RAID) + setup-completeness meter | D H1 #1 | WI-05, WI-11 | ✅ | feat/uiux-wi12-onboarding-wizard |
| WI-13 | Inline quick-add on lists (`N`/`+` → editable row) | D H1 #2 | WI-05 | ✅ | feat/uiux-wi13-inline-quick-add |
| WI-14 | List-level keyboard rhythm (`j/k/e/n/Enter`) | D H1 #3 | — | ✅ | feat/uiux-wi14-keyboard-rhythm |
| WI-15 | Surface saved views (rename / delete / reorder UI over `lib/saved-views.js`) | D H1 #4 | WI-05 | ☐ | |
| WI-16 | Optimistic-UI rollback (first slice of the TanStack Query migration) | D H1 #5, H2 #6 | — | ✅ | feat/uiux-wi16-optimistic-ui |

### Milestone 3 — Breadth + harden + Premium P0  *(Premium Phase 2–3 · roadmap §H.4–H.5 + D-H2)*

| ID | Work item | Maps to | Depends on | Status | PR |
|----|-----------|---------|-----------|--------|----|
| WI-17 | Adopt primitives across the remaining ~95 views (extract-loop) | H.4 A-WS3 | WI-06 | ✅ | feat/uiux-wi17-primitives-sweep |
| WI-18 | App-wide loading/empty/error + `aria-label` sweep; unified `AsyncBoundary` | H.2 DoD; D H2 #8 | WI-04 | ✅ | feat/uiux-wi18-async-boundary |
| WI-19 | Storybook ≥ 50 stories + visual regression (Chromatic) | H.4 A-WS4 | WI-04 | ✅ | feat/uiux-wi19-storybook |
| WI-20 | Build Part-B premium primitives: `Tooltip` `Popover` `DatePicker` `Pagination` `Breadcrumb` `Progress` `Slider` `Alert` | H.3, H.5 1.1 | WI-04 | ✅ | feat/uiux-wi20-premium-primitives |
| WI-21 | Flip structural lint **warn → error**; delete all `eslint-disable` in `views/`; `React.lazy` per route; dark-contrast audit | H.4 A-WS4; D H2 #6 | WI-17 | ✅ | feat/uiux-wi21-lint-lazy-contrast |
| WI-22 | Inclusivity → WCAG 2.2 AA: colour-blind-safe chart palette, high-contrast theme (3rd mode), screen-reader chart fallback (`<table>`); audit `neutral-400`-as-text | H.5 4.3 | WI-20 | ✅ | feat/uiux-wi22-wcag-inclusivity |
| WI-23 | Elevation/density spec + `useDensity()` hook + density preference (compact/comfortable/spacious) | H.5 1.2; D H4 #17 | WI-04 | ☐ | |
| WI-24 | Motion choreography recipe (panel/modal/toast/accordion on `duration-base`+`out-quint`; optimistic shimmer; success check-morph) | H.5 1.3 | — | ☐ | |
| WI-25 | Performance pass: TanStack Query adoption + virtual scrolling (`@tanstack/react-virtual`) + prefetch-on-hover + CI perf budget (Doherty < 400 ms) | D H2 #6; H.5 3.2 | WI-16 | ☐ | |
| WI-26 | Notification center + toast queue/stacking + preferences UI (mute/snooze/quiet-hours) | D H2 #9 | WI-20 | ☐ | |
| WI-41 | **Typography system** — tokenized type scale (display/title/heading/body/caption/overline + mono), line-height, tracking, weights, reading measure, vertical rhythm; applied via `PageHeader`/`Card`/prose (subsumes `text-2xs/3xs`) | H.5 5.1 | WI-04, WI-05 | ☐ | |
| WI-42 | **Iconography system** — Lucide, sizes 16/20/24/32, one-icon-one-meaning; audit + converge usage across views; add icon guardrail | H.5 5.2 | WI-04 | ☐ | |
| WI-43 | **Visual source-of-truth** — reference mockups (Figma/in-repo) for elevated surfaces + `docs/VISUAL-SPEC.md`, linked to the brand doc | H.5 5.7 | — | ☐ 🎨 | |
| WI-44 | **Define the Premium Bar (roadmap §H.2.1)** — the objective per-element acceptance standard — + per-surface checklist + visual design-review practice; make it a PR **DoD merge-gate** | H.2.1, H.5 5.6 | WI-19 | ☐ | |
| WI-48 | **Premium Bar enforcement & coverage tracker** — bake the bar into the PR DoD; per-surface visual-regression (Chromatic); a coverage ledger over the full surface inventory (all views + dialogs/drawers/popovers/menus/toasts) driven to **100%**; guardrails so no surface ships/regresses non-premium | H.2.1, H.5 5.6; A-WS4 | WI-44 | ☐ | |

### Milestone 4 — Differentiators  *(Benchmark Horizon 3 ≈ Premium Part B · roadmap §D-H3 + H.5)*

| ID | Work item | Maps to | Depends on | Status | PR |
|----|-----------|---------|-----------|--------|----|
| WI-27 | AI-native UX: contextual (inline draft/fill) + proactive Today nudges + token-streaming + Artifacts-style canvas — all via the AI Control Plane + documented fallback | D H3 #10; H.5 4.1–4.2 | WI-20 | ☐ ⚠️ | |
| WI-28 | Content-first detail panel + narrative activity feed (events → human sentences) | D H3 #11; H.5 3.4 | WI-05 | ☐ | |
| WI-29 | Real-time collaborative knowledge editor (presence/soft-lock) + inline block comments + article templates | D H3 #12 | WI-20 | ☐ ⚠️ | |
| WI-30 | Search overhaul: standalone search surface + full-text body search + facets | D H3 #13 | WI-05 | ☐ | |
| WI-31 | Board swimlanes/grouping + bulk-change preview wizard | D H3 #14 | WI-04 | ☐ | |
| WI-32 | Visual admin builders (workflow / chart / permission matrix / field-layout) + live preview | D H3 #15 | WI-04 | ☐ ⚠️ | |
| WI-33 | Premium `DataTable` upgrade: virtualization, multi-sort, column ops, inline edit, density-aware | H.5 3.1; D H3 #13/#14 | WI-04, WI-25 | ☐ | |
| WI-34 | Richer analytics: comparison charts, capacity/utilization heatmaps, workflow Sankey, drill-through into `DataTable` | H.5 3.3 | WI-33 | ☐ | |
| WI-35 | Command palette → action layer + breadcrumbs in context bar + persisted per-surface view state | H.5 2.2–2.4; D H4 #18 | WI-20 | ☐ | |
| WI-45 | **Illustration & imagery system** — on-brand spot illustrations for empty/onboarding/error/success + zero-data; avatar system (initials→colour→image); image guidelines | H.5 5.3 | WI-20 | ☐ 🎨 | |
| WI-46 | **Premium sweep — exemplars:** bring the top-5 surfaces (Today, board, detail, knowledge, reports) to the Premium Bar — sets the standard for the full sweep | H.5 5.4 | WI-17, WI-44 | ☐ | |
| WI-47 | **Signature / peak-end moments** — restrained delight for sprint-complete, item-done, onboarding milestone, first value (motion + visual reward) | H.5 5.5; C.1 | WI-24 | ☐ | |
| WI-49 | **Premium sweep — full coverage:** bring ALL remaining surfaces, views, pop-ups, drawers, popovers, tooltips, menus, toasts, and every empty/loading/error/partial state to the Premium Bar — *premium everywhere*; drive coverage to **100%** (one small PR per surface cluster) | H.2.1, H.5 5.4 | WI-46, WI-17, WI-48 | ☐ | |

### Milestone 5 — Platform maturity & stop-and-ask  *(Premium Phase 5 / Benchmark Horizon 4 · roadmap §H.5 + D-H4)*

| ID | Work item | Maps to | Depends on | Status | PR |
|----|-----------|---------|-----------|--------|----|
| WI-36 | Real router + deep-linkable state (view + sub-state in URL) | H.5 2.1; D H4 #19 | WI-37 | ☐ ⚠️ | |
| WI-37 | `App.jsx` decomposition (per-view hooks + fetchers) — the enabler | D H4 #19; TD-003 | — | ☐ ⚠️ | |
| WI-38 | Mobile/tablet responsive redesign (breakpoint-aware board/detail/lists, touch targets) | D H4 #16 | WI-05 | ☐ | |
| WI-39 | Help & discoverability: tooltips with shortcut hints, contextual help, optional first-use tours | D H4 #18; H.5 1.1 | WI-20 | ☐ | |
| WI-40 | Board virtualization for 1000+ cards (`IntersectionObserver` lazy charts) | H.5 3.2 | WI-25 | ☐ | |

> **Re-sequencing is allowed** when dependencies or Deepak's priorities shift — update the order and
> note why. The ledger, not memory, records the order in force.

---

## 6. Per-item execution loop (the proven extract-loop, RB-05-gated)

For every work-item:

1. **Branch** off `origin/main` in an **isolated worktree** (§7): `feat/uiux-wiNN-<slug>` (or
   `refactor/`/`chore/` per the change type; `docs/` for doc-only).
2. **Build** the smallest correct change for *that item only* — token classes only, `cva`+`cn()` for
   stateful components, primitives from `components/works/**`, no feature change (Feature Parity
   Ledger), no scope creep.
3. **Prove behaviour:** byte-identical extract where applicable → ESLint `no-undef` confirms the prop
   set → RTL/Vitest test → **live smoke on the running stack** (see [[bsmart-run-app-recipe]]).
4. **Verify locally** (CI may be degraded): `vite build` + `vitest` (changed) + `eslint` (changed
   files) + `bash scripts/guardrails.sh` (exit 0). For any backend/DB touch: fresh-DB boot
   (`ddl-auto=validate`) and bump the migration high-water mark.
5. **DoD** (roadmap §H.2 + RB-05): tests prove behaviour · tokens not literals · WCAG AA · light +
   dark verified · unauthorized + cross-tenant tests where data is touched · NFR budget on hot paths.
6. **Open the PR** (conventional-commit title; description states what/why, rule books touched, how
   verified, screenshots for UI). Squash-merge once green.
7. **Update the ledger** (§5 status + PR link) and **append to `UX-PROGRESS.md`** (newest-first, tagged).

---

## 7. Guardrails & hard rules (non-negotiable)

- **Branch from `origin/main`, never local `main`.** Never commit to / force-push `main`.
- **Use an isolated git worktree** for execution — the main worktree is shared and mutated live by
  concurrent agents ([[bsmart-concurrent-agents]]). Auto-clean the worktree when done.
- **One small, single-purpose, lint-clean PR per work-item.** No big-bang rewrite.
- **No feature removal / no behaviour change** — Feature Parity Ledger (RB-20 §1).
- **Premium everywhere is a merge gate.** Every UI surface — every view, pop-up, drawer, menu, toast,
  and every button/state — must pass **the Premium Bar (roadmap §H.2.1)** before merge. No surface is
  exempt and nothing ships "to be polished later." New/changed surfaces add a visual-regression story.
- **Every UI surface is i18n-ready and a11y-verified.** Externalize strings per `docs/I18N.md`
  (use `t()`, never hand-format — `lib/format.js`); validate accessibility per `docs/A11Y.md` (axe
  harness in tests). Both are part of the Premium Bar (roadmap §H.2.1).
- **Tokens, not literals.** No raw hex/px/`gray-*`/arbitrary `z-[]`/`p-[]` (guardrails BLOCK).
- **Verify locally** before merge; do not rely on CI alone; **never merge onto a red `main`** —
  surface the unrelated breakage and wait/park (history: PR #319/#325 blocked by an unrelated
  `ReportTemplateSeedIT` red).
- **Stop-and-ask (⚠️ items)** before executing: AI budget/scope (RB-40 §2), data-model/RBAC/tenant
  isolation, router/`App.jsx` structural refactors. Get Deepak's checkpoint first.
- **Confirm the active product iteration** (CLAUDE.md §6 / RB-20) before building; don't build ahead.
- **AI work** routes through the AI Control Plane with a documented deterministic fallback — *no
  fallback = it does not ship.*

---

## 8. Progress tracking

- **Status of record:** the §5 ledger (this file). Keep it true to the code (§3 step 2).
- **Narrative log:** `UX-PROGRESS.md`, newest-first, one entry per merged work-item, tagged
  `[consistency]` (convergence), `[premium]` (elevate), `[benchmark]` (engagement/measurement/feature).
- **Program-level success metrics** (drive to target):
  - Convergence: inline card blocks / raw `<table>` / raw `<button>` in `views/` → **0**; distinct
    page-level `max-w-*` → **2**; views with full loading/empty/error → **100%**; `eslint-disable` in
    `views/` → **0**; Storybook stories → **≥ 50** with visual regression.
  - Inclusivity: charts with SR fallback → **100%**; themes shipped → **light / dark / high-contrast**.
  - Engagement/perf: HEART dashboard live; activation funnel instrumented; hot-path response
    < **400 ms** (Doherty) under the NFR budget.
  - Visual craft (Theme 5): typography fully tokenized (no ad-hoc `text-[*]`); iconography consistent
    (sizes 16/20/24/32, one-icon-one-meaning — guardrail green); illustration/avatar coverage for
    empty/onboarding/error/success → **100%**; visual design-review cadence established.
  - **Premium-everywhere coverage:** **100%** of surfaces — every view + dialog/drawer/popover/menu/toast
    — pass the Premium Bar (roadmap §H.2.1), each with a visual-regression story; 100% of buttons/inputs
    via shared primitives; every data region has all five states (default/loading/empty/error/partial).

---

## 9. Quick reference (TL;DR for a fresh session)

1. Trigger heard (§2) → run the **resume protocol** (§3).
2. `git fetch origin` → reconcile ledger vs reality → pick the next actionable WI (§5).
3. Confirm scope (stop-and-ask if ⚠️) → execute in an isolated worktree as one RB-05 PR (§6, §7).
4. Merge green → update ledger (§5) + log in `UX-PROGRESS.md` (§8) → next or stop.

*One product, one design system, enforced by machines not memory — converge it, measure it, elevate
it, and keep it there.*
