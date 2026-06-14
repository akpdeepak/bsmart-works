# Know Studio — the Know section as one living, AI-native document

> Status: built on branch `claude/know-section-integrations-ma9vfz`. Owner: Deepak Pandey.
> Capability I (Knowledge). Routing: RB-30 (design system + a11y), RB-10 (testing, data fetching),
> RB-40 (AI Control Plane, workspace scope), RB-20 (earns-its-place).

## Why this exists — the unfair advantage

Confluence, SharePoint, Word, Excel, PowerBI and Miro are **separate silos**. The cost of that is
not the per-tool licence — it's the *copy-paste tax* and *drift*: a number lifted from Excel into a
Confluence page is wrong the moment the sheet changes; a Miro board lives behind another login; a
PowerBI report is disconnected from the work that produced it; a Word doc is emailed around in five
conflicting versions.

bSmart Works already had a Confluence-class wiki (spaces, articles, versioning, inline comments,
multi-author collaboration, publishing workflow, a block editor, templates, AI extraction). **Know
Studio makes the document itself the container** for the artefacts teams leave in other tools — so
docs, data, diagrams and the work items they describe stay in one place, workspace-scoped, auditable
and AI-native. That integration *is* the moat: no other tool keeps the spreadsheet, the chart, the
whiteboard, the runbook and the linked work item live in a single tenant-isolated surface with one
AI control plane over all of it.

## What each block replaces, and the pain point it removes

| Other tool | Pain point | Know Studio block | How it's better here |
|------------|-----------|-------------------|----------------------|
| **Excel** | heavy app, data detached from the doc, goes stale | `sheet` | inline grid with **live formulas** (`=SUM`, `=A1+B2`, ranges); a Formulas/Values toggle; the same data can feed a chart |
| **PowerBI** | complex, separate, slow to make one chart | `chart` | one-click bar/line/pie from inline rows, rendered with the product's own accessible chart components |
| **Miro / MS Whiteboard** | another tool, another login, nothing links back | `whiteboard` | sticky notes on an inline canvas, drag or keyboard-move, lives inside the doc next to the decision it captures |
| **MS Word** | desktop-bound, file-emailing, merge conflicts, manual TOC/word-count | `callout`/`quote`/`checklist`/`toggle` + **auto TOC** + **live word-count/reading-time** | one shared document with version history, inline comments and multi-author — no files to merge; TOC and counts never go stale |
| **Confluence** | clunky editor, panels buried in menus | grouped block insert menu (Basic / Data / Visual / Connect) | minimal, fast, keyboard-first |
| **SharePoint** | file sprawl with no context | `bookmark` | a titled, described link rendered in context |
| **Jira ↔ docs** | knowledge detached from the work | `workitem` | a live work-item reference inside the doc (alongside the existing article ↔ work-item links) |

## AI everywhere (RB-40 §2)

Every writing surface in Know Studio is AI-assisted, and **all of it routes through the one AI
Control Plane** — scope hierarchy (most-restrictive-wins), per-workspace budget (degrade at 80%,
disable at 100%), response cache, per-call audit, and a **mandatory deterministic fallback**:

- **Compose** — `POST /api/v1/knowledge/ai/compose` (`KnowledgeAiService`, capability `generation`):
  modes `write | improve | expand | summarize | shorten`. The deterministic transform (extractive
  summary, whitespace/sentence cleanup, scaffold) is computed first and is what's returned when AI is
  off / over budget / unavailable; AI only enriches it. Surfaced as the editor's **AI compose bar**
  and a per-text-block **AI menu**.
- **AI page summary** — the article header's one-click summary (same compose endpoint, `summarize`).
- **Ask your knowledge base** — RAG over the workspace's articles, reusing `/api/v1/ai/kb/ask`; the
  fallback is ranked keyword search, so an answer + citations always come back.

AI provenance is shown honestly via `AiMetaBadge` (AI · tier / cached / degraded / **deterministic
fallback**), and the affordances **disappear entirely** when generation is not enabled for the
workspace (resolved server-side).

## Architecture & where it lives

- **No schema change.** New block types are JSON objects in the existing `articles.content_blocks`
  JSONB; work-item links use the existing `article_work_item_links`; AI reuses existing capabilities
  plus the one new compose endpoint (no migration).
