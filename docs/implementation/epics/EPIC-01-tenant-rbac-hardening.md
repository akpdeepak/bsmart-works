# EPIC 01 - Multi-Tenant Security and RBAC Hardening

## Blueprint references

- Implementation blueprint: EPIC 1 - Multi-Tenant Security and RBAC Hardening
- UI/UX expanded blueprint: EPIC 1 tenant/RBAC scope and acceptance criteria
- Final execution decision: Phase 1 hardening before breadth expansion
- V1.6 overlay: user types and permission policy prerequisites; no new navigation or broad admin
  builder scope in this EPIC

## Objective

Close concrete tenant/RBAC gaps before continuing to production configuration and broader product
work.

## Scope in this PR

- Fix starred/watched work-item tenant leaks for star, unstar, watch, unwatch, and listing.
- Require RBAC permission for SCIM token issuance.
- Remove arbitrary developer dashboard `userId` access and use the authenticated caller.
- Require explicit workspace authorization for dashboard role views.
- Scope dashboard aggregate queries to the requested workspace or authenticated caller membership.
- Fix field layout project/workspace resolution and remove `WS-001` fallback behavior.
- Make RBAC role endpoints workspace-explicit instead of operating on a hard-coded workspace.
- Remove BQL's fallback to `WS-001`; default BQL workspace now comes from caller membership.

## Backend requirements

- Star/unstar operations must resolve the target work item's workspace before mutating
  `starred_items`.
- A caller outside the target work item's workspace must receive not-found semantics and no database
  mutation.
- The starred-items list must be scoped to work items in workspaces where the caller is a member.
- Watch/unwatch/list-watcher operations must resolve the target workspace and deny cross-tenant ids
  with no mutation.
- SCIM token issuance must require a JWT-authenticated caller with either `manage_security` or
  `manage_integrations` in the target workspace.
- Dashboard role endpoints must require explicit workspace access and avoid tenant-default fallbacks.
- Dashboard SQL must include workspace predicates for releases, backlog, portfolio, RAID, events,
  audit logs, worklogs, and activity aggregates.
- Field layout reads/writes must resolve project workspace through `RbacService.workspaceForProject`.
- Field layout writes must require `manage_projects`.
- RBAC role lookup and role mutation must carry an explicit workspace id.
- BQL must not fall back to `WS-001` when no workspace is provided.

## Frontend requirements

- Preserve the modes Home, Deliver, Insight, Service, Know, Extend.
- Developer dashboard calls must not send a caller-chosen user id.
- RBAC calls must pass the active workspace id.

## Data/migration requirements

- No schema changes.

## Security notes

- Starred work items are user-specific metadata, but the target item is tenant-owned. Star/unstar is
  therefore treated as a view-gated item mutation.
- Dashboard aggregate data is sensitive even when read-only; controller checks and SQL predicates
  both enforce tenant scope.
- SCIM bearer tokens can provision/deprovision users, so issuing them is a security/integration admin
  action, not merely an authenticated action.
- Field layouts shape tenant-specific work behavior and are protected as project/workspace
  configuration.

## Test plan

- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=WorkItemControllerAccessTest,WorkItemTenantScopeTest,ScimControllerAccessTest,DashboardControllerAccessTest,FieldLayoutControllerAccessTest,RbacControllerAccessTest" test`
- `npm run guardrails`
- Broader `cd works-backend && .\mvnw.cmd -Dgroups=unit verify` before merge if practical.

## Acceptance criteria checklist

- [x] Star/unstar requires workspace view access for the target work item.
- [x] Starred list query is tenant-scoped.
- [x] Cross-tenant star/unstar tests prove no mutation occurs.
- [x] Cross-tenant watch/unwatch tests prove no mutation occurs.
- [x] SCIM token issuance requires `manage_security` or `manage_integrations`.
- [x] SCIM permission tests cover unauthenticated, forbidden, and allowed paths.
- [x] Developer dashboard uses authenticated user identity only.
- [x] Dashboard role views require explicit workspace permission.
- [x] Dashboard aggregate queries include workspace scope.
- [x] Field layout project ids resolve to workspaces before reads/writes.
- [x] Field layout writes require `manage_projects`.
- [x] RBAC role endpoints are workspace-explicit.
- [x] BQL workspace fallback is membership-based, not hard-coded.

## Out of scope

- User-type/permission-policy UX.
- V1.6 Admin/Owner operating-model builders.
- Full BQL visual-builder work and advanced query-board capabilities.
- SLA feature expansion beyond existing tenant-scoped surfaces.

## Implementation task list

- [x] Create EPIC 1 plan.
- [x] Harden starred work-item mutations.
- [x] Scope starred work-item listing.
- [x] Move star/watch engagement orchestration behind a workspace-gated service boundary.
- [x] Harden SCIM token issuance.
- [x] Harden dashboard controller and SQL scoping.
- [x] Harden field-layout project/workspace resolution.
- [x] Remove RBAC/BQL hard-coded workspace fallback paths.
- [x] Add targeted regression tests.

---

# EPIC 01 Completion Note - Multi-Tenant Security and RBAC Hardening

## Completed scope

- Hardened starred work-item star/unstar/list tenant scope.
- Added SCIM token issuance authorization.
- Removed caller-controlled developer dashboard user selection.
- Added dashboard workspace permission checks and workspace-scoped aggregate SQL.
- Fixed field layout project/workspace resolution and removed hard-coded workspace fallback.
- Made RBAC role APIs workspace-explicit.
- Removed BQL hard-coded workspace fallback.
- Added focused tenant/RBAC regression tests.

## Validation

- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=WorkItemControllerAccessTest,WorkItemTenantScopeTest,ScimControllerAccessTest,DashboardControllerAccessTest,FieldLayoutControllerAccessTest,RbacControllerAccessTest" test`
- `cd works-backend && .\mvnw.cmd -Dgroups=unit verify`
- `npm run guardrails`

Backend verification passed 1,335 unit tests with 0 Checkstyle violations. Guardrails passed all
blocking rules; the existing non-blocking baseline warnings remain for frontend raw hex and one
documented arbitrary width comment.

## Codebase re-verification - 2026-07-19

The full production tree, rather than this note, was re-audited. The executable
`scripts/epics-01-05-completion.mjs` gate proves that production Java/JS/JSX contains no `WS-001`
fallback, star and watcher mutations resolve workspace ownership before writing, cross-tenant tests
deny without mutation, and query-parameter JWT handling remains restricted to the exact realtime SSE
path. The current full backend suite passes 1,454 tests with JaCoCo and Checkstyle.
