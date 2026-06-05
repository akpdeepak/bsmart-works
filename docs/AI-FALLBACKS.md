# AI Fallback Contract (Iteration 10, Cap Z / I10-S09)

> Every AI feature in bSmart Works answers one mandatory question (RB-40 §2): **"what happens when
> AI is off, over budget, or unavailable?"** The answer is a *deterministic fallback* shipped as part
> of the feature — never an afterthought. **No fallback documented = it does not ship.**
>
> This file is the narrative contract. Its machine-readable mirror is `AiFallbackRegistry`
> (served at `GET /api/v1/ai/fallbacks`) and is asserted by `DeterministicAiProviderTest`.

## How "off" happens

AI is gated by four scopes, most-restrictive-wins (`AiPolicyResolver`): **workspace → capability →
user → in-context**. It is also auto-disabled by budget: at **80%** of the monthly cap the plane
degrades to the cheap tier (Haiku), at **100%** it disables AI entirely (`AiBudgetService`). In every
"off" case the orchestration (`AiOrchestrationService`) serves the deterministic provider
(`DeterministicAiProvider`) and records `fallbackUsed = true` with the `DETERMINISTIC` tier — so a
workspace with AI fully disabled still has a complete, working experience.

## Per-capability fallbacks

| Capability | AI behavior | Deterministic fallback (always available) | Mutates? |
|------------|-------------|--------------------------------------------|----------|
| **NL → BQL** (`NL_TO_BQL`, I10-S12) | Interpret a natural-language phrase into a BQL query | `NlToBqlParser` — a rule-based phrase mapper produces BQL, validated through the real `BqlCompiler` before preview. An unrecognised phrase returns **low confidence**, and the UI directs the user to the manual BQL / visual builder. **Confirmation-first**: the result is a preview with a `[Confirm] [Edit] [Cancel]` plan — it never auto-runs a query or mutates. | No |
| **Summarization** (`SUMMARIZATION`, I10-S13) | Summarize comment threads / sprints / dashboards | `Summarizer` — an extractive picker that selects the most salient sentences (first / longest / last) deterministically. Read-only; no model required. | No |

## Guarantees that hold with AI off

- **Data boundary** (`DataBoundaryService`, I10-S11) is applied unconditionally — PII / financial
  redaction runs before anything could leave the box, so the seam is correct the moment a live
  provider is added behind a key.
- **Audit** (`ai_invocations`, I10-S08) records every call — including deterministic/fallback calls —
  so usage and cost are always attributable.
- **Confirmation-first** (I10-S02) means AI never silently mutates state; a state-changing capability
  always returns a plan a human confirms, executed deterministically.

## Adding a live model later

A live LLM provider implements the same `AiProvider` seam (behind an API key, out of scope this
iteration). The orchestration prefers it only when AI is enabled and under budget, and falls back to
the deterministic provider otherwise. No capability code changes — the control plane already governs
scope, budget, tiering, redaction, and audit.
