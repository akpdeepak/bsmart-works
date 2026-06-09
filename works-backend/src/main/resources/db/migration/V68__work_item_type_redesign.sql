-- V68: Work-item type redesign — 17-type taxonomy (Delivery / RAID / Service).
-- Adds auto-IDs, type-specific columns, hierarchy metadata, and counter table.
-- Migrates Sub-task → Activity; Service Request → IT_SERVICE_REQUEST.

-- 1. Extend work_item_type_config with category and auto-ID prefix ─────────────
ALTER TABLE work_item_type_config
  ADD COLUMN IF NOT EXISTS type_category      VARCHAR(20)  NOT NULL DEFAULT 'DELIVERY',
  ADD COLUMN IF NOT EXISTS auto_id_prefix     VARCHAR(10),
  ADD COLUMN IF NOT EXISTS valid_parent_types JSONB        NOT NULL DEFAULT '[]'::jsonb;

-- 2. Auto-ID counter (one row per workspace × type key) ───────────────────────
CREATE TABLE IF NOT EXISTS work_item_counters (
  workspace_id  VARCHAR(255) NOT NULL,
  type_key      VARCHAR(50)  NOT NULL,
  next_val      BIGINT       NOT NULL DEFAULT 1,
  PRIMARY KEY (workspace_id, type_key)
);

-- 3. Type-specific columns on work_items ──────────────────────────────────────
ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS auto_id                  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reporter_id              VARCHAR(255),
  ADD COLUMN IF NOT EXISTS severity                 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS environment_detail       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS business_impact          VARCHAR(30),
  ADD COLUMN IF NOT EXISTS response_speed           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS responding_team          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS resolution_type          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS root_cause               TEXT,
  ADD COLUMN IF NOT EXISTS probability              VARCHAR(10),
  ADD COLUMN IF NOT EXISTS impact_level             VARCHAR(10),
  ADD COLUMN IF NOT EXISTS risk_score               SMALLINT,
  ADD COLUMN IF NOT EXISTS dependency_type          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS source_item_id           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS target_item_id           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approver_id              VARCHAR(255),
  ADD COLUMN IF NOT EXISTS requested_for_id         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS needed_by_date           DATE,
  ADD COLUMN IF NOT EXISTS item_category            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sub_area                 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS regression_risk          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS steps_to_reproduce       TEXT,
  ADD COLUMN IF NOT EXISTS expected_behavior        TEXT,
  ADD COLUMN IF NOT EXISTS actual_behavior          TEXT,
  ADD COLUMN IF NOT EXISTS affected_version         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fixed_in_version         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fix_description          TEXT,
  ADD COLUMN IF NOT EXISTS mitigation_plan          TEXT,
  ADD COLUMN IF NOT EXISTS contingency_plan         TEXT,
  ADD COLUMN IF NOT EXISTS validation_date          DATE,
  ADD COLUMN IF NOT EXISTS basis_rationale          TEXT,
  ADD COLUMN IF NOT EXISTS risk_if_wrong            TEXT,
  ADD COLUMN IF NOT EXISTS impact_if_delayed        TEXT,
  ADD COLUMN IF NOT EXISTS expected_resolution_date DATE,
  ADD COLUMN IF NOT EXISTS business_justification   TEXT,
  ADD COLUMN IF NOT EXISTS sla_target               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breach_flag          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stakeholder_update       TEXT,
  ADD COLUMN IF NOT EXISTS resolution_summary       TEXT,
  ADD COLUMN IF NOT EXISTS closure_notes            TEXT,
  ADD COLUMN IF NOT EXISTS affected_system          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS business_service         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS start_date               DATE;

-- 4. Indexes ──────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_items_auto_id
  ON work_items (auto_id) WHERE auto_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_reporter
  ON work_items (reporter_id) WHERE reporter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_source_item
  ON work_items (source_item_id) WHERE source_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_target_item
  ON work_items (target_item_id) WHERE target_item_id IS NOT NULL;

-- 5. Data migrations ──────────────────────────────────────────────────────────
-- Sub-task → Activity
UPDATE work_items
  SET type = 'ACTIVITY'
  WHERE type IN ('SUBTASK', 'Sub-task') AND deleted_at IS NULL;

UPDATE work_item_type_config
  SET type_key = 'ACTIVITY', label = 'Activity', type_category = 'DELIVERY', auto_id_prefix = 'ACT'
  WHERE type_key IN ('SUBTASK', 'Sub-task');

-- Service Request → IT_SERVICE_REQUEST (safest default; review manually if HR SRs existed)
UPDATE work_items
  SET type = 'IT_SERVICE_REQUEST'
  WHERE type IN ('SERVICE_REQUEST', 'Service Request') AND deleted_at IS NULL;

UPDATE work_item_type_config
  SET type_key      = 'IT_SERVICE_REQUEST',
      label         = 'IT Service Request',
      type_category = 'SERVICE',
      auto_id_prefix = 'IT'
  WHERE type_key IN ('SERVICE_REQUEST', 'Service Request');
