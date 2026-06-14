# Sprint Cockpit — UX/UI improvement plan

> Status: **proposal, for review** · owner: pending · Cap V (iteration 15 extension)
> Scope chosen: **friction fixes + tab restructure**. Build only after sign-off on this doc.

This plans the next pass over the role-adaptive Sprint Cockpit
(`works-frontend/src/views/scrum-master-cockpit-view.jsx` + handlers in `App.jsx` +
the `/api/v1/cockpit/*` endpoints). The feature set is complete; this is about making it
**lower-friction, smarter, and easier to scan** without dropping information (RB-20 §4:
information density is a feature — we remove friction and noise, not capability).

---

## 1. Goals / non-goals

**Goals**
- Cut clicks on the common path (the active sprint, today's ceremony).
- Reduce what a user must scan at once (the SM sees 10 tabs today).
- Make guidance *actionable*, not just informative.
- Keep context (sprint health) visible everywhere.
- Tighten loading/empty/AI affordances to the single design system (RB-30).

**Non-goals**
- No new capabilities, endpoints-as-features, or schema changes.
- No removal of any existing tab/data — only regrouping and defaulting.
- No change to RBAC/role model or the role→tab mapping's *contents* (only its presentation).

---

## 2. Current-state pain inventory (with refs)

| # | Pain | Where | Impact |
|---|------|-------|--------|
| P1 | "Select a sprint → click Analyze" before anything shows | Risk, Variance, Review prep tabs (`riskSprintId`/`varianceSprintId`/`reviewSprintId` + buttons) | 2 extra clicks on every visit, even with one active sprint |
| P2 | Everything is a manual trigger (Suggest commit, Detect patterns, Draft review, Cluster themes) | planning/patterns/review/retro | Value is hidden behind a button; deterministic compute is cheap and already the fallback |
| P3 | 10 tabs for a scrum master | `ROLE_TABS` | High scan cost; no grouping of "do" vs "understand" |
| P4 | Pro-tips are passive text | pro-tips strip | "2 unassigned items" — but you can't act from the tip |
| P5 | Sprint context (RAG, day X/Y, burndown) only on the Health tab | digest tab | Lost the moment you switch tabs |
| P6 | No loading skeletons — tabs flash the empty state while fetching | all fetched tabs | Feels janky; violates RB-30 §6 (skeletons, not spinners/flashes) |
| P7 | Inconsistent AI affordance ("✦" on some AI actions, not others) | various buttons | Users can't tell what calls AI |
| P8 | ~9 endpoints fire on cockpit open / project switch | `openCockpit` / project `onChange` | Wasteful; most tabs aren't visible yet |
| P9 | "Raise" is buried in the Impediments tab | impediments tab | Every role can raise *something*; it deserves a persistent affordance |

---

## 3. Proposed information architecture (the restructure)

One surface, **two modes via a segmented control** at the top, plus a **persistent sprint
context bar**. Max two clicks to anything.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Sprint Cockpit            [Scrum master ▾]              Project ▾      │
│ ● AT RISK · Sprint 14 · day 6/10 · ▁▂▄▆ burndown · ●LIVE Standup [Join]│  ← persistent context bar (P5)
├──────────────────────────────────────────────────────────────────────┤
│  [ Run ]  [ Insights ]                                   [ + Raise ]   │  ← mode segments (P3) + global Raise (P9)
├──────────────────────────────────────────────────────────────────────┤
│  Run:      Standup · Ceremonies · Impediments · Retro · Planning · Review
│  Insights: Health · Variance · Risk · Patterns
└──────────────────────────────────────────────────────────────────────┘
```

**Mode contents (role-filtered — same role mapping, just split into two groups):**

| Role | Run | Insights | Default on open (phase-aware) |
|------|-----|----------|-------------------------------|
| scrum-master / admin | Standup, Ceremonies, Impediments, Retro, Planning, Review | Health, Variance, Risk, Patterns | live ceremony → that; else Run/Standup |
| developer | My Day, Standup, Impediments, Retro | (none, or Health read-only) | Run/My Day |
| product-owner | Planning, Review, Impediments, Ceremonies | Health, Variance, Patterns | Insights/Health |
| executive | (none) | Health, Variance, Risk, Review, Patterns | Insights/Health |

- **Phase-aware default** (P3): if a ceremony is LIVE, open Run + that ceremony; else the role
  default above. Implemented purely from `cockpitContext.liveCeremony` + `roleKey` — no new data.
- If a role has only one mode's worth of tabs (developer, executive), the segmented control
  collapses to a plain tab row — no empty "Insights"/"Run" segment shown.

---

## 4. Friction & smartness fixes

**F1 — Auto-load the active sprint (P1, P2).**
Risk/Variance/Review/Planning default to `cockpitContext.activeSprint` and fetch on tab open;
the sprint `<select>` stays for history. The deterministic result renders immediately; the AI
narrative becomes a one-tap "✦ Explain / Draft with AI" enhancement on top (we already serve
fallback-first, so this is wiring, not new logic).

**F2 — Actionable pro-tips (P4).**
Each tip carries an optional action target. Examples:
- "N unassigned items" → button switches to Risk/Insights filtered to unassigned.
- "stale item X" → opens that item.
- "N SLA-breached" → switches to Impediments filtered to breached.
Backend: `CockpitCoachService` tips already know their subject; add an optional `action`
(`{ kind, tab, filter }`) to the `Tip` record. Pure, testable, no new endpoint.

**F3 — Persistent sprint context bar (P5).**
Lift RAG + sprint day X/Y + a tiny burndown sparkline out of the Health tab into a slim bar
under the header, shown on every tab. Reuses `/cockpit/digest` (already loaded up front).

**F4 — Loading skeletons (P6).**
Replace the empty-state flash with `animate-pulse bg-neutral-100` skeleton rows matching each
tab's final layout (RB-30 §6). A small shared `<SkeletonRows>`/`<SkeletonCards>` helper.

**F5 — Consistent AI affordance (P7).**
One convention: AI-invoking actions are `variant="secondary"` with a leading `✦` and, after a
run, an `AiMetaBadge` showing model/fallback. Deterministic actions have no `✦`. Apply across
planning/patterns/review/retro/pro-tips.

**F6 — Lazy per-tab fetch (P8).**
On open, fetch only what the context bar + default tab need (`/cockpit/context`, `/cockpit/digest`,
`/cockpit/pro-tips`, live ceremony). Other tabs fetch on first activation and cache until project
change. Cuts cold-open calls from ~9 to ~4.

**F7 — Global Raise (P9).**
A persistent "+ Raise" button (top-right of the mode bar) opens the role-filtered raise form
(types from `cockpitContext.allowedRaiseTypes`) regardless of active tab. The Impediments tab
keeps its inline form too.

---

## 5. Design-system conformance (RB-30)

- Tokens only (`brand-*`, `neutral-*`, `semantic-*`); RAG already uses `semantic-danger/warning/success`.
- Segmented control = the existing button/`cva` pattern; no new arbitrary values.
- Status by label **and** icon, never colour alone (already true for attendance/RAG/tips).
- Five interaction states on the new segmented control + Raise button.
- Skeletons per RB-30 §6; motion via existing `duration-*` tokens; respect `prefers-reduced-motion`.
- a11y: segmented control is a labelled `role="tablist"`/buttons with keyboard nav; the context
  bar is informational, not a control.

---

## 6. Proposed delivery sequence (PR-sized increments)

Each ships independently, green, with its own tests; ordered low-risk → higher.

1. **PR-A — Friction, no restructure** *(safe, high value)*: F1 (auto-load active sprint) +
   F4 (skeletons) + F5 (consistent AI affordance). Pure frontend; behaviour-preserving.
2. **PR-B — Persistent context bar (F3)** + lazy fetch (F6). Frontend; reuses existing endpoints.
3. **PR-C — Actionable pro-tips (F2)**: small `Tip.action` backend addition + frontend wiring + tests.
4. **PR-D — Tab restructure (§3)** + global Raise (F7) + phase-aware default. The biggest UI
   change; landed last so the friction wins are already in and de-risked.

**Backend touched:** only `CockpitCoachService` (PR-C, additive `action` on `Tip`). No schema,
no migration, no new endpoints. Everything else is `works-frontend` + tests.

---

## 7. Open questions for sign-off

1. **Segmented control vs. grouped tab row?** Proposal is a `[Run | Insights]` segment. Alternative:
   keep one row but visually group with a divider. Segment = fewer items on screen; divider = no mode-switch click.
2. **Developer "Insights"?** Should a developer see a read-only Health tab, or stay purely on Run/My Day? Proposal: keep dev minimal (no Insights).
3. **Phase-aware default** — OK to override a remembered tab when a ceremony goes live, or only on first open? Proposal: only when there's a live ceremony *and* the user hasn't manually switched this session.
4. **Burndown sparkline in the context bar** — worth the vertical space, or RAG + day X/Y only? Proposal: include it; it's the single best at-a-glance signal.

---

*Once this is signed off, I'll implement PR-A first and proceed through the sequence, each as a
separate green PR.*