- **Pure engines, thin components** (RB-10 §7): `src/lib/sheet-engine.js`, `src/lib/chart-data.js`,
  `src/lib/doc-stats.js` are dependency-free and unit-tested; they double as the read-mode compute
  path. `src/lib/block-kit.js` + `src/components/blocks/chart-preview.jsx` are shared by the editor
  and the renderer so the two never drift.
- **Editor**: `src/components/BlockEditor.jsx` (edit) · **Renderer**: `src/components/BlockRenderer.jsx`
  (read, incl. customer portal). AI: `src/lib/knowledge-ai.js`, `src/components/knowledge/*`.
- **Backend**: `KnowledgeAiService` + `KnowledgeAiController` (workspace-scoped, RBAC `view_items`,
  Control-Plane-routed). Tenant isolation and RBAC are unchanged and enforced server-side (RB-40 §1).
- **Accessibility (RB-30 §6)**: labelled controls, visible focus rings, keyboard operability on every
  new block (sheet cells, sticky-note move, AI menus); meaning never relies on colour alone.

## Verification

- Frontend: full Vitest suite green (incl. new tests for the sheet engine, chart-data, doc-stats,
  `BlockRenderer`, `BlockEditor` blocks + AI affordances, `knowledge-ai`, `KnowAiPanel`); ESLint +
  guardrails clean; production build succeeds.
- Backend: `KnowledgeAiServiceTest` (pure transforms + control-plane integration) and
  `KnowledgeAiControllerAccessTest` (unauthorized + cross-tenant + missing-workspace) green; compiles.

## Live dashboards in a page (BQL widgets)

A `bqlwidget` block embeds a live dashboard widget *inside* an article. It reuses the **one BQL
engine** and the existing **server-side pivot resolver** (`POST /api/v1/widget-data/pivot`), so tenant
scope and field-level security are enforced once on the server (RB-10 §6, RB-40 §1) — the block only
maps the pre-aggregated `{dimensions, measures, rows}` result onto the design-system chart molecules.
Write a BQL predicate, pick a group-by dimension, a measure (COUNT/SUM/AVG/…) and a chart type
(bar / pie / line / scorecard / table); several widgets in one article *is* a dashboard in the doc.
`workspaceId` is threaded into `BlockEditor`/`BlockRenderer` purely so the widget can resolve.

## Visual language (emojis · stickers)

A dependency-free, curated emoji picker (`src/components/blocks/emoji-picker.jsx`, set in
`block-kit.js`) powers a `sticker` block (a big, sizable emoji) and per-note emoji on the whiteboard —
quick visual signposting without a 1.8k-emoji dependency.

## Files in a page

A `file` block references any file type by link (PDF / doc / sheet / image / zip / video / audio /
code), classified by extension (`fileKind`) for a type-aware icon, label and inline image preview.
This also covers SharePoint / Drive / S3 links. *Native binary upload for articles* is a deliberate
follow-up: attachments today are work-item-scoped (`/work-items/{id}/attachments`); giving articles
their own uploads needs an `article_attachments` table + endpoint (a migration), logged below.

## Document from anywhere ("Save to Know")

`SaveToKnowButton` is a drop-in quick-capture so users can document from any surface without
navigating to the Know section: it lists the workspace's spaces, creates a DRAFT article seeded with
the captured content, and links it back to the originating work item (`/articles/{id}/links`). It is
wired into the work-item detail panel and is reusable anywhere (dashboards, meetings, reviews) — one
knowledge layer (RB-40 unification), workspace-scoped + RBAC server-side.

## AI writing assistant everywhere

Beyond the block editor, the reusable `AiTextAssist` (improve / expand / summarize / shorten) drops
next to any text field and is wired into the **markdown editor** and the **comment box**; all of it
routes through the AI Control Plane with the deterministic fallback and hides when AI is off for the
workspace.

## Not in scope here (deliberate, logged for follow-up)

- **Native binary file upload for articles** — needs an `article_attachments` table + endpoint
  (migration); today files are referenced by URL. The work-item attachment store can be reused.
- Live two-way binding between a `sheet` and a `chart` block (charts currently take their own rows or
  a sheet snapshot) — a natural next step.
- Real-time co-editing cursors inside a block (the platform already has SSE presence; wiring it into
  the block editor is a separate task).
- Server-side render of `mermaid` (still shown as source, as before).
