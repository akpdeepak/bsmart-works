# Premium UI/UX End-to-End Roadmap — bSmart Works

> A prioritized, governance-aware backlog of premium UI/UX practices, behaviours, surfaces,
> features, and visual specs that can be introduced/adopted/adjusted/integrated across
> bSmart Works. **This is a backlog, not a licence to build now** — each item is tagged with
> where it fits, and must still pass the active-iteration check (Orchestrator §6) and earn its
> place (RB-20 §1) before it ships.
>
> Status: proposal · created 2026-06-14 · owner: Deepak Pandey

---

## Why this exists

bSmart Works already has a **mature, machine-governed design system** — not a greenfield. This
roadmap is therefore about *deepening* and *evening out* premium polish, never rebuilding what
works. It is grounded in a full frontend audit (`works-frontend/`), and every recommendation is
expressed in tokens + accessibility terms so it passes the existing gate
(`eslint.config.js` + `scripts/guardrails.sh`).

### What we keep (strengths — do not disturb)

- **Token-first system** in `works-frontend/tailwind.config.js`: brand / neutral / semantic /
  status colours; motion scale (`duration-fast/base/slow/slower` + `out-quint` / `spring`
  easing); shadow scale; named z-index (`base → sticky → dropdown → panel → bulkbar → modal →
  palette → toast`); width tokens (`rail / subrail / sidebar / panel`).
- **`cva` + `cn()` component pattern** — canonical: `src/components/works/button.jsx`. Atomic
  structure (atoms → molecules → organisms). Dark mode baked into every variant.
- **Standout surfaces:** role-tuned Today dashboards (`src/views/dashboards/`), Scrum Master
  Cockpit (11 tabs), AI Studio (Assistants / Agents / Ask), BQL builder, pivot-chart engine
  (~10 chart types), command palette (⌘K), real-time SSE presence + offline draft/sync,
  i18n across 10 languages incl. Arabic RTL (`src/lib/i18n.jsx`), PWA service worker.
- **Accessibility discipline:** 21 `.a11y.test.jsx` files; WCAG tab/combobox/dialog patterns;
  `prefers-reduced-motion` honoured globally.

### Gaps this roadmap targets

- **Missing base primitives:** Select/Combobox, Tabs, Tooltip, Switch/Toggle, Checkbox, Radio,
  DatePicker, Popover, Pagination, Breadcrumb, Progress, Slider, standalone Alert. Today these
  are re-implemented ad hoc inside organisms → inconsistency risk.
- **Shell/routing:** `src/App.jsx` is ~4,200 lines with **no router library**; sub-state
  (selected item, active tab, filters, open panels) is **not deep-linkable** and resets on reload.
- **Uneven polish:** AI surfaces + cockpits are ★★★★★; Compliance, Service Desk, Marketplace,
  Trash, Report Builder are ★★☆–★★★ (functional but bare).
- **Token debt:** `z-[]` and arbitrary spacing are still **WARN**, not BLOCK; `App.jsx` carries
  `text-[10px]` exemptions pending `text-2xs/3xs` tokens.
- **Inclusivity headroom:** no colour-blind-safe chart palette, no high-contrast theme, charts
  lack a screen-reader data-table fallback.

### Governance guardrails every item obeys (CLAUDE.md / rule books)

- **Build to the active iteration, never ahead** (Orch §6 — iter 20 complete).
- **Earns its place** (RB-20 §1): every item names the gap it closes.
- **Tokens, never literals; one `apiClient`; WCAG 2.1 AA** (RB-30).
- **Stop-and-ask** items (data model / new capability / AI budget / `App.jsx` structural change)
  are flagged, not assumed (Orch §5).

---

## Theme 1 — Design-system depth

