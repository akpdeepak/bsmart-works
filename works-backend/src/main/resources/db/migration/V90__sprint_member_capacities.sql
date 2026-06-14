-- V90: per-member sprint capacity (Capacity tab, Sprint Cockpit — Cap V). One mutable config row
-- per (sprint, member) holding only the editable inputs: a working-days override, days off, and a
-- focus factor. The story-points budget is NOT stored — it is computed at read time from the
-- sprint's working days and the team's rolling velocity so it always reflects current
-- velocity/headcount (store config, derive figures).
--
-- Tenant safety: workspace_id is denormalized for RB-40 §1 scoping; rows are written only after a
-- manage_sprints RBAC check on that workspace (SprintCapacityService). The FK to sprints cascades a
-- hard sprint delete so no orphan capacity rows survive. IDs are varchar across this schema
-- (sprints.id, users.id are varchar). Mutable config — plain upsert, not append-only.
CREATE TABLE sprint_member_capacities (
    id               VARCHAR(64)  PRIMARY KEY,
    workspace_id     VARCHAR(64)  NOT NULL,
    sprint_id        VARCHAR(64)  NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    user_id          VARCHAR(64)  NOT NULL,
    working_days     INTEGER,                          -- nullable override of the computed sprint working days
    time_off_days    INTEGER      NOT NULL DEFAULT 0,
    focus_factor_pct INTEGER      NOT NULL DEFAULT 80, -- 0..100, validated in the service
    created_by       VARCHAR(64),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sprint_member_capacities UNIQUE (sprint_id, user_id)
);

-- The board read loads every row for a sprint; the reverse ("my capacity across sprints") is rare,
-- so an index on sprint_id is enough. workspace_id index supports tenant-scoped sweeps.
CREATE INDEX idx_sprint_member_capacities_sprint ON sprint_member_capacities(sprint_id);
CREATE INDEX idx_sprint_member_capacities_ws ON sprint_member_capacities(workspace_id);
