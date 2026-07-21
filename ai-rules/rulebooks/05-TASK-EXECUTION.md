# Rule Book 05 — Task Execution & Ways of Working

> Owns **how any task — raised by the user *or* self-identified by an AI tool — goes from idea to
> its requested delivery state.** This is the detailed, gated expansion of the
> [Orchestrator](../00-ORCHESTRATOR.md).
> Run it for **every** task. Stage 0 right-sizes the detail, but scope planning, acceptance criteria,
> and validation planning are never skipped.
> Enforcement is classified truthfully in `../policy-registry.json`; planning/TDD chronology retains
> a review component even when submitted evidence is machine-validated.

---

## Stage 0 — Intake & triage *(added)*

**Capture and classify** the task: feature · bug · refactor · chore · spike · hotfix.

**If *you* (the AI tool) surfaced this task, do not fold it into the current work.** Capture the
candidate with the same right-sized scope analysis, acceptance criteria, and validation plan, then
surface or log it separately. Planning does not authorize implementation. The default for
self-identified work is **propose, never silently expand implementation scope** (RB-10 §9, scope
discipline). Anything touching **data model, security, tenant isolation, or RBAC → stop and get
Deepak's sign-off before implementation** (Orchestrator §5).

**Earns-its-place + active-task check:** confirm the task closes a real gap (RB-20 §1) and belongs to
the approved active program/slice. Historical iteration numbering does not authorize or prohibit work;
the linked GitHub task and durable decisions do.

**Right-size the rigor — pick a lane** *(added)*:

| Lane | Examples | Process |
|------|----------|---------|
| **Read-only / advisory** | review, diagnosis, explanation | micro-plan + acceptance + evidence-backed validation; no branch/PR |
| **Documentation / trivial mutation** | typo, copy, isolated docs/config | micro-plan + targeted check + PR when repository content changes |
| **Standard code** | feature, endpoint, component, bug | GitHub task contract + full TDD/validation + impacted CI + PR |
| **Large / risky** | schema, cross-cutting, tenant/security/AI/compliance | full workflow + durable approval after Stage 3 + independent review |
| **Release** | tag, production promotion, rollback | verified immutable artifact + environment approval + health/rollback plan |

---

## Stage 1 — Clarify & define (Definition of Ready)

- **Resolve ambiguity first.** If the task has 2+ valid interpretations, ask **one** sharp question
  rather than planning the wrong thing. Don't proceed on a guess for anything irreversible.
- **Definition of Ready** (gate to enter Stage 2): scope is clear · acceptance criteria drafted ·
  requested delivery state and active task confirmed · dependencies known · applicable rules listed.

---

## Stage 2 — Scope expansion & execution plan

