# Know Studio — unifying Confluence / SharePoint / Word / Excel / PowerBI / Miro into one living document

> Branch `claude/know-section-integrations-ma9vfz`. Owner: Deepak Pandey. Started 2026-06-13.
> Routing (Orchestrator §3): **30 Design** (the editor surface) · **10 Engineering** (data fetching,
> testing) · **40 Governance** (workspace scope, AI Control Plane reuse) · **20 Product** (earns-its-place).

## The problem these tools share
Confluence, SharePoint, Word, Excel, PowerBI and Miro are **separate silos**. A team copies a number
out of Excel into a Confluence page; it goes stale the moment the sheet changes. A diagram lives in
Miro behind another login. A report in PowerBI is disconnected from the work that produced it. The
result is duplicated, drifting, context-switched knowledge.

## The bSmart Know answer — one block model, one surface
bSmart Works already has a Confluence-class wiki (spaces, articles, versions, comments, work-item
links, publishing workflow, a block editor, templates, AI extraction). The unique move is to make the
**document itself the container** for the things teams leave in other tools, so docs, data, diagrams
and work items live and stay connected in one place, workspace-scoped and AI-aware:

| Other tool | Pain point | Know Studio block |
|------------|-----------|-------------------|
| Word / Confluence | clunky editor, panels buried in menus | `callout`, `quote`, `checklist`, `toggle` blocks + minimal insert menu |
| Excel | heavy, disconnected from the doc | `sheet` block — inline grid **with live formulas** (`=SUM`, `=A1+B2`, …) |
| PowerBI | complex, separate from the work | `chart` block — bar / line / pie from a sheet or inline data, one click |
| Miro / MS Whiteboard | another tool, another login | `whiteboard` block — sticky notes + shapes on an inline canvas |
| SharePoint | file sprawl, no context | `bookmark` block — a titled link/embed in context |
| Jira ↔ docs | knowledge detached from work | `workitem` block — a live work-item reference inside the doc |

Everything persists in the existing `articles.content_blocks` JSONB (no schema change), renders in
read mode via a new `BlockRenderer`, and the page can be queried by the existing **Ask your knowledge
base** AI (RAG) — with the deterministic keyword fallback already wired through the AI Control Plane
(RB-40 §2).

## Scope decisions (made autonomously; reversible — feature branch, not merged)
1. **No backend / schema change.** New block types are JSON in `content_blocks` (already supported);
   AI ask/summarize/generate already exist (`/api/v1/ai/kb/ask`, `/summarize`, `/generate`);
   work-item links already exist (`/articles/{id}/links`). "Change only what the task needs" (RB-05 §5).
2. **Unify, don't fragment.** Whiteboard/Sheet/Chart are *blocks in the one editor*, not separate apps
   — the anti-silo thesis and consistent with the seven unification layers (one knowledge layer).
3. **Reuse the design system.** Charts reuse existing token-only `DonutChart`/`LineChart` molecules
   plus a new token-only `BarChart`; no raw hex, no new color (RB-30 §1, guardrails).
4. **Pure, testable engines.** Spreadsheet formula evaluation and chart data parsing are pure
   functions in `src/lib/` with unit tests; the block components stay thin.
5. **Accessibility kept.** New blocks follow the existing block a11y pattern (labelled controls,
   focus rings, keyboard operability) — WCAG 2.1 AA (RB-30 §6).

## Build order (each a verifiable increment: eslint + vitest local)
1. `src/lib/sheet-engine.js` (+ test) — A1 refs, ranges, `+ - * /`, `SUM/AVG/MIN/MAX/COUNT/PRODUCT/ROUND`.
2. `src/lib/chart-data.js` (+ test) + `BarChart` molecule — parse block rows → `[{label,value}]`.
3. `BlockEditor.jsx` — add `callout, quote, checklist, toggle, sheet, chart, whiteboard, workitem, bookmark`.
4. `BlockRenderer.jsx` (+ test) — read-only rendering of every block type; wire into `knowledge-view`.
5. `AskKnowPanel.jsx` (+ test) — “Ask your knowledge base”, reuses `aiClient.kbAsk`; mounted in the
   advanced Know view; AI provenance badge (fallback/ tier) per RB-40 §2.
6. Docs + CHANGELOG.
