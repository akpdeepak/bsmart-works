<!-- GENERATED FROM ai-rules/ — do not edit by hand.
     Run: node scripts/generate-ai-rules.mjs
     Provider projection: Codex and cross-tool root. -->

# bSmart Works — Agent Core

> Canonical compact router for every coding agent. Detailed rules live in the referenced rule books
> and load only when their domain is in scope. Generated provider files are projections, never
> sources of truth.

## Authority

1. **Current implementation:** executable code, manifests, migrations, tests, and workflows.
2. **Process and policy:** `ai-rules/`.
3. **Product targets:** normalized requirements and approved active EPIC/task.
4. **Architecture decisions:** accepted ADRs and decision records.
5. **Live work status:** linked GitHub Issue/Project, PR, checks, and merge SHA.
6. **Historical source documents:** reference material only unless an active requirement cites them.

If current code and a target specification disagree, preserve the current implementation unless the
active task explicitly authorizes the target change. Stop for unresolved data-model, security,
tenant-isolation, RBAC, or irreversible-migration decisions.

## Every task

Before execution, write a right-sized plan containing:

- objective and bounded in/out scope;
- ordered steps, dependencies, assumptions, and risks;
- testable acceptance criteria;
- criterion-to-check validation mapping and expected evidence.

Read-only work stops after evidence-backed validation. Repository mutations use a branch and PR.
Coding work follows **RED → GREEN → REFACTOR**: write and run the smallest relevant test first,
observe the intended failure, implement the minimum passing behavior, then improve while green. Pure
refactors establish characterization coverage; non-code work does not invent TDD evidence.

## Coordination

- GitHub is the durable coordination plane; chat-only decisions and unpushed code are not progress.
- One writer owns a branch/worktree. Parallel writers require separate tasks and non-overlapping
  reserved paths or an explicit dependency order.
- Use `type/gh-<issue>-<slice>-<slug>` and record base/head SHA in the task state.
- Open a draft PR after planning. Draft RED checkpoints may be pushed but must remain explicitly
  non-mergeable. Never mark a red PR ready or merge it.
- Resume from the task's machine-readable state and PR, verify SHAs and lease, inspect the diff, rerun
  the last targeted check, then follow `nextAction`.

## Build invariants

- RBAC belongs in services; every tenant-data path is workspace-scoped and tested cross-tenant.
- Validate DTOs at boundaries; use one error envelope and `/api/v1/...` routes.
- Schema changes are forward-only Flyway migrations; compute the next number from migration files.
- Frontend HTTP uses `apiClient`; styling uses design tokens; user-facing UI covers loading, empty,
  error, permission-denied, and success states.
- AI product surfaces route through the AI Control Plane with scope, budget, audit, and deterministic
  fallback.
- Change only the requested scope. Capture adjacent work as a separate task.

## Rule routing

| Work touches | Read |
|---|---|
| Any repository mutation | `ai-rules/rulebooks/05-TASK-EXECUTION.md` |
| Backend, API, migration, tests, release | `ai-rules/rulebooks/10-ENGINEERING.md` |
| Feature scope or roadmap | `ai-rules/rulebooks/20-PRODUCT.md` |
| Frontend, UI, content, accessibility | `ai-rules/rulebooks/30-DESIGN.md` |
| Tenant data, auth, AI, audit, performance | `ai-rules/rulebooks/40-GOVERNANCE.md` |
| Cross-document conflict | `ai-rules/SOURCE-OF-TRUTH.md` |

Current machine-derived facts are in `ai-rules/current-state.generated.json`. Rule enforcement
classification is in `ai-rules/policy-registry.json`.

## Verification

- Targeted TDD: run the smallest failing/passing test during implementation.
- Changed profile: `node scripts/verify.mjs --profile changed`.
- Full profile: `node scripts/verify.mjs --profile full`.
- Release profile: `node scripts/verify.mjs --profile release`.
- AI rules/state: `node scripts/generate-ai-rules.mjs --check` and
  `node scripts/generate-project-state.mjs --check`.

Do not claim completion until acceptance criteria map to evidence, the required profile is green, the
PR is merged through protected `main`, and the merge/check state is recorded by GitHub.
