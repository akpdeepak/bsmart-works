# bSmart Works — Orchestrator

> Version 2.0 · owner: Deepak Pandey. This is the control-plane index; the compact runtime router is
> `AGENT-CORE.md`, and detailed behavior belongs to the owning rule book.

## 0. Prime directive

One product, one data model, one design system, one policy registry, and one live work state.
Consistency must be enforced by executable controls where possible and explicitly classified as
review or target-state where it is not.

Standing rules:

1. Executable repository state is the present; approved requirements are task-scoped targets.
2. Build only the active GitHub task/slice; do not infer authorization from a historical roadmap.
3. Stop for unresolved data-model, security, tenant-isolation, RBAC, or irreversible-migration
   decisions and record the answer durably.
4. Every task receives a right-sized plan, acceptance criteria, and validation plan. Coding work uses
   test-first RED → GREEN → REFACTOR.

Precedence: `SOURCE-OF-TRUTH.md`. Enforcement classification: `policy-registry.json`. Current facts:
`current-state.generated.json`.

## 1. Transformation commands

The phrases **“Start the bSmart Transformation Roadmap”** and **“Resume the bSmart Transformation
Roadmap”** authorize end-to-end work on the next approved GitHub task in the active program.

**Start:** fetch latest `main`; inspect open issues/PRs and the generated current state; claim one
approved task; record scope, acceptance, validation, lease, paths, and base SHA; create an isolated
worktree/branch and draft PR; execute its TDD/validation plan.

**Resume:** read the issue's latest machine-readable state and PR; verify lease, base/head SHA, branch,
diff, and last-green evidence; rerun the last targeted check; continue from `nextAction`. Code and
GitHub event state outrank generated prose snapshots.

Historical blueprints and source documents are read only when the active task cites a requirement or
a specific conflict requires the original evidence. Local Downloads copies are import candidates,
never runtime authority.

## 2. Routing

| Work touches | Owning rule book |
|---|---|
| Every repository mutation | `rulebooks/05-TASK-EXECUTION.md` |
| Backend/API/data/testing/release | `rulebooks/10-ENGINEERING.md` |
| Feature/roadmap scope | `rulebooks/20-PRODUCT.md` |
| Frontend/design/content/accessibility | `rulebooks/30-DESIGN.md` |
| Tenant/auth/AI/audit/performance | `rulebooks/40-GOVERNANCE.md` |

## 3. Operating loop

1. **Orient:** read the compact core, active task, applicable rules, and affected code/tests.
2. **Plan:** bound scope; order work; map acceptance criteria to validation and evidence.
3. **Claim:** for mutations, acquire the GitHub lease and reserved paths; use an isolated worktree.
4. **Build:** coding follows RED → GREEN → REFACTOR; checkpoint durable progress on the draft PR.
5. **Verify:** run targeted tests, then the changed/full/release profile required by risk.
6. **Review:** validate submitted PR evidence and required human decisions; resolve comments.
7. **Merge:** protected squash merge only when the required aggregate gate is green.
8. **Close:** GitHub automation records merge/main verification and releases the lease.

Read-only/advisory work completes after evidence-backed validation and does not invent a branch/PR.

## 4. Enforcement model

Every normative rule has one of four truthful states in `policy-registry.json`:

- `auto-block` — an executable check prevents readiness/merge;
- `auto-warn` — automation reports a risk but does not block;
- `required-review` — a named reviewer/decision owns judgment;
- `target-state` — approved future control, not represented as current enforcement.

A green build proves only the registered automated checks. It does not prove review-only product,
design, governance, or TDD chronology decisions.

The PR task contract maps acceptance IDs to validation evidence. `merge-gate` aggregates applicable
checks. Repository rules—not prose—protect `main`.

## 5. Ambiguity and decision rights

Proceed on low-risk, reversible implementation details answered by code and the active task. Ask once
and record the result when the choice changes scope, data, security, tenant behavior, RBAC,
irreversible migration, release safety, or an accepted architecture decision. A valid decision record
is reusable until its scope/hash changes or it expires.

## 6. Volatile state

Do not maintain versions, package counts, migration history, or active-work status in this file.

- Current implementation: `current-state.generated.json`.
- Current task/program: GitHub Issue/Project and PR/check state.
- Historical roadmap narrative: generated or archived documentation only.

## 7. Distribution

`AGENT-CORE.md`, this orchestrator, the precedence policy, rule books, and policy registry are
canonical. `scripts/generate-ai-rules.mjs` emits compact native projections for Codex, Claude Code,
Copilot, Cursor, Windsurf, and Google Antigravity. Size, routing, and synchronization tests block
drift. Never hand-edit a generated provider file.
