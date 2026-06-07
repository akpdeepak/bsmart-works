# Performance — bSmart Works

> Iteration 20, Cap S (performance hardening, final). Governed by **RB-40 §5 (non-functional
> budgets)** and **RB-10 §3 (data & persistence)**. "Performance is a contract, not a vibe."

## Non-functional budgets (the contract)

Every hot-path operation is tested against these targets (milliseconds). These are the RB-40 §5
budgets and are the pass/fail bar for load testing.

| Operation | P50 | P95 | P99 |
|-----------|----:|----:|----:|
| Page load | 300 | 800 | 2000 |
| Work-item create | 100 | 300 | 1000 |
| Search / query | 150 | 500 | 1500 |
| Board drag-drop | 50 | 150 | 500 |
| Dashboard render | 500 | 1500 | 3000 |
| AI (cached) | 100 | 300 | 1000 |
| AI (uncached) | 2000 | 5000 | 10000 |
| File upload | 1500 | 3000 | 8000 |

## What iteration 20 hardened

**Query/index optimization (`V56__user_locale_and_perf_indexes.sql`).** The single-column foreign-key
indexes already exist (V40+); iteration 20 adds the **composite** index shapes that match the
product's hottest multi-column query patterns, so the planner stops sorting/extra-filtering at scale:

- `work_items(project_id, status)` — board and project filters.
- `work_items(assignee_id, status)` — "My Work" and assignee boards.
- `events(workspace_id, occurred_at DESC)` — workspace-scoped audit timelines, paged newest-first.

Indexes are added in the **same migration** as the queries that need them (RB-10 §3), are
forward-only, and use `IF NOT EXISTS` for idempotency.

**AI cost/perf discipline (already enforced, RB-40 §2).** Response caching serves repeat prompts
without re-spending or re-latency; model tiering keeps classification/intent on the fast tier; the
per-workspace budget degrades to the cheap tier at 80% and disables (serving deterministic
fallbacks) at 100% — so AI latency and spend are bounded.

## Load testing at 10× scale (Cap S)

The load-test plan exercises the budgets above at ten times the expected concurrent load for the
target deployment (the internal BCITS scale of ~200 users → tested at ~2,000):

1. **Seed** a representative workspace (projects, sprints, thousands of work items, events).
2. **Drive** the hot paths — list/board/search/create, dashboard render, AI cached + uncached —
   with a ramping concurrent-user profile.
3. **Assert** P50/P95/P99 against the table above; fail the run on any P95 regression.
4. **Profile** the slowest queries (`EXPLAIN ANALYZE`) and add the matching index in a new forward
   migration; never hand-tune the schema (Flyway-only).

Connection pooling is HikariCP, sized deliberately for the deployment rather than defaulted under
load (RB-10 §3). N+1s are prevented with fetch joins / entity graphs on known traversals.

## Target infrastructure (RB-40 §5)

The performance targets are validated against the target topology: AWS — ECS/EKS, RDS (Multi-AZ),
ElastiCache (Redis) for the cache + AI response cache, S3 + CloudFront, with OpenTelemetry →
CloudWatch / Grafana / Prometheus for the P50/P95/P99 dashboards. The current local stack is Docker
Compose; the gap to AWS is a deliberate, planned step.
