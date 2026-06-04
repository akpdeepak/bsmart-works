# Refactor Plan — I01-S10 · Cap G · Notifications (in-app + email)

**Iteration:** 1 · **Mode:** AUTO. **Spec:** *"Per-user preferences by type. Smart batching to prevent inbox flood. Daily digest option."*
**Classification:** **Implemented → hardened.** Per-type preferences (`NotificationPrefController`), smart batching (`NotificationBatchService`), the daily digest (`DailyDigestScheduler`), in-app list + unread count, and email delivery all exist. List/count/mark-all correctly derive the user from the JWT (ignore the client `userId` param).

## Phase 1 — finding
- 🔴 **`markRead(id)` had no ownership check (IDOR):** it loaded any notification by id and flipped it read, so one user could mark another user's notifications read. It also used `.orElseThrow()` (generic 500) instead of the standard error shape.

## Phase 2 — scope (in)
1. `markRead` now requires the notification belongs to the caller — a foreign or unknown id returns **404** (never confirms another user's notification exists), and the standard `ApiException` error shape is used.

## Out of scope
- Per-type preference + batching + digest already satisfy the spec — verified, unchanged.

## Tests / validation
- New `NotificationControllerAccessTest` (3): another user's notification → 404 (not mutated), unknown → 404, own → marked read. **213 backend unit tests green.** No migration.

## Risk
- Very low: adds an ownership guard to one endpoint. Revert = revert branch.
