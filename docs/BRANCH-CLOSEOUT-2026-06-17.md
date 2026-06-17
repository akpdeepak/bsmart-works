# Active Branch Closeout - 2026-06-17

> Purpose: preserve useful product/spec intent from active or risky branches before closing stale
> PR work. This is a spec-preservation document only. It does not merge branch code, delete feature
> intent, or authorize destructive cleanup.
>
> Rule: do not merge any listed branch as-is unless it is rebased onto current `main`, conflicts are
> resolved, migrations are renumbered from the current high-water mark, and the full DoD/CI gate is
> green.

## Summary

`main` remains the source of truth. The branch audit found one open PR branch, eight no-PR branches
ahead of `main`, and ten already-closed PR branches with commits not reachable from `main`.

Most branches are not safely mergeable as branches because they are stale, conflict with current
`main`, carry old migration numbers/package names, or represent revert/recovery attempts. Their
useful scope is parked below as future work or acceptance criteria.

## Closeout Decisions

| Branch | Status | Scope captured | Decision |
|---|---|---|---|
| `claude/bsmart-uiux-wi31-76lygr` / PR #387 | Open PR, conflicts, failing CI | WI-31 board swimlanes and bulk preview; WI-32 workflow/field/permission UI; WI-33 premium data table | Close PR. Rebuild as smaller PRs from fresh `main`. |
| `feat/uiux/wi06-10-heart-widgets` | No PR, recent, ahead 2 | HEART metrics widgets across dashboards; work item activity hook | Park scope. Recreate from fresh `main` after checking what PR #388 already shipped. |
| `fix/uat-wi28-activity-feed-url-and-tests` | No PR, recent, ahead 1 | Activity endpoint URL correction and snake_case response normalization | Park as targeted fix candidate. Reapply only if current `main` still has the defect. |
| `p1/workflow-features` | No PR, large, ahead 17 | Know Studio P1 workflow, discovery, collaboration, article metadata, comments, search | Park as roadmap material. Do not merge whole branch. Split by KR and current Know roadmap status. |
| `p1/frontend-features` | No PR, ahead 1 | Know find/replace, properties panel, focus mode, readability, recently viewed | Park as KR-level scope. Check current `docs/plans/KNOW-ROADMAP.md` before rebuilding. |
| `p1/discovery-features` | No PR, ahead 13 | Know tags, favorites, filters, related articles, full-text search, comments, page tree | Park as KR-level scope. Likely partially superseded by merged Know PRs. |
| `claude/bsmart-uiux-program-2ckbzi` | No PR, docs-only, ahead 1 | HEART metrics spec and activation funnel definition | Park as spec input. Merge only after reconciling with current `docs/HEART-METRICS.md` and UIUX roadmap. |
| `feat/saved-filter-subscribe` | No PR, very stale, ahead 1 | Saved-filter subscriptions and notification matcher | Park concept only. Old package path and migration number make branch unsafe. |
| `refactor/frontend-split-app-jsx` | No PR, very stale, ahead 7 | App.jsx decomposition, rich-text editor, article analytics/versioning, markdown XSS fix | Park concept only. Rebuild security fixes independently if not already present. |
| `revert/know-studio-p1-416129e` / PR #392 | Closed PR, large deletion | Revert attempt for Know Studio P1 to restore green main | Do not revive as-is. It removes substantial functionality. Use only as forensic context. |
| `fix/restore-knowledge-ai-service` / PR #390 | Closed PR, ahead 1 | Restore KnowledgeAiService methods and repair broken main after Know P1 | Park as recovery context. Reapply only if current main still fails in this area. |
| `claude/fix-report-template-seed-test` / PR #331 | Closed PR, ahead 2 | Align `ReportTemplateSeedIT` with V88 templates | Park as test repair candidate; validate against current V88/V90 state first. |
| `feat/h1-id-scoping` / PR #174 | Closed PR, very large, ahead 30 | Workspace ownership enforcement across `/{id}` endpoints; guardrail/docs updates | Park security objective. Rebuild in focused security PRs with current package layout. |
| `claude/iteration-8-bFw95` / PR #100 | Closed PR, stale | SLA engine internal/generalized implementation | Park as historical iteration context; current iterations have moved beyond it. |
| `claude/iteration-12-complete-3f0s5` / PR #98 | Closed PR, stale | KPI framework with privacy guardrails | Park as historical iteration context; reconcile with current KPI implementation before reuse. |
| `claude/iteration-10-complete-y6ls0` / PR #103 | Closed PR, stale | Iterations 8-10: SLA, service/customer portal, AI control plane | Park as historical context only. Too broad to merge. |
| `docs/refactor-engine-bootstrap` / PR #69 | Closed PR, docs-only | Spec-refactor engine bootstrap | Park docs concept; merge only after reconciling current refactor docs. |
| `claude/fix-workspace-controller-access-test` / PR #82 | Closed PR, stale | Workspace controller test repair and old migration collision fix | Park as historical fix; current Flyway high-water mark supersedes old migration numbering. |
| `feat/compliance-rules-api` / PR #67 | Closed PR, stale | Compliance rule CRUD and workspace-scoped dry run | Park product requirement. Rebuild under current compliance architecture. |

## Specs To Carry Forward

### Premium Board, Workflow, Permissions, Data Table

Future implementation should be split into separate PRs:

1. Board swimlanes: group board cards by assignee, type, priority, or parent while preserving the
   existing status columns.
2. Bulk edit preview: show per-item before/after changes before committing assignee, priority, or
   label bulk actions.
3. Workflow visualization: add a read-only status/transition map above existing workflow editors.
4. Field layout preview: show a live preview while editing per-type field visibility/order.
5. Permission matrix grouping: group permissions by domain without changing RBAC semantics.
6. Data table upgrades: opt-in multi-sort, column show/hide/reorder, density, and inline edit.

Acceptance gate: no backend behavior change unless explicitly scoped; no RBAC semantics change;
all changes tokenized, accessible, tested, and green in CI.

### HEART Metrics And Activity UX

Carry forward the intent to expose HEART metrics, activation funnel measures, and activity feed
widgets in role dashboards. Before rebuilding, reconcile with:

- `docs/HEART-METRICS.md`
- `docs/UIUX-BENCHMARK-ROADMAP.md`
- the changes merged through PR #388

### Know Studio P1/P2 Scope

The P1 branches include useful Know Studio scope, but are too broad to merge as branches. Treat
them as roadmap evidence, not implementation candidates. Rebuild one KR at a time from
`docs/plans/KNOW-ROADMAP.md`, using current migration numbering and current package names.

### Security And Tenant Isolation

The `feat/h1-id-scoping` branch reinforces an important requirement: every ID-based endpoint must
prove workspace ownership server-side. Preserve the objective, but rebuild it in focused security
PRs from current `main`. Each PR must include unauthorized and cross-tenant tests.

### Compliance Rules

Compliance rule CRUD and a workspace-scoped "test before activate" dry run remain valid product
requirements. Rebuild on the current compliance model rather than reviving the stale branch.

## Branch Hygiene Recommendation

After this closeout, branch deletion can be considered only for branches whose intent is captured
above or already merged into `main`. Deleting remote branches should be a separate explicit action.
Do not delete branches in the same step as closing an unsafe PR.
