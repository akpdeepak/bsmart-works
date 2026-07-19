---
status: current
authority: explanatory
canonical: ai-rules/
---

# bSmart Works engineering principles

These principles explain the intent behind the canonical policies in [`ai-rules/`](../ai-rules/).
The `ai-rules/` directory is canonical for operational policy.
If explanatory prose conflicts with executable facts or an applicable rulebook, follow
[`ai-rules/SOURCE-OF-TRUTH.md`](../ai-rules/SOURCE-OF-TRUTH.md).

1. **Executable truth first.** Derive current versions, packages, migrations, and behavior from the
   repository; generated summaries must be reproducible.
2. **One authority per fact.** Policy lives in `ai-rules/`; live work state lives in GitHub; generated
   provider instructions and snapshots are projections.
3. **Tenant isolation is structural.** Scope data access by workspace and enforce RBAC server-side.
4. **Prefer a modular monolith.** Keep domain ownership clear; distribute only when measured needs
   justify the operational cost.
5. **Unify shared concepts.** Reuse the event/audit, identity, query, AI-control, customization,
   knowledge, and design-system layers.
6. **Define done before building.** Every task has acceptance criteria and a validation map. Coding
   changes capture a failing test first, then the minimal implementation, then refactoring on green.
7. **Evidence survives sessions.** Issues own plans and leases; pull requests map criteria to tests;
   checks own validation results.
8. **Automation claims only what it proves.** Distinguish blocking checks, warnings, required human
   review, and target-state commitments.
9. **Fast feedback, full backstop.** Run impact-based checks while iterating and full verification at
   release boundaries.
10. **Promote one immutable artifact.** Build and test once, then deploy the identified artifact with
    mandatory health verification and a recoverable rollback path.

Canonical references: [`AGENT-CORE.md`](../ai-rules/AGENT-CORE.md),
[`05-TASK-EXECUTION.md`](../ai-rules/rulebooks/05-TASK-EXECUTION.md), and
[`policy-registry.json`](../ai-rules/policy-registry.json).
