-- V69: Add product_id column to work_items, normalize legacy type names,
-- and seed all 16 work item types with realistic DISCOM/utility demo data.

-- 1. product_id column (INCIDENT and IT_SERVICE_REQUEST point to a PRODUCT work item) ────────
ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS product_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_work_items_product_id
  ON work_items (product_id) WHERE product_id IS NOT NULL;

-- 2. Normalize legacy title-cased type names to uppercase type keys ──────────────────────────
-- V68 handles Sub-task → ACTIVITY and Service Request → IT_SERVICE_REQUEST.
-- This migration normalises the remaining types from V8/V10/V15 seeds.
UPDATE work_items SET type = 'EPIC'        WHERE type = 'Epic';
UPDATE work_items SET type = 'STORY'       WHERE type IN ('Story', 'User Story');
UPDATE work_items SET type = 'BUG'         WHERE type = 'Bug';
UPDATE work_items SET type = 'TASK'        WHERE type = 'Task';
UPDATE work_items SET type = 'RISK'        WHERE type = 'Risk';
UPDATE work_items SET type = 'ISSUE'       WHERE type = 'Issue';
UPDATE work_items SET type = 'ASSUMPTION'  WHERE type = 'Assumption';
UPDATE work_items SET type = 'DEPENDENCY'  WHERE type = 'Dependency';
UPDATE work_items SET type = 'ACTIVITY'    WHERE type IN ('Activity', 'Sub-task', 'Subtask', 'SUBTASK');

-- 3. Seed counter baseline for types already in the DB (EPIC/STORY/etc.)
--    The existing rows don't have auto_id yet; set counters so new items start cleanly.
--    ON CONFLICT DO NOTHING so V68-created rows are not overwritten.
INSERT INTO work_item_counters (workspace_id, type_key, next_val)
VALUES
  ('WS-001', 'EPIC',  1),
  ('WS-001', 'STORY', 1),
  ('WS-001', 'BUG',   1),
  ('WS-001', 'TASK',  1),
  ('WS-001', 'RISK',  1)
ON CONFLICT (workspace_id, type_key) DO NOTHING;

-- 4. Seed CAPABILITY items ──────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, description, created_at, created_by)
VALUES
  ('WRK-CAP-001', 'CAP-0001',
   'Smart Grid Operations Platform',
   'CAPABILITY', 'In Progress', 'HIGH', 'PROJ-WORKS',
   'End-to-end platform capability for smart grid operations — feeder monitoring, outage detection,'
   || ' AT&C loss analysis, and SCADA integration across all DISCOM substations.',
   NOW(), 'USR-DEV1'),
  ('WRK-CAP-002', 'CAP-0002',
   'Customer Experience & Self-Service',
   'CAPABILITY', 'Todo', 'HIGH', 'PROJ-001',
   'Capability grouping for all customer-facing services: mobile app, web portal, complaint'
   || ' management, and digital billing workflows.',
   NOW(), 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed PRODUCT items ─────────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, parent_id, description, created_at, created_by)
VALUES
  ('WRK-PRD-001', 'PRD-0001',
   'bSmart SCADA Integration',
   'PRODUCT', 'In Progress', 'HIGH', 'PROJ-WORKS', 'WRK-CAP-001',
   'Integration layer between the bSmart Works platform and legacy SCADA systems. Provides'
   || ' real-time feeder telemetry, automated fault detection, and historical data sync.',
   NOW(), 'USR-DEV1'),
  ('WRK-PRD-002', 'PRD-0002',
   'bSmart Customer Mobile App',
   'PRODUCT', 'Todo', 'MEDIUM', 'PROJ-001', 'WRK-CAP-002',
   'Cross-platform mobile application for residential and commercial consumers. Enables bill'
   || ' payment, outage reporting, meter readings, and service requests via mobile.',
   NOW(), 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed INITIATIVE items ──────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, parent_id, description, created_at, created_by)
