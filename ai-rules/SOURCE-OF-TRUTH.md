# bSmart Works — Source of Truth and Precedence

> Version 2.0 · owner: Deepak Pandey · generated projections are never authoritative.

## One authority per kind of information

| Information | Authority | Examples |
|---|---|---|
| Current implementation | Executable repository state | `pom.xml`, `package.json`, source packages, migrations, tests, workflows |
| Process and policy | `ai-rules/` | Agent core, rule books, policy registry |
| Product requirements | Normalized requirement catalogue plus the approved active task | Stable requirement and acceptance IDs |
| Architecture decisions | Accepted ADR or durable GitHub decision record | Status, scope, owner, trigger, evidence |
| Live work status | GitHub Issue/Project + PR/check/merge state | Owner lease, SHAs, acceptance evidence, next action |
| Historical input | Archived source documents | Blueprints, old prompts, superseded plans |
| Provider instructions and roadmap views | Generated projections only | `AGENTS.md`, `CLAUDE.md`, `.agents/rules`, roadmap snapshots |

The machine-derived summary of current implementation facts is
`ai-rules/current-state.generated.json`. If that file disagrees with its executable inputs, regenerate
it; the inputs win.

## Conflict resolution

Apply this order:

1. **Current implementation fact:** executable code/manifests/migrations/tests/workflows win.
2. **Current process:** the owning `ai-rules/` rule and `policy-registry.json` win.
3. **Approved target behavior:** the active task's cited requirement and acceptance criteria win for
   that task only. A target document does not silently change current architecture.
4. **Architecture change:** an accepted decision record plus linked active task is required.
5. **Two active requirements disagree:** stop and obtain a durable decision record. Never guess on
   data model, security, tenant isolation, RBAC, or irreversible migrations.

“Choose the stricter document” is not a precedence rule. It often creates accidental scope and must
not be used.

## Current, target, and historical must not be mixed

Every maintained requirement, decision, or operational document uses one lifecycle state:

- `current` — demonstrably implemented, with executable evidence;
- `accepted-target` — approved but not yet shipped; actionable only through a linked task;
- `in-progress` — an active GitHub task owns delivery;
- `historical` — retained as input/evidence, not operational guidance;
- `superseded` — replaced by a named source.

Provider/model names, migration numbers, package counts, versions, and live EPIC status are volatile.
They must be computed or referenced, not copied into multiple policy files.

## Accepted targets

Previously deferred capabilities—message broker, bidirectional WebSocket use cases, native mobile,
jOOQ, SAML/OAuth2 SSO, and target AWS/Terraform/OpenTelemetry infrastructure—remain accepted targets
only. Each becomes current only after its own approved task, tests, merge, and generated-state update.
Until then, build against the current implementation recorded by executable sources.

## Maintenance

- Change policy in `ai-rules/`, then regenerate provider projections.
- Record architectural reversals as decision records before implementation.
- CI checks generated facts, provider parity/budgets, required links, and policy metadata.
- GitHub automation generates live status; do not manually maintain a competing resume ledger.
