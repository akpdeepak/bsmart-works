# Iteration 10 — AI Orchestration Foundation + AI Control Plane (completion)

Iteration 10 was designed to be the first AI-bearing iteration: the AI Control Plane foundation
plus two initial AI surfaces (natural language → BQL, and summarization). In practice, the
Control Plane and iteration-11's broad AI expansion were delivered together in a single body of
work (see `ITERATION-11-COMPLETE.md`). This file records that decision and its rationale.

> **Delivered together with iteration 11.** After reviewing the build complexity — the Control
> Plane is not useful without at least two AI surfaces exercising it — the iteration-10 foundation
> and the iteration-11 AI surfaces were built as one cohesive deliverable. Every iteration-10
> commitment listed below is fully delivered; it is documented in `ITERATION-11-COMPLETE.md`.

## What was committed in iteration 10

All of the following are **delivered** (in `ITERATION-11-COMPLETE.md` / migration `V39`):

| Sub-feature | Status | Where documented |
|---|---|---|
| AI Orchestration service (`AiControlPlaneService`) | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| Confirmation-first pattern | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| Workspace AI policy (enabled/disabled/opt-in) | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| Per-capability AI toggle | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| Per-user AI preference | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| AI budget caps (80% → Haiku, 100% → auto-disable) | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| AI usage dashboard (tokens, cost, rate) | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| AI audit log (every invocation) | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| Fallback documentation (deterministic fallback per capability) | ✓ Delivered | `ITERATION-11-COMPLETE.md §2` |
| Model tier selection (Haiku / Sonnet / Opus) | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| Data boundary controls (PII redaction at server boundary) | ✓ Delivered | `ITERATION-11-COMPLETE.md §1` |
| Natural language → BQL (first AI surface) | ✓ Delivered | `ITERATION-11-COMPLETE.md §2` (command bar) |
| Summarization (second AI surface) | ✓ Delivered | `ITERATION-11-COMPLETE.md §2` (sprint/comment summary) |

## Why delivered together

1. **The Control Plane has no user-visible value without at least one AI surface.** A delivered
   "AI platform" that no capability exercises ships with zero demonstrable outcome.
2. **The iteration-11 AI surfaces cannot ship without the Control Plane.** The dependency is
   complete and bidirectional — building them separately would have required stub scaffolding that
   would be immediately discarded.
3. **The combined scope fit one sprint.** The Control Plane's data model (V39) and the iteration-11
   surfaces were within the right-sizing bounds of RB-05 Stage 0 for a "Standard" lane delivery.

## Data model

**`V39__ai_control_plane.sql`**: `ai_policies` (workspace/capability/user scope hierarchy),
`ai_budgets` (monthly cap, spend, tier-degrade thresholds), `ai_invocations` (append-only audit
log), `ai_cache_entries` (prompt-hash → response deduplication), and the `manage_ai` permission
(ADMIN tier). All tables workspace-scoped.

## Architecture principles established (held across all subsequent iterations)

- **Scope hierarchy: most-restrictive-wins.** WORKSPACE → CAPABILITY → USER → in-context. Turning
  AI off at the workspace disables it everywhere downstream — no capability can bypass it.
- **Every AI capability documents its deterministic fallback before it ships** (RB-40 §2). This is
  a build gate, not a documentation afterthought: "no fallback documented = it does not ship."
- **No capability calls a model on its own terms.** Every model call routes through
  `AiControlPlaneService.invoke(...)` — one budget, one audit trail, one fallback policy.
- **Server-side AI only.** Model calls originate server-side; PII is redacted before it could leave
  the JVM boundary (RB-10 §8, RB-40 §2).
- **Response caching** (~40% cost reduction) is applied at the Control Plane layer — capabilities
  never implement their own caching.

These principles are foundational to iterations 11–20.
