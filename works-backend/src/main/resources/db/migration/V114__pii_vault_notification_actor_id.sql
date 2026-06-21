-- V114: PII vault Slice 4c — notification actor reference (RB-40 §3 rule 1, EPIC-P1-pii-vault §5.2 #7).
--
-- The watcher ("updated"/"commented") and @mention notification messages embedded the actor's full
-- NAME in the stored notifications.message free-text. Add an opaque actor_id (a surrogate user id, not
-- PII); going forward those messages are stored name-free and the actor's display name is resolved at
-- render via the PII vault (NotificationController + UserPiiService), so it follows the vault on flip
-- and renders "[erased]" after a crypto-shred. Existing rows keep their (name-bearing) message and a
-- null actor_id, so they render unchanged. Additive / forward-only.
--
-- To change anything here, write a new forward migration (V115+). Never edit a shipped migration.

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS actor_id VARCHAR(100);
