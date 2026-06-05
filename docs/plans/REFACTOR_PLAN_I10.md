# Refactor Plan — Iteration 10 · Cap O + Z · AI Orchestration + AI Control Plane

> Iteration 10 (Release 10.0) — *"AI arrives — architected as opt-in, with on/off control at
> workspace, capability, user, and context levels. Every AI feature has a deterministic fallback."*
> Branch: `claude/iteration-10-complete-y6ls0` · Pipeline: `docs/REFACTOR_MASTER_PROMPT.md`
> Status: **implemented + green** (backend + frontend), pending PR review.

> **Scope note (batching).** All thirteen iteration-10 specs (I10-S01…S13) on one branch, per the
> owner directive to complete the iteration in one pass. Iteration 10 is the genuine next iteration
> (iterations 8 and 9 are `Done`); nothing built ahead. The AI surfaces build on the existing
> `BqlCompiler` (NL→BQL validation).

---

## Classification: **Missing** (built to spec)

No AI code existed. The defining constraint of this iteration is honoured directly: **the whole
control plane is fully functional and testable without a live LLM key**, because AI is opt-in *with a
deterministic fallback*. That is achieved with a pluggable provider seam.

### Phase-1 findings by lens
- **Architect:** AI must be ONE orchestration layer (a unification layer), never per-capability model
  calls. Built `AiOrchestrationService` as the single entry point and `AiProvider` as the one seam,
  with `DeterministicAiProvider` as the always-available implementation that *is* the spec's
  fallback. A future `LiveAiProvider` plugs into the same seam behind a key — no capability changes.
- **System designer:** every call is gated deterministically — scope resolution (`AiPolicyResolver`,
  most-restrictive-wins) → budget state (`AiBudgetService`, 80/100 thresholds) → data-boundary
  redaction (`DataBoundaryService`) → tier selection → provider → exactly one `ai_invocations` audit
  row. Confirmation-first: state-changing capabilities return a plan, never auto-execute.
- **Product manager:** delivers the chapter's scenarios — AI fully disabled for a regulated tenant
  (deterministic experience intact), AI on for engineering but off for compliance, a user opting out,
  a budget that auto-degrades, and "open bugs assigned to me" → BQL preview the user confirms.
- **UI/UX lead:** the AI accent is brand-orange (the one orange element); the assistant degrades to a
  clear "AI off — deterministic" state rather than disappearing into an error; confirmation uses one
  `[Confirm] [Edit] [Cancel]` pattern. The control plane is a five-tab admin surface.
- **Developer:** new migration `V40`; `manage_ai` permission (ADMIN); pure logic isolated from I/O
  for testability; new entities added to the JaCoCo exclude list.

---

## In-scope changes (by spec)
- **S01/S02/S12/S13** — `AiOrchestrationService` + `AiOrchestrationController` (`/ai/nl-to-bql`,
  `/ai/summarize`), `DeterministicAiProvider`, `NlToBqlParser` (validated by `BqlCompiler`),
  `Summarizer`. Confirmation-first preview for NL→BQL.
- **S03/S04/S10/S11** — `AiPolicyController` (`/ai/policy`): mode, capability toggles, model tier,
  data boundary; `AiPolicyResolver` (scope hierarchy), `DataBoundaryService` (redaction).
- **S05** — `AiPreferenceController` (`/ai/preferences`): caller sets only their own preference.
- **S06** — `AiBudgetController` (`/ai/budget`) + `AiBudgetService` (80% degrade / 100% disable).
- **S07** — `AiUsageController` (`/ai/usage`): tokens/cost/calls by user/capability/tier.
- **S08** — `AiAuditController` (`/ai/audit` + `/export`): the `ai_invocations` log.
- **S09** — `AiFallbackRegistry` + `/ai/fallbacks` + `docs/AI-FALLBACKS.md`.

## Out of scope (parked → `docs/PARKED.md`)
- The **live LLM provider** implementation (behind an API key) + real token/cost metering — the seam,
  tiering, budget accrual and audit are all in place; the deterministic provider is the active one.
- A topbar orange AI button that disappears when AI is off (the assistant is reached via nav; the
  degrade-gracefully state is built).
- Richer NL→BQL grammar (dates beyond "today", free-text values) — the rule-based parser covers the
  spec's example phrases and falls back to the manual builder otherwise.

## Test plan & results
- **Unit (pure):** `AiPolicyResolverTest` (full truth table, most-restrictive-wins),
  `AiBudgetServiceTest` (80/100 boundaries → tier), `NlToBqlParserTest` (phrases→BQL + low
  confidence), `SummarizerTest`, `DataBoundaryServiceTest` (PII/financial redaction),
  `DeterministicAiProviderTest` (+ fallback registry).
- **Access (mandatory RB-40):** `AiControlPlaneAccessTest` — non-admin cannot change policy / budget /
  capabilities / data boundary; AI surfaces denied for non-members; bad-request guards.
- **Frontend:** smoke tests for `AiControlPlaneView` and `AiAssistantView` (incl. the AI-off state).
- **Result:** backend 296 unit tests green + JaCoCo gate met + compile/checkstyle; frontend 131 tests
  green + eslint clean + build OK; guardrails blocking rules clean.
- **Not run here (honest gap):** a live model is not exercised (no key/provider — by design); row-level
  Testcontainers + browser validation remain the standing follow-up.

## Risk & rollback
- `V40` is forward-only/additive (new tables only); rollback is a new forward migration.
- AI is fail-closed: OPT_IN by default, redaction unconditional, budget auto-disables — runaway spend
  is impossible and the deterministic path always works.
- The feature is isolated behind its own tables, endpoints, permission, and nav entries — reversible.