VALUES
  ('WRK-INI-001', 'INI-0001',
   'Feeder Loss Reduction Initiative — FY 2026',
   'INITIATIVE', 'In Progress', 'HIGH', 'PROJ-WORKS', 'WRK-CAP-001',
   'Cross-functional initiative to reduce AT&C losses across Tier-2 feeders by 8% before end of'
   || ' FY 2026. Involves meter data quality, topology mapping, and field survey integration.',
   NOW(), 'USR-DEV1'),
  ('WRK-INI-002', 'INI-0002',
   'Customer Onboarding Digitisation',
   'INITIATIVE', 'Todo', 'MEDIUM', 'PROJ-001', 'WRK-CAP-002',
   'Eliminate paper-based new-connection forms and migrate all customer onboarding to digital'
   || ' workflows with e-sign and automated provisioning.',
   NOW(), 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 7. Seed THEME items ───────────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, parent_id, description, created_at, created_by)
VALUES
  ('WRK-THM-001', 'THM-0001',
   'Meter Data Quality & Monitoring',
   'THEME', 'In Progress', 'HIGH', 'PROJ-WORKS', 'WRK-INI-001',
   'Epics and stories focused on detecting and resolving meter data quality issues — missed'
   || ' readings, implausible values, and communication failures — that cause inaccurate loss calculations.',
   NOW(), 'USR-DEV1'),
  ('WRK-THM-002', 'THM-0002',
   'Field Survey & Topology Mapping',
   'THEME', 'Todo', 'MEDIUM', 'PROJ-WORKS', 'WRK-INI-001',
   'Epics covering geo-coded field surveys, consumer-to-feeder mapping verification, and topology'
   || ' corrections needed for accurate loss attribution.',
   NOW(), 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 8. Seed RISK items ────────────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, description,
  probability, impact_level, risk_score, mitigation_plan, contingency_plan, created_at, created_by)
VALUES
  ('WRK-RSK-001', 'RSK-0001',
   'Legacy SCADA API deprecated without notice',
   'RISK', 'Todo', 'HIGH', 'PROJ-WORKS',
   'The legacy SCADA vendor may deprecate or change their integration API without adequate notice,'
   || ' breaking the bSmart SCADA Integration product.',
   'MEDIUM', 'HIGH', 6,
   'Maintain a compatibility abstraction layer. Subscribe to vendor release notes. Negotiate a'
   || ' minimum 90-day deprecation notice SLA in the contract.',
   'Pre-build an alternative read-path using CSV export from SCADA if the API is lost. Keep a'
   || ' 30-day historical snapshot cached in bSmart.',
   NOW(), 'USR-DEV1'),
  ('WRK-RSK-002', 'RSK-0002',
   'AT&C loss baseline data is inaccurate',
   'RISK', 'Todo', 'HIGH', 'PROJ-WORKS',
   'If the current AT&C loss baseline (used as FY 2026 reference) contains systematic meter errors,'
   || ' the 8% reduction target becomes unmeasurable.',
   'HIGH', 'HIGH', 9,
   'Conduct an independent meter accuracy audit on the top-30 feeders before the baseline is locked.'
   || ' Flag outlier feeders and exclude from the KPI until recalibrated.',
   'Accept a provisional baseline with ±2% uncertainty band; report progress as a range, not a point estimate.',
   NOW(), 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed ISSUE items ───────────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, description,
  impact_level, root_cause, created_at, created_by)
VALUES
  ('WRK-ISS-001', 'ISS-0001',
   'SCADA data sync lag exceeds 15 minutes during peak load',
   'ISSUE', 'In Progress', 'HIGH', 'PROJ-WORKS',
   'Real-time feeder telemetry is arriving 15–25 minutes late during morning and evening peak hours,'
   || ' causing the operations dashboard to show stale data during critical windows.',
   'HIGH',
   'The SCADA polling service uses a single-threaded queue. Peak-hour message volume saturates it,'
   || ' causing backpressure and cascading delays.',
   NOW(), 'USR-DEV1'),
  ('WRK-ISS-002', 'ISS-0002',
   'Consumer complaint portal timeout on high-volume days',
   'ISSUE', 'Todo', 'MEDIUM', 'PROJ-001',
   'The consumer complaint submission endpoint times out after 30 seconds on bill-release days'
   || ' (first week of each month) when concurrent load exceeds 2,000 requests/minute.',
   'MEDIUM',
   'No connection pool limit configured on the complaint service; all available DB connections are'
   || ' exhausted under peak load.',
   NOW(), 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 10. Seed ASSUMPTION items ─────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, description,
  basis_rationale, risk_if_wrong, validation_date, created_at, created_by)
