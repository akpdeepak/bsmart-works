# Iteration 11 — AI Expansion + Conversational Command Bar (completion)

Iteration 11 is the **broad AI expansion**: every capability gets an AI surface, all built on one
orchestration layer. Because that layer (the iteration-10 **AI Control Plane**) did not yet exist in
the codebase, it is built here as the foundation, and the iteration-11 surfaces are layered on top.
This work was explicitly user-directed (build iteration 11 end-to-end).

> **No live model in this build.** There is no external API key or network egress, so AI runs on a
> deterministic, fully-offline provider (`DeterministicAiProvider`). It is the seam where a hosted
> LLM plugs in later — register a higher-priority `AiProvider` bean and every capability upgrades,
> because they all route through `AiControlPlaneService`. The budget meter, audit log, response
> cache, scope hierarchy and per-capability fallbacks are all real and exercised today.

## 1. The AI Control Plane (foundation — RB-40 §2)

One policy hierarchy · one budget · one audit trail · one fallback contract. No capability calls a
model on its own terms — every AI feature routes through `AiControlPlaneService.invoke(...)`.

- **Migration `V39__ai_control_plane.sql`** — `ai_policies`, `ai_budgets`, `ai_invocations` (audit
  log), `ai_cache_entries`, and a new `manage_ai` permission (ADMIN tier). Plural snake_case tables,
  workspace-scoped, indexed.
- **Scope hierarchy (most-restrictive-wins):** WORKSPACE → CAPABILITY → USER → in-context. A
  workspace-wide "off" disables everything downstream; a per-request `aiInContext=false` is the most
  granular off-switch.
- **Cost discipline:** per-workspace monthly cap; at **80%** spend the layer degrades to the cheap
  tier (Haiku), at **100%** it auto-disables AI and serves fallbacks. Spend is metered per call.
- **Model tiering:** cheap/fast (Haiku) for intent/classification/triage/routing; capable (Sonnet)
  for generation and RAG synthesis — never everything on the expensive tier.
- **Response caching:** repeated prompts within a workspace+capability are served without re-spend.
- **Audit:** every invocation logged with user, workspace, capability, tier, token counts, cost,
  cache-hit, fallback-used, and the policy state at call time — regulator-verifiable (RB-20 §5).
- **Data boundary:** AI calls are server-side only; prompts are PII-redacted (email/phone) before
  they could leave the server.
- **Management API** (`/api/v1/ai`): capability catalogue, policies (get/set), budget (get/set),
  and the admin-only audit log. RBAC in the service boundary; every endpoint workspace-scoped.

## 2. Iteration-11 AI surfaces (each with a documented deterministic fallback)

All under `/api/v1/ai`, all workspace-scoped + RBAC-gated, all routed through the control plane.

| Cap | Surface | Endpoint | Fallback |
|-----|---------|----------|----------|
| P | Conversational command bar — multilingual (EN/Hindi/Hinglish) NL → editable **multi-action plan**, executed after confirm | `POST /command/parse`, `/command/execute` | manual create/edit forms + visual BQL builder, pre-filled from the parsed fields |
| O | Smart triage — suggests priority, type, assignee, similar items | `POST /triage` | workspace defaults + keyword similar-item search |
| O/I | Generation — story / AC / test cases / comment / article / release notes | `POST /generate` | blank type scaffold to fill by hand |
| O | Anomaly explanation on charts, with citations | `POST /explain-anomaly` | raw delta + contributing items, no narrative |
| K | AI-suggested compliance rules (BQL drafts admins review/activate) | `POST /suggest-compliance-rules` | seeded rule-template library |
| M | SLA breach prediction from age-vs-target trajectory | `POST /predict-sla` | deterministic age-vs-target threshold on SLA timers |
| I | RAG over the knowledge base, grounded with citations | `POST /kb/ask` | ranked keyword search over articles |
| N | Article suggestion at intake (ticket deflection) | `POST /kb/suggest` | keyword article search |
| N | Smart request routing to the best team | `POST /route` | project default team / round-robin |

The command-bar execute path enforces per-action permissions in the service (`create_items`,
`edit_any_item`, `view_items`) and records an event for every mutation; cross-workspace item
references are rejected.

## 3. UI

- **Conversational command bar** (`AiCommandBar`, topbar): Works Orange `✨ AI` button that
  **disappears entirely** when the workspace has AI off (not just dims). Opens a top-center command
  palette with cycling example hints, **voice input** (Web Speech API), Enter-to-preview.
- **Plan preview & inline edit:** every parsed step is shown, editable, toggle-includable and
  removable before a single **Confirm & run**. Nothing executes without confirmation.
- **"What AI can do here"** panel lists each capability's enabled state and its deterministic
  fallback. All tokens, five interactive states, WCAG-AA, single `apiClient` — passes ESLint clean.

## 4. Tests

Backend (pure `@Tag("unit")`, no DB):
- `AiControlPlaneServiceTest` — scope resolution (most-restrictive-wins), budget 80%/100% thresholds,
  cache hit/store, PII redaction, audit recording, policy/budget upsert.
- `AiAssistServiceTest` — multilingual command parsing (incl. Hinglish assign, multi-action split),
  triage heuristics, generation templates vs blank fallback, KB grounding, routing.
- `AiProviderAndTierTest` — tier cost model + offline provider token accounting.
- `AiControllerAccessTest` / `AiAssistControllerAccessTest` — **unauthorized + cross-tenant** denial
  on every entry point (RB-05 Stage 3, RB-40 §1).

Frontend: `ai-command-bar.test.jsx` — button hidden when AI off, plan parse → edit → confirm/execute.

## 5. Key decisions

- **Build the iteration-10 foundation here** rather than fake per-feature AI: iteration 11 is
  defined as building *on* the orchestration layer, so the layer is the prerequisite. One control
  plane keeps scope/budget/audit/fallback from fragmenting across 9 capabilities (RB-40 §2).
- **Deterministic offline provider as the default**, pluggable for a hosted model — the product is
  whole and testable with no external dependency, and the fallback contract is first-class, not an
  afterthought.
- **Pure parsing/ranking/heuristic helpers** so the "intelligence" is unit-testable and doubles as
  the deterministic fallback.

## 6. Not in scope (logged)

- A hosted LLM provider (the `AiProvider` seam is ready; wiring keys/egress + data-residency review
  is its own task, aligned with the security/compliance iterations).
- Per-screen embedding of triage/generation/anomaly widgets beyond the command bar centrepiece — the
  endpoints exist and are tested; surfacing them inline on every existing screen in the App.jsx
  monolith is follow-up UI work.