**1.1 Complete the primitive set (highest leverage).** Add the missing atoms/molecules as
governed `cva`+`cn` components, each with all five states (default · hover · focus-visible ·
active · disabled) + a11y + dark mode + RTL: `Select`/`Combobox`, `Tabs`, `Tooltip`, `Switch`,
`Checkbox`, `Radio`, `Popover`, `DatePicker`, `Pagination`, `Breadcrumb`, `Progress`, `Slider`,
`Alert`.
*Gap:* removes ad-hoc re-implementations (e.g. the inline sprint combobox in `reports-view.jsx`,
density radios in `board-view.jsx`); guarantees consistent focus rings, keyboard nav, RTL.
*How:* mirror `button.jsx`; reuse `dropdown`/`panel` z-tokens.

**1.2 Elevation & density as first-class specs.** Document a 3-level elevation ramp
(`shadow-sm/md/lg` → resting / hover / overlay) and a global **density mode**
(compact / comfortable / spacious) — generalize the board's existing density toggle into a
workspace/user preference consumed via a `useDensity()` hook + token-driven padding scale.
*Gap:* data-dense DISCOM users want compact; today only the board offers it.

**1.3 Micro-interaction & motion choreography.** Standardize entrance/exit on panels, modals,
toasts, accordions using `duration-base` + `out-quint`; reserve `spring` for press/drag
affordances. Add optimistic-update shimmer and a success check-morph on save.
*Gap:* purposeful motion is in RB-30 but applied unevenly — codify a motion "recipe."

**1.4 Token additions:** `text-2xs` / `text-3xs` (retire the `App.jsx` `text-[10px]` exemption);
a focus-ring token alias; categorical chart-palette tokens (see Theme 4 / Colours).

---

## Theme 2 — Navigation & shell

**2.1 Adopt a real router with deep-linkable state.** Introduce React Router (or TanStack
Router) so view + sub-state (selected item, active tab, filters, panel-open) live in the URL.
*Gap:* `App.jsx` syncs the URL by hand and loses sub-state on reload; breaks shareable links and
back/forward. *Note:* large refactor → its own planned task; **stop-and-ask before starting**
(touches the `App.jsx` monolith / TD-003).

**2.2 Breadcrumbs in the top context bar.** A token-driven `Breadcrumb` showing
mode → surface → record, reflecting RB-30's "current location always indicated, no dead ends."
*Gap:* deep surfaces (cockpit tabs, settings sub-views, detail panels) give no path-back cue.

**2.3 Command palette → action layer.** Extend `command-palette.jsx` beyond navigation + search
to **actions** (create item, change status, assign, run saved view, toggle theme) plus
recent/frequent items.
*Gap:* it is already the ⌘K spine; promoting it to a verb layer is the biggest power-user win.

**2.4 Persisted view state & saved layouts.** Persist filters, sort, density, collapsed rails,
and open tab per surface (URL + per-user server pref) so context survives reload and is shareable.

---

## Theme 3 — Data surfaces

**3.1 A premium DataTable primitive.** One governed table: sticky header, column
resize/reorder/show-hide, multi-sort, row selection + bulk bar (reuse `z-bulkbar`), inline edit,
density-aware, **virtualized** for large sets, with skeleton/empty/error states.
*Gap:* BQL results, reports, and admin lists each render bespoke tables — unify them.

**3.2 Board & list scale.** Virtual scrolling for 1000+ card boards/backlogs; lazy-load
off-screen charts via `IntersectionObserver` in long dashboards.
*Gap:* RB-40 §5 NFR budgets (board drag-drop P95 150 ms; dashboard render P95 1500 ms) won't
hold at scale otherwise.

**3.3 Richer analytics.** Add comparison charts (plan-vs-actual, period-over-period),
capacity/utilization heatmaps, and a Sankey for workflow/status-flow — **extend** the existing
pivot-chart engine (`src/lib/pivot*.js`, `molecules/*-chart.jsx`), don't fork it. Interactive
legend with series show/hide; consistent drill-through into a DataTable.

**3.4 Detail-panel polish.** Inline-edit affordances, presence cursors inside the panel, and a
"what changed since you last viewed" diff on the Activity tab.

---

## Theme 4 — AI & inclusivity