VALUES
  ('WRK-ASM-001', 'ASM-0001',
   'Legacy meters can be polled every 15 minutes without network saturation',
   'ASSUMPTION', 'Todo', 'MEDIUM', 'PROJ-WORKS',
   'We assume the existing 2G/GPRS meter communication infrastructure can support 15-minute polling'
   || ' cycles without causing network congestion on the feeder communication nodes.',
   'Network utilisation study (FY 2024) showed 40% headroom at 30-minute intervals. We assume'
   || ' linear scaling holds at the 15-minute interval.',
   'If wrong, the feeder loss system will degrade the meter communication network, causing outage'
   || ' cascades and worsening data quality — the opposite of the initiative goal.',
   '2026-07-31',
   NOW(), 'USR-DEV1'),
  ('WRK-ASM-002', 'ASM-0002',
   'Field teams will complete topology surveys within the 90-day window',
   'ASSUMPTION', 'Todo', 'MEDIUM', 'PROJ-WORKS',
   'Field survey teams (20 personnel) are assumed to complete consumer-to-feeder topology'
   || ' verification for all 340 Tier-2 feeders within the 90-day survey sprint.',
   'Based on FY 2024 pilot covering 85 feeders with 8 personnel in 45 days. Scaled linearly'
   || ' to the full feeder count with proportional headcount.',
   'If wrong, the topology layer is incomplete, attribution of losses to feeders becomes'
   || ' unreliable, and the 8% reduction target cannot be verified.',
   '2026-08-15',
   NOW(), 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 11. Seed DEPENDENCY items ─────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, description,
  dependency_type, impact_if_delayed, expected_resolution_date, created_at, created_by)
VALUES
  ('WRK-DEP-001', 'DEP-0001',
   'Legacy SCADA historical data export before cutover',
   'DEPENDENCY', 'Todo', 'HIGH', 'PROJ-WORKS',
   'The bSmart SCADA Integration requires a complete historical data export (3 years) from the'
   || ' legacy SCADA system before the cutover date. Must be delivered by the SCADA vendor''s professional services team.',
   'EXTERNAL',
   'Without historical data, the FY 2026 AT&C loss baseline cannot be calculated, invalidating'
   || ' all progress metrics for the Feeder Loss Reduction Initiative.',
   '2026-07-15',
   NOW(), 'USR-DEV1'),
  ('WRK-DEP-002', 'DEP-0002',
   'Finance team sign-off on digital onboarding SLA thresholds',
   'DEPENDENCY', 'Todo', 'MEDIUM', 'PROJ-001',
   'The Customer Onboarding Digitisation initiative requires Finance to formally approve the'
   || ' SLA commitment (< 2 working days for new connection activation) before engineering can'
   || ' configure the automated SLA breach alerts.',
   'INTERNAL',
   'Without Finance sign-off, the SLA engine cannot be configured, and the KPI dashboard for'
   || ' onboarding speed will show uncalibrated data.',
   '2026-06-30',
   NOW(), 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 12. Seed INCIDENT items ───────────────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, product_id,
  description, severity, business_impact, response_speed, item_category, affected_system,
  created_at, created_by)
VALUES
  ('WRK-INC-001', 'INC-0001',
   'Customer portal login failure — all users locked out',
   'INCIDENT', 'In Progress', 'HIGH', 'PROJ-001', 'WRK-PRD-002',
   'All consumers attempting to log in to the bSmart customer mobile app and web portal are'
   || ' receiving "Authentication failed" errors. ~12,000 active sessions have been invalidated.',
   'CRITICAL',
   'ORGANIZATION_WIDE',
   'IMMEDIATE',
   'Authentication failure',
   'Auth Service / JWT token store',
   NOW(), 'USR-DEV1'),
  ('WRK-INC-002', 'INC-0002',
   'SCADA feeder telemetry feed silent for 45 minutes',
   'INCIDENT', 'Done', 'HIGH', 'PROJ-WORKS', 'WRK-PRD-001',
   'The live feeder telemetry ingestion pipeline stopped receiving data from 47 distribution'
   || ' feeders for 45 minutes. Operations centre alerted via monitoring at 09:15. Data backfill completed.',
   'HIGH',
   'DEPARTMENT',
   'HIGH',
   'Telemetry gap',
   'SCADA polling service / Kafka ingest',
   NOW() - INTERVAL '2 days', 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 13. Seed HR_SERVICE_REQUEST items ────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, description,
  item_category, department, approver_id, business_justification, needed_by_date, created_at, created_by)
