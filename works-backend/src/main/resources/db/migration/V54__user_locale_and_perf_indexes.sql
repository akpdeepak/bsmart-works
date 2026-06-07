-- Iteration 20 cross-cutting:
--   Cap A (localization) — a per-user preferred UI language (BCP-47), so the frontend i18n layer can
--     load the right bundle on login. Defaults to English; one of the 10 shipped locales.
--   Cap S (performance hardening, final) — composite indexes matching the product's hottest
--     multi-column query patterns (board/project filters, "my work", workspace audit timelines).
--     The single-column FK indexes already exist (V40+); these add the composite shapes the
--     planner needs to hit the NFR budgets (RB-40 §5) without sorting/extra filtering at scale.
-- Forward-only (RB-10 §3); IF NOT EXISTS keeps the migration idempotent across environments.

ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10) NOT NULL DEFAULT 'en';

-- Board and project views filter work items by project + status together.
CREATE INDEX IF NOT EXISTS idx_work_items_project_status ON work_items (project_id, status);

-- "My work" and assignee boards filter by assignee + status.
CREATE INDEX IF NOT EXISTS idx_work_items_assignee_status ON work_items (assignee_id, status);

-- Workspace audit timelines page events newest-first within a tenant (RB-40 §1 + §5).
CREATE INDEX IF NOT EXISTS idx_events_ws_occurred ON events (workspace_id, occurred_at DESC);