**4.1 Deeper, honest AI surfaces.** Extend AI assists (title/description suggestions, task
breakdown, duplicate detection) — every one **routes through the AI Control Plane** with a
visible verdict badge (already the `aiVerdictLabel` pattern) and a documented deterministic
fallback. *Governance:* RB-40 §2 — **no fallback documented = it does not ship**; AI budget/scope
is a **stop-and-ask** surface.

**4.2 Streaming & affordances.** Token-streaming responses, "thinking" states, stop/regenerate,
and a cached-vs-live indicator — consistent across AI Studio, conversational dashboards, and
comment summarize.

**4.3 Inclusivity — raise the floor to WCAG 2.2 AA (iter 20 Cap A target).**
- **Colour-blind-safe categorical chart palette** (Deuter/Protan/Tritan-aware) as selectable
  tokens; never encode meaning by colour alone — pair with shape/label.
- **High-contrast theme** as a third mode beside light/dark.
- **Screen-reader chart fallback:** every chart exposes an accessible `<table>` of its data.
- Audit `neutral-400`-as-text misuse (the RB-30 contrast rule the linter can't catch).

---

## Cross-cutting — Colours & visual specs

- **Keep the brand spine:** `brand-navy` primary; `brand-orange` as the single, sparing CTA
  accent (RB-30 §2). Do **not** broaden the accent palette.
- **Add, in tokens only:** categorical chart palette (6–8 hues, colour-blind-safe);
  high-contrast theme variables; `text-2xs` / `text-3xs` type tokens. All via
  `tailwind.config.js` — never raw hex in components (guardrail BLOCK).
- **Spec hygiene:** flip the `z-[]` and arbitrary-spacing guardrails from **WARN → BLOCK** once
  the baseline is clean — this *is* a premium-consistency lever.

---

## Surface-by-surface polish pass (the "even out" list)

Bring the thin surfaces up to the cockpit/dashboard bar using the new primitives + states:
**Compliance** (`compliance-view.jsx`), **Service Desk / Support Inbox**, **Marketplace**,
**Report Builder**, **Trash**, **Developer Portal**. Each gets: real empty/loading/error states,
the DataTable, breadcrumbs, and a consistent header/action layout.

---

## Prioritization (impact × effort, governance-aware)

**Wave P0 — foundation (low risk, high leverage, mostly token/component work):**
1.1 primitives · 1.4 token additions · 4.3 colour-blind palette + chart SR fallback · flip
z-index/spacing guardrails to BLOCK. *Slots cleanly into a polish iteration.*

**Wave P1 — surface evenness & power UX:**
2.2 breadcrumbs · 2.3 command-palette actions · 3.1 DataTable · 1.2 density · the surface polish
pass.

**Wave P2 — structural & scale (each its own planned task; some stop-and-ask):**
2.1 router / deep-linking (touches `App.jsx`; **stop-and-ask**) · 3.2 virtualization ·
3.3 advanced analytics · 4.1–4.2 deeper AI (**stop-and-ask** on budget / Control-Plane scope).

---

## Key files referenced (none modified by this document)

- `works-frontend/tailwind.config.js` — token home for all colour/type/motion additions
- `works-frontend/src/components/works/button.jsx` — canonical `cva`+`cn` pattern to mirror
- `works-frontend/src/components/works/{atoms,molecules,organisms}/` — where new primitives land
- `works-frontend/src/App.jsx` — the monolith targeted by router/deep-linking (P2)
- `works-frontend/src/lib/pivot*.js`, `molecules/*-chart.jsx` — analytics engine to extend
- `eslint.config.js`, `scripts/guardrails.sh` — the gate that keeps all of this consistent

---

## How each item gets built later (Definition of Done reminder)

Every implementation item carries its own DoD (RB-05 Stage 3/6): tests prove behaviour ·
tokens not literals · WCAG AA · unauthorized + cross-tenant tests where data is touched ·
NFR budget on hot paths (RB-40 §5) · CI green. AI and structural items additionally require a
Deepak checkpoint per the stop-and-ask tags above.