VALUES
  ('WRK-HR-001', 'HR-0001',
   'New hire onboarding — Priya Sharma (Data Analyst)',
   'HR_SERVICE_REQUEST', 'Todo', 'MEDIUM', 'PROJ-001',
   'Set up workstation, corporate email, access to bSmart reporting dashboards, and complete'
   || ' mandatory compliance training for new Data Analyst joining the Smart Grid Analytics team on 2026-07-01.',
   'New Employee Onboarding',
   'Smart Grid Analytics',
   'USR-DEV1',
   'Headcount approved in Q1 planning. Position critical for the Feeder Loss Reduction Initiative data quality workstream.',
   '2026-06-27',
   NOW(), 'USR-DEV1'),
  ('WRK-HR-002', 'HR-0002',
   'Training request — Advanced Distribution System Loss Analysis certification',
   'HR_SERVICE_REQUEST', 'In Progress', 'LOW', 'PROJ-001',
   'Request for 3 engineers from the field operations team to attend the "Advanced Distribution'
   || ' System Loss Analysis" certification course (3 days, external provider).',
   'Training & Development',
   'Field Operations',
   'USR-DEV1',
   'Upskilling directly supports the AT&C loss reduction programme. Course cost within the'
   || ' approved team development budget for FY 2026.',
   '2026-07-15',
   NOW() - INTERVAL '1 day', 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 14. Seed IT_SERVICE_REQUEST items ────────────────────────────────────────────────────────
INSERT INTO work_items (id, auto_id, title, type, status, priority, project_id, product_id,
  description, item_category, affected_system, approver_id, business_justification,
  needed_by_date, created_at, created_by)
VALUES
  ('WRK-IT-001', 'IT-0001',
   'Access request — SCADA reporting module (read-only)',
   'IT_SERVICE_REQUEST', 'Todo', 'MEDIUM', 'PROJ-WORKS', 'WRK-PRD-001',
   'Request read-only access to the SCADA Integration reporting module for Rajesh Verma'
   || ' (Distribution Planning). Required for feeder loss analysis on the FY 2026 initiative.',
   'Access & Permissions',
   'bSmart SCADA Integration portal',
   'USR-DEV1',
   'User is the lead analyst for the Feeder Loss Reduction Initiative. Read access required to'
   || ' pull feeder-level historical data for baseline calculation.',
   '2026-06-20',
   NOW(), 'USR-DEV1'),
  ('WRK-IT-002', 'IT-0002',
   'Provision dev environment for SCADA API integration testing',
   'IT_SERVICE_REQUEST', 'In Progress', 'HIGH', 'PROJ-WORKS', 'WRK-PRD-001',
   'Provision a dedicated development/staging environment with sandbox SCADA API credentials'
   || ' for the integration engineering team. Includes DB, API gateway config, and VPN access.',
   'Environment Provisioning',
   'SCADA Integration API sandbox',
   'USR-DEV1',
   'Required to unblock the bSmart SCADA Integration product milestone. No dev environment means'
   || ' no test coverage for the polling service rewrite.',
   '2026-06-15',
   NOW() - INTERVAL '3 days', 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- 15. Seed work_item_counters for new types ────────────────────────────────────────────────
--     next_val is set to one above the highest seeded auto-id per type.
INSERT INTO work_item_counters (workspace_id, type_key, next_val)
VALUES
  ('WS-001', 'CAPABILITY',          3),
  ('WS-001', 'PRODUCT',             3),
  ('WS-001', 'INITIATIVE',          3),
  ('WS-001', 'THEME',               3),
  ('WS-001', 'RISK',                3),
  ('WS-001', 'ISSUE',               3),
  ('WS-001', 'ASSUMPTION',          3),
  ('WS-001', 'DEPENDENCY',          3),
  ('WS-001', 'INCIDENT',            3),
  ('WS-001', 'HR_SERVICE_REQUEST',  3),
  ('WS-001', 'IT_SERVICE_REQUEST',  3)
ON CONFLICT (workspace_id, type_key) DO UPDATE SET next_val = GREATEST(work_item_counters.next_val, EXCLUDED.next_val);
