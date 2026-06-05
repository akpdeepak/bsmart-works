# Refactor Plan — I01-S09 · Cap G · Comments with @mentions

**Iteration:** 1 · **Mode:** AUTO. **Spec:** *"Threaded comments on work items, @mention notifications, internal-only flag toggle."*
**Classification:** **Partial** — threading, @mention notifications+email, and the internal flag all existed, but the endpoints had **no tenant/authorization checks**.

## Phase 1 — findings (🔴 RB-40 §1)
- `getComments` / `addComment` / `deleteComment` never verified the caller could access the work item's workspace — any authenticated user could read, post, or delete comments on **any** work item by id.
- `deleteComment` let **anyone delete any comment** by id (no author/permission check).
- `@mention` matched across **all users in all tenants**, so a mention could notify (and surface the item link to) someone outside the workspace.

## Phase 2 — scope (in)
1. **Membership-gated access** (`requireItemAccess`): resolve the item's workspace and require membership (404 otherwise) on read/add/delete.
2. **Permission on post:** `addComment` requires the `comment` permission; record `COMMENT_ADDED` workspace-scoped (`recordInWorkspace`, I01-S04).
3. **Delete authorization:** only the comment's author, or a role with `edit_any_item`, may delete.
4. **Mentions confined to the workspace:** only fellow members can be mentioned/notified (no cross-tenant notification leakage).

## Out of scope (parked)
- Hiding `internal`-flagged comments from external/customer viewers → **Iteration 9** (customer portal); no external users exist in Iteration 1.

## Tests / validation
- New `CommentControllerAccessTest` (5): non-member/unknown → 404, post without `comment` perm → 403, delete by non-author w/o role → 403, delete by author → ok. **210 backend unit tests green.** No migration.

## Risk
- Low/medium: adds authorization to previously-open endpoints. Members with the `comment` permission are unaffected. Revert = revert branch.
