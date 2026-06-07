# Iteration 20 — Polish, Advanced AI & Marketplace Foundation (completion)

Iteration 20 is the final iteration: after it, Works is commercially complete — sellable to
enterprise customers, internationally, with a third-party ecosystem, fully accessible, fully secure
(spec `06`, Part 7, ITER 20). Everything here layers on the existing data model and the **AI Control
Plane** (RB-40 §2) without disturbing the iterations beneath it.

> **No live model in this build.** Every AI capability routes through `AiControlPlaneService` and the
> deterministic offline provider, exactly as in iterations 11–15. AI-on and the fallback differ in
> narrative richness and cost accounting, never in correctness — the structured result is always
> computed deterministically from real, workspace-scoped data. Each new capability ships a
> **documented fallback** (RB-40 §2: "no fallback documented = it does not ship").

## 1. Advanced AI — Cap O

| Sub-feature | What shipped | Key endpoint(s) |
|---|---|---|
| Custom AI assistants | Workspace-defined personas (e.g. "BCITS Compliance Assistant"); persona- + memory-grounded chat; admin-managed (`manage_ai`) | `/api/v1/ai/assistants` (+ `/{id}/chat`) |
| Multi-step AI agents | A goal is planned into ordered capability steps (triage → routing → generation…) and executed as an audited, read-only `AiAgentRun` + steps | `/api/v1/ai/agents/run` (+ `/runs`, `/runs/{id}`) |
| AI memory / context | Preferences, context and history remembered across sessions, scoped to (workspace, user); grounds the assistant | `/api/v1/ai/memory` |
| Conversational dashboards | Natural-language ask → structured widget spec (metric · grouping · timeframe · chart), saveable | `/api/v1/ai/conversational-dashboards` (+ `/compile`) |

Migration **V52**. Frontend: **AI Studio** view (Assistants · Agents · Ask), each reply badged with
the control-plane verdict (AI vs Offline fallback).

## 2. App Marketplace foundation + Developer Portal — Cap R

- **Marketplace:** a global, browsable extension catalogue (4 first-party listings seeded); per-
  workspace installs with server-side **permission scoping** (granted scopes must be a subset of the
  listing's requested scopes); publish/edit restricted to the owning workspace; cross-tenant installs
  invisible/unmutable. `GET/POST /api/v1/marketplace/{listings,installed,install}`.
- **Developer Portal:** an SDK manifest (extension points, scopes, example manifest) and sandbox
  credentials for third-party developers. `/api/v1/developer-portal/{sdk,sandbox-credentials}`.

Migration **V53**. Frontend: Marketplace + Developer Portal views.

## 3. Advanced Knowledge — Cap I

- **Document templates** (workspace-scoped markdown skeletons; Runbook / ADR / Postmortem seeded).
- **Multi-author collaboration** (author / co-author / reviewer roster on knowledge articles).
- **AI structured-data extraction** (deterministic regex/keyword fallback: emails, dates, ids,
  key:value pairs), routed through the control plane.

Migration **V54**. Frontend: Advanced-Knowledge templates + extraction view.

## 4. Customer chat support — Cap N

Real-time portal chat with **AI tier-1 auto-response and human escalation**: the first/customer
message runs through the `support_chat` capability; on fallback (AI off/over-budget) or an explicit
"talk to a human" request, the conversation is escalated with a canned holding reply for an agent to
pick up. Agent-side **Support Inbox** (claim, reply, resolve) and a customer-portal chat widget.

Migration **V55**. Endpoints `/api/v1/support-chat` (agent) + `/portal` (customer).

## 5. Localization — Cap A

A dependency-free i18n layer: a **10-language** catalogue (en/hi/es/fr/de/pt/ja/zh/ar/ko) with
English fallback, **RTL** support for Arabic (`<html dir>`), a persisted per-user locale
(`PUT /api/v1/users/me/locale`, server-validated against the 10 supported codes), and a top-bar
language switcher. The primary navigation is translated end to end. Migration **V56** (locale column).

## 6. Performance (Cap S), Security (Cap T), Accessibility (Cap A)

- **Performance:** composite indexes for the hottest query shapes (`work_items(project_id,status)`,
  `work_items(assignee_id,status)`, `events(workspace_id,occurred_at)`); the load-test plan and the
  RB-40 §5 NFR budgets are documented in **`PERFORMANCE.md`**. Migration **V56**.
- **Security:** the disclosure / coordinated-response / bug-bounty policy and the enforced security
  posture are documented in **`SECURITY.md`** (on top of the existing CI gate: gitleaks, `npm
  audit`, guardrails, unauthorized + cross-tenant tests).
- **Accessibility:** the WCAG 2.2 AA audit and per-criterion status are in **`ACCESSIBILITY.md`**;
  enforced by `eslint-plugin-jsx-a11y`, the token palette (AA contrast), and the five-state +
  focus-visible component contract.

## 7. Governance & verification

- **Tenant isolation (RB-40 §1):** every new table carries `workspace_id`; every repository query is
  workspace-scoped; every feature ships **unauthorized** and **cross-tenant** unit tests.
- **AI Control Plane (RB-40 §2):** five new capabilities registered with default tiers and documented
  fallbacks; scope/budget/cache/audit applied centrally; PII redacted at the server boundary.
- **Gate:** backend unit suite + JaCoCo coverage green; all blocking guardrails pass; frontend lint +
  build green; full Vitest suite (292 tests) passes. Migrations are forward-only, the next sequential
  numbers (V52–V56), and valid PostgreSQL (applied end-to-end by the Testcontainers CI job).

Orchestrator §6 updated: **active iteration 20 (complete)**, Flyway high-water mark **V56**, next
migration **V57**. The generated AI-rules files were regenerated from `ai-rules/` and are in sync.
