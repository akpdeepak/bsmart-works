# EPIC 01 Security Notes

## Starred Work Items

Before EPIC 1, star/unstar accepted any work item id from an authenticated user and wrote directly
to `starred_items`. The starred list also joined the user's stars to `work_items` without
constraining the item to a workspace the user could access.

The hardened behavior is:

- Resolve the work item's workspace with `RbacService.workspaceForWorkItem`.
- Require caller membership/view tier before star or unstar.
- Return not-found semantics for missing or cross-tenant item ids.
- Add the existing `MEMBER_PROJECTS` tenant predicate to the starred list query.

## SCIM Token Issuance

SCIM tokens are bearer credentials that can provision, update, and deprovision users in a workspace.
Issuance now requires a JWT-authenticated caller with either:

- `manage_security`, or
- `manage_integrations`.

Denied issuance exits before token persistence and before event recording.

## Dashboards

The developer dashboard now uses `AuthenticatedUser.id()` instead of accepting an arbitrary `userId`
query parameter. Role dashboards now require an explicit `workspaceId` and prove caller permission
before invoking the service.

Dashboard service queries are bounded to workspace/caller scope for worklogs, active sprints,
velocity, scope changes, high-risk items, risk summaries, releases, backlog distributions, portfolio
health, RAID summaries, audit logs, events, MFA adoption, and overdue actions.

## Field Layouts

Field layout reads/writes no longer treat `projectId` as a workspace id and no longer fall back to
`WS-001`. Project-scoped requests resolve the project workspace through `RbacService`, reads require
`view_items`, and writes require `manage_projects`.

## RBAC and BQL Workspace Scope

RBAC role lookup and role mutation now require a workspace id from the client. BQL no longer defaults
to `WS-001`; when no workspace is provided, it picks one of the caller's memberships and rejects users
with no workspace membership.