Walk the [routing table](../00-ORCHESTRATOR.md#2-routing). For **each dimension the task
touches**, write what it requires — this *is* what "multidimensional" means here:

- **Product (RB-20):** which requirement/capability/task; does it earn its place.
- **Engineering (RB-10):** layers touched; data + migration (expand-contract if schema changes);
  API contract; BQL.
- **Design (RB-30):** screens/components; the five states; tokens.
- **Governance (RB-40):** workspace scoping; field-level security; AI Control Plane (scope, budget,
  fallback, audit); NFR budget; audit/compliance; data-governance.
- **Delivery (RB-10 ops):** branch, PR size, CD, release/tag.

**Holistic / second-order** *(systems-thinking)*: list dependencies, the ripple across the seven
unification layers, what could break elsewhere, affected downstream iterations, and reversibility.

"Expand scope" here means **expand the analysis** until all work required for the requested outcome
is visible and decomposed. It does not broaden implementation scope or authorize adjacent work.

### Mandatory execution plan

**Every task produces one written plan, sized to its lane, before execution begins.** The plan must
contain:

- **Objective** — the outcome and why it matters.
- **Scope and boundaries** — in scope, out of scope, and affected rule-book dimensions.
- **Execution steps** — ordered work, dependencies, assumptions, risks, and reversibility.
- **Acceptance criteria** — specific, testable statements defining done.
- **Validation plan** — each criterion's test/check, expected result, and evidence.
- **Change safety** — migration and rollback details when applicable.

Stage 3 completes the acceptance-criteria and validation sections of this same plan. On the
**Large/risky** lane, the completed Stage 3 plan is the Deepak checkpoint *before* code or other
implementation.

---

## Stage 3 — Test & validation plan *(before code)*

- Map every acceptance criterion to a test case or observation, test level, exact command/check,
  expected result, and required evidence.
- Enumerate the **mandatory scenario categories**: happy · edge · error · empty ·
  **unauthorized · cross-tenant** (RB-40 §1) · **performance vs NFR budget** if on a hot path
  (RB-40 §5) · **accessibility** if UI (RB-30 §6). Mark a category N/A only with a reason;
  unauthorized and cross-tenant cannot be N/A when authorization or tenant data is touched.
- Choose test levels: unit (JUnit 5 / Vitest) · integration (**Testcontainers, real Postgres**) ·
  E2E (Playwright when active).
- Define **"working as expected"** concretely: the exact checks/observations that will prove it.
- For coding work, name the test cases that will be authored first and their expected RED result; a
  pure refactor records the pre-edit characterization baseline instead. Implementation code
  cannot begin until this plan is complete.

### Coding tasks — test-first TDD

Apply this cycle to every coding-related change that alters executable behavior—including
application, migration, automation, and infrastructure/configuration code—and every bug fix:

1. **RED — write the test first:** before implementation code, write the smallest relevant automated
   test and run it. Confirm the expected failure is caused by the missing behavior or broken
   contract, not by syntax, setup, or an unrelated defect. Record the command and failure evidence.
2. **GREEN — implement the minimum:** write only enough production code to pass the new test, then
   run the targeted suite and record the passing evidence.
3. **REFACTOR — improve while green:** simplify names, structure, and duplication without changing
   behavior; keep the targeted and related suites green.

Repeat in small increments. Bug fixes begin with a reproducing regression test. Pure refactors first
establish or add passing characterization coverage, then make production edits in green increments;
do not manufacture a fake RED. If a coding-related implementation cannot be tested first, stop and get
Deepak's explicit approval before implementation, with the blocker documented. Non-code work still
requires the written plan, acceptance criteria, and validation plan, but does not invent TDD evidence.

---

## Stage 4 — Claim and prepare the workspace

- Repository mutations acquire a GitHub task lease containing owner/app/run identity, expiry,
  reserved paths, and base SHA. Read-only/advisory work skips this stage.
- Use an isolated worktree/clone and branch `type/gh-<issue>-<slice>-<slug>` from current `main`.
  **Never work on or push to `main` directly.** One writer owns a branch/worktree.
- Open a draft PR after the plan is recorded so checkpoints and handoffs survive app/machine loss.
- Confirm local hooks are active (husky / pre-commit) so lint + guardrails run on staged files.

---

## Stage 5 — Build

For coding-related work, execute the Stage 3 TDD cycle in order. Do not write implementation before the
test is authored and its intended RED is observed; pure refactors use the documented characterization
baseline. A short-lived RED checkpoint may be pushed only to an explicitly draft, non-mergeable PR;
never mark it ready or merge it. Prefer small cycles and checkpoint every green micro-slice.

Apply the in-scope rulebook principles — the build non-negotiables (Orchestrator §2.4):
one job per layer · **RBAC in the service** · **every query workspace-scoped** · **tokens not
literals** · one `apiClient` · one error shape · **Flyway-only** (next migration computed by
`generate-project-state.mjs`) ·
validate every DTO at the boundary · **change only what the task needs** (drive-by improvements get
logged per Stage 0, never smuggled in). Commit in logical increments with clear messages.

---

## Stage 6 — Test & validate

- Run the Stage 3 plan and all applicable scenario categories.
- During development run targeted tests. Before review run `verify --profile changed`; large/risky
  work runs the affected full suites. Full repository/integration/E2E runs on `main`, nightly, and
  release rather than being duplicated for every small local change.
- Validate against acceptance criteria and the "working as expected" definition. UI → verify the
  five states + a11y. Tenant/AI/perf → verify the RB-40 gates.
- **If any final validation fails → return to Stage 5. Never force a red change forward** *(failure
  path)*. The intentional local RED from the test-first cycle is Stage 5 evidence, not a shippable state.

---

## Stage 7 — Review & merge *(gated)*

- Keep the linked GitHub issue as the single task contract. The PR summarizes the change and carries a
  machine-readable mapping from acceptance IDs to validation plus TDD evidence; do not copy the full
  plan into another prose artifact.
- Complete only applicable review decisions; automated checks report themselves.
- **Merge is gated:** CI must be **green** (the gate blocks merge) **and** review approved →
  **squash-merge only**. Never merge red; never direct-push to `main`.
- *Agent note:* merging, pushing to protected `main`, tagging/releasing, and deploying are
  irreversible/remote actions — when an AI tool is executing, these require explicit human
  go-ahead, consistent with branch protection.

---

## Stage 8 — Post-merge verification & remote *(sharpened)*

For repository mutations, confirm:

- the branch was pushed and the **PR is merged on github.com**;
- **`origin/main` actually contains the change** (not just your local main);
- **CI is green on `main`**; the feature branch is deleted.
- **Release task?** tag + CHANGELOG + immutable tested artifact + deployment health/rollback evidence.

Read-only work is done when its acceptance criteria and evidence-backed validation are delivered.
Repository mutations are done at the requested delivery state—PR, merged, or released—with required
checks green. GitHub automation records merge/main verification and releases the task lease atomically.

---

## Stage 9 — Failure & rollback paths *(added)*

- **CI red on the branch** → fix on the branch, re-run; never merge to clear it.
- **Validation shows it doesn't work** → back to Stage 5; the change does not ship.
- **A merged change breaks `main`** → revert or hotfix (RB-10 §9.5); `main` stays releasable.
- **Follow-ups discovered en route** → logged as new issues (Stage 0), not added to this PR.

---

### What's enforced here
Submitted task/PR shape and acceptance mappings → contract validators; leases/transitions/path overlap
→ agent-coordination workflow; build invariants → guardrails, linters, architecture tests, and behavior
tests; mergeability → required GitHub rules/checks. Triage, right-sizing, and true TDD chronology remain
required-review controls; automation must not claim it independently proves them.
