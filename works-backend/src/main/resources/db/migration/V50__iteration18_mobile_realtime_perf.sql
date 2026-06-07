-- Iteration 18 — Mobile + Real-time + Performance (Cap S). Forward-only (RB-10 §3).
--
-- This iteration is delivered to this React + Spring web monorepo as the mobile-optimized PWA path
-- the spec offers ("works without app install"); native iOS/Android (Swift/Kotlin) are separate
-- repos out of scope here. The server-side state this iteration needs:
--   1. Richer notification preferences — per-event-type toggles, quiet hours, snooze, and the
--      P0-overrides-quiet rule (spec: "Per-user, per-event-type with quiet hours and snooze.
--      P0 overrides quiet hours.").
--   2. Web-push subscriptions — one row per user device/browser push endpoint.
--   3. Per-user customizable keyboard shortcuts (spec: "Customizable per user.").
-- Real-time (SSE), presence, performance monitoring and the status page are in-memory and need no
-- schema. Offline-draft sync reconciles against the existing work_items.version column.

-- 1. Extend the per-user notification preferences (table created in V6).
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS notify_status_change BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS notify_sla_breach    BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS notify_automation    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_enabled         BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_enabled  BOOLEAN NOT NULL DEFAULT FALSE;
-- Quiet-hours window as local hours-of-day [start, end); a wrap-around (e.g. 22 → 7) is allowed.
-- INTEGER (not SMALLINT) to match the entity's int fields under Hibernate ddl-auto=validate.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start    INTEGER NOT NULL DEFAULT 22;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end      INTEGER NOT NULL DEFAULT 7;
-- "Snooze all non-critical pushes until" — NULL = not snoozed.
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS snooze_until         TIMESTAMPTZ;
-- P0/critical pushes pierce quiet hours and snooze when this is on (the on-call safety valve).
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS p0_override_quiet    BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Web-push subscriptions — one row per user push endpoint (browser/device). The endpoint is the
-- natural key (a browser re-subscribes to the same endpoint), so upserts are keyed on it.
CREATE TABLE push_subscriptions (
    id          VARCHAR(50)  PRIMARY KEY,
    user_id     VARCHAR(50)  NOT NULL,
    endpoint    TEXT         NOT NULL UNIQUE,
    p256dh      TEXT,
    auth        TEXT,
    user_agent  VARCHAR(400),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- 3. Per-user keyboard-shortcut overrides. A row exists only when the user has customized an
-- action away from its default binding; the default set lives in the frontend. (user_id, action_id)
-- is the natural key.
CREATE TABLE user_shortcuts (
    user_id    VARCHAR(50)  NOT NULL,
    action_id  VARCHAR(100) NOT NULL,
    keys       VARCHAR(100) NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, action_id)
);
