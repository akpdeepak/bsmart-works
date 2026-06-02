-- ============================================================
-- V10: Complete Dogfood Backlog — bSmart Works tracks itself
-- Principle: Eat Our Own Dogfood — all 20 iterations, 26 capabilities,
--            346+ sub-features seeded as real work items in Works.
--
-- Covers: Iteration Guide (doc 06), Capability Map v3.5 (doc 05),
--         Tech Stack & Architecture (doc 07)
-- Branch: seed/dogfood-v35-complete-backlog
-- ============================================================

-- ============================================================
-- FUTURE SPRINTS (Iterations 3–20)
-- ============================================================
INSERT INTO sprints (id, project_id, name, goal, status, start_date, end_date, capacity, created_at) VALUES
    ('SPR-ITER3',  'PROJ-WORKS', 'Iteration 3 — Workflows, Permissions & Custom Fields',
     'Works becomes configurable — any BCITS team can tailor workflows, roles, fields',
     'PLANNED', CURRENT_DATE + INTERVAL '15 days',  CURRENT_DATE + INTERVAL '57 days',  120, NOW()),
    ('SPR-ITER4',  'PROJ-WORKS', 'Iteration 4 — PM Artifacts (RAID, Decisions, Meetings)',
     'BCITS PMs have their full toolkit: RAID logs, decisions, meetings, action items',
     'PLANNED', CURRENT_DATE + INTERVAL '58 days',  CURRENT_DATE + INTERVAL '100 days', 100, NOW()),
    ('SPR-ITER5',  'PROJ-WORKS', 'Iteration 5 — Knowledge Repository + Versions',
     'BCITS has a workspace knowledge base: runbooks, ADRs, KB — searchable, versioned',
     'PLANNED', CURRENT_DATE + INTERVAL '101 days', CURRENT_DATE + INTERVAL '143 days', 100, NOW()),
    ('SPR-ITER6',  'PROJ-WORKS', 'Iteration 6 — Reports, Dashboards & Insights',
     'BCITS has visibility into delivery at every layer — the Phase 1 internal validation gate',
     'PLANNED', CURRENT_DATE + INTERVAL '144 days', CURRENT_DATE + INTERVAL '193 days', 100, NOW()),
    ('SPR-ITER7',  'PROJ-WORKS', 'Iteration 7 — Compliance Rules Engine',
     'Strategic differentiator activated — Works becomes meaningfully different from Jira/ADO',
     'PLANNED', CURRENT_DATE + INTERVAL '194 days', CURRENT_DATE + INTERVAL '249 days', 120, NOW()),
    ('SPR-ITER8',  'PROJ-WORKS', 'Iteration 8 — SLA Engine (Internal & Generalized)',
     'BCITS engineering teams have explicit SLA commitments tracked in-tool',
     'PLANNED', CURRENT_DATE + INTERVAL '250 days', CURRENT_DATE + INTERVAL '299 days', 100, NOW()),
    ('SPR-ITER9',  'PROJ-WORKS', 'Iteration 9 — Service Management & Customer Portal',
     'Works is sellable to first paying utility customers — the commercial gate',
     'PLANNED', CURRENT_DATE + INTERVAL '300 days', CURRENT_DATE + INTERVAL '369 days', 120, NOW()),
    ('SPR-ITER10', 'PROJ-WORKS', 'Iteration 10 — AI Orchestration Foundation + AI Control Plane',
     'AI arrives as opt-in — every AI feature has a documented deterministic fallback',
     'PLANNED', CURRENT_DATE + INTERVAL '370 days', CURRENT_DATE + INTERVAL '426 days', 120, NOW()),
    ('SPR-ITER11', 'PROJ-WORKS', 'Iteration 11 — AI Expansion + Conversational Command Bar',
     'Works is fully AI-native — opt-in users get meaningfully greater productivity',
     'PLANNED', CURRENT_DATE + INTERVAL '427 days', CURRENT_DATE + INTERVAL '497 days', 120, NOW()),
    ('SPR-ITER12', 'PROJ-WORKS', 'Iteration 12 — KPI Framework with Privacy Guardrails',
     'Team health visible without individual surveillance — privacy enforced at API level',
     'PLANNED', CURRENT_DATE + INTERVAL '498 days', CURRENT_DATE + INTERVAL '547 days', 100, NOW()),
    ('SPR-ITER13', 'PROJ-WORKS', 'Iteration 13 — Automation Engine + Integrations',
     'Works integrates with existing BCITS tooling — Slack, GitHub, GitLab, calendar',
     'PLANNED', CURRENT_DATE + INTERVAL '548 days', CURRENT_DATE + INTERVAL '604 days', 120, NOW()),
    ('SPR-ITER14', 'PROJ-WORKS', 'Iteration 14 — Developer Workspace + IDE Extension',
     'BCITS engineers have a meaningfully better experience than Jira/ADO/OpenProject',
     'PLANNED', CURRENT_DATE + INTERVAL '605 days', CURRENT_DATE + INTERVAL '661 days', 120, NOW()),
    ('SPR-ITER15', 'PROJ-WORKS', 'Iteration 15 — Scrum Master Cockpit + PO Workspace',
     'SMs and POs have meaningfully better workflows — the most demo-able addition',
     'PLANNED', CURRENT_DATE + INTERVAL '662 days', CURRENT_DATE + INTERVAL '724 days', 120, NOW()),
    ('SPR-ITER16', 'PROJ-WORKS', 'Iteration 16 — Leadership Console + Admin Operations Center',
     'All 5 role surfaces live — Developer, SM, PO, Leadership, Admin',
     'PLANNED', CURRENT_DATE + INTERVAL '725 days', CURRENT_DATE + INTERVAL '795 days', 120, NOW()),
    ('SPR-ITER17', 'PROJ-WORKS', 'Iteration 17 — Universal Customization Engine',
     'Admins tune every behavior without engineering tickets — template-based onboarding',
     'PLANNED', CURRENT_DATE + INTERVAL '796 days', CURRENT_DATE + INTERVAL '852 days', 100, NOW()),
    ('SPR-ITER18', 'PROJ-WORKS', 'Iteration 18 — Mobile + Real-time + Performance',
     'Works is a fully modern 2026 product on every device, real-time collaborative',
     'PLANNED', CURRENT_DATE + INTERVAL '853 days', CURRENT_DATE + INTERVAL '923 days', 120, NOW()),
    ('SPR-ITER19', 'PROJ-WORKS', 'Iteration 19 — Enterprise Security + Compliance Certifications',
     'Works meets enterprise security bar — SOC 2 Type 2, ISO 27001 earned',
     'PLANNED', CURRENT_DATE + INTERVAL '924 days', CURRENT_DATE + INTERVAL '994 days', 120, NOW()),
    ('SPR-ITER20', 'PROJ-WORKS', 'Iteration 20 — Polish, Advanced AI & Marketplace Foundation',
     'Works is commercially complete — enterprise, international, third-party ecosystem',
     'PLANNED', CURRENT_DATE + INTERVAL '995 days', CURRENT_DATE + INTERVAL '1091 days', 140, NOW())
ON CONFLICT DO NOTHING;


-- ============================================================
-- EPICS — All 26 Capabilities (v3 + v3.5)
-- V8 already seeded WRK-E01 through WRK-E19 (iteration-level epics).
-- This seeds the 26 capability-level epics (Cap A through Cap Z, U–Y).
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, story_points, priority, created_at) VALUES

-- Core Capabilities (Original v3)
('WRK-CA', 'Cap A — Identity & Workspace Foundation', 'In Progress', 'Epic',
 '14 sub-features: email+password, MFA, SSO, SCIM, app shell, event store, workspace CRUD, branding. Iter 1 + 13.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW() - INTERVAL '30 days'),

('WRK-CB', 'Cap B — Work Management Core', 'In Progress', 'Epic',
 '15 sub-features: 7 work item types, CRUD, field set, Kanban, backlog, parent/child, custom status duration. Iter 1–3.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW() - INTERVAL '30 days'),

('WRK-CC', 'Cap C — Workflow & Process Automation', 'Todo', 'Epic',
 '12 sub-features: visual workflow editor, status conditions/validators/post-functions, automation engine, BQL rules. Iter 3 + 13.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW() - INTERVAL '15 days'),

('WRK-CD', 'Cap D — Custom Fields & Schema Extensibility', 'Todo', 'Epic',
 '10 sub-features: 17+ field types, custom work item types, layout designer, field visibility per role. Iter 3.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW() - INTERVAL '15 days'),

('WRK-CE', 'Cap E — Search, Filters & Query Language (BQL)', 'In Progress', 'Epic',
 '10 sub-features: full-text search, BQL everywhere, saved filters, natural language → BQL (AI). Iter 1 + 3 + 11.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW() - INTERVAL '30 days'),

('WRK-CF', 'Cap F — Agile Execution Surface', 'In Progress', 'Epic',
 '14 sub-features: backlog, sprints, Kanban, swimlanes, quick filters, sprint reports, burndown, velocity. Iter 1–2.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW() - INTERVAL '30 days'),

('WRK-CG', 'Cap G — Collaboration & Communication', 'In Progress', 'Epic',
 '13 sub-features: threaded comments, @mentions, attachments, notifications, activity log, real-time. Iter 1 + 18.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW() - INTERVAL '30 days'),

('WRK-CH', 'Cap H — PM Artifacts (RAID, Decisions, Meetings)', 'Todo', 'Epic',
 '12 sub-features: risks, assumptions, PM issues, dependencies, decisions, meeting notes, actions, RAID dashboard. Iter 4.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'MEDIUM', NOW() - INTERVAL '10 days'),

('WRK-CI', 'Cap I — Centralized Knowledge Repository', 'Todo', 'Epic',
 '14 sub-features: knowledge spaces, rich editor, article templates, version history, RAG AI Q&A, article analytics. Iter 5 + 11.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'MEDIUM', NOW() - INTERVAL '10 days'),

('WRK-CJ', 'Cap J — Reports, Dashboards & Insights', 'Todo', 'Epic',
 '14 sub-features: dashboard designer, 20+ widgets, custom report builder, drill-down, scheduled delivery, exports. Iter 6.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW() - INTERVAL '10 days'),

('WRK-CK', 'Cap K — Compliance Rules Engine', 'Todo', 'Epic',
 '14 sub-features: visual rule builder, 20+ templates, continuous evaluation, violation lifecycle, compliance dashboard. Iter 7.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW() - INTERVAL '5 days'),

('WRK-CL', 'Cap L — KPI Framework with Privacy Guardrails', 'Todo', 'Epic',
 '13 sub-features: metric definitions, default catalog, privacy layers (individual private/team aggregate), AI narratives. Iter 12.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW() - INTERVAL '5 days'),

('WRK-CM', 'Cap M — SLA Engine (Internal & Customer Unified)', 'Todo', 'Epic',
 '12 sub-features: SLA policy definition, business-hours calendars, countdown timers, escalation, breach prediction (AI). Iter 8.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW() - INTERVAL '5 days'),

('WRK-CN', 'Cap N — Service Management & Customer Portal', 'Todo', 'Epic',
 '15 sub-features: branded portal, request types, agent queues, CSAT, customer KB, multi-tier SLAs. Iter 9 + 11.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW()),

('WRK-CO', 'Cap O — AI Orchestration Layer', 'Todo', 'Epic',
 '18 sub-features: central AI service, intent detection, smart triage, story generation, anomaly detection, multi-step agents. Iter 10–11 + 20.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW()),

('WRK-CP', 'Cap P — Conversational Command Interface', 'Todo', 'Epic',
 '13 sub-features: natural language command bar, multi-action plans, plan preview, voice input, multilingual (Hindi/Hinglish). Iter 11.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW()),

('WRK-CQ', 'Cap Q — Integration, API & Extensibility', 'Todo', 'Epic',
 '14 sub-features: outbound webhooks, REST API + OAuth 2.0, Slack/GitHub/GitLab/email/calendar native connectors. Iter 13.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'MEDIUM', NOW()),

('WRK-CR', 'Cap R — Universal Customization Engine', 'Todo', 'Epic',
 '14 sub-features: workspace settings, config templates, versioning, sandbox mode, import/export, lockable settings, marketplace. Iter 17 + 20.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'MEDIUM', NOW()),

('WRK-CS', 'Cap S — Mobile, Real-time & Performance', 'Todo', 'Epic',
 '12 sub-features: native iOS/Android, PWA, offline mode, push notifications, real-time co-presence, keyboard shortcuts. Iter 18.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'MEDIUM', NOW()),

('WRK-CT', 'Cap T — Enterprise Security, Audit & Governance', 'Todo', 'Epic',
 '14 sub-features: passkeys, conditional access, append-only audit log, BYOK, data residency, SOC 2 + ISO 27001. Iter 19.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW()),

-- v3.5 NEW Capabilities
('WRK-CZ', 'Cap Z — AI Control Plane (NEW v3.5)', 'Todo', 'Epic',
 '14 sub-features: workspace AI policy, per-capability toggle, user preference, in-context override, AI budget caps, audit log. Iter 10.',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW()),

('WRK-CU', 'Cap U — Developer Workspace (NEW v3.5)', 'Todo', 'Epic',
 '13 sub-features: developer home, VS Code extension, JetBrains extension, commit↔item linking, focus mode, standup helper, private velocity. Iter 14.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW()),

('WRK-CV', 'Cap V — Scrum Master Cockpit (NEW v3.5)', 'Todo', 'Epic',
 '12 sub-features: sprint planning helper, standup facilitator, impediment tracker, mid-sprint risk panel, retro toolkit, cross-sprint pattern detection. Iter 15.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW()),

('WRK-CW', 'Cap W — Product Owner Workspace (NEW v3.5)', 'Todo', 'Epic',
 '13 sub-features: product roadmap, backlog refinement helper, customer feedback aggregation, OKR linkage, release notes auto-draft, stakeholder map. Iter 15.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'HIGH', NOW()),

('WRK-CX', 'Cap X — Leadership Console (NEW v3.5)', 'Todo', 'Epic',
 '13 sub-features: cross-team rollup, AI executive briefing, strategic theme tracker, resource allocation, customer health dashboard, board deck auto-draft. Iter 16.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'MEDIUM', NOW()),

('WRK-CY', 'Cap Y — Admin Operations Center (NEW v3.5)', 'Todo', 'Epic',
 '14 sub-features: user lifecycle automation, license/seat management, workspace health monitor, AI cost dashboard, compliance evidence package. Iter 16.',
 'PROJ-WORKS', 'USR-DEV1', 13, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 3 — Workflows, Permissions & Custom Fields
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

-- Epic
('WRK-E20', 'Epic: Iteration 3 — Workflows, Permissions & Custom Fields', 'Todo', 'Epic',
 'Works becomes configurable — teams customize workflows, fields, layouts, permissions. Est 4–6 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 55, 'HIGH', NOW()),

-- Stories (Cap C)
('WRK-300', 'Visual workflow editor — drag-drop statuses and transitions', 'Todo', 'Story',
 'Drag-drop builder for statuses and transitions per WorkItem type. Status categories. Color coding. POST /api/workflows.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 8, 'HIGH', NOW()),
('WRK-301', 'Workflow conditions, validators, and post-functions', 'Todo', 'Story',
 'Per-transition: only-assignee-can-resolve, require-comment-on-rejection, auto-set-field. Uses BQL conditions.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 8, 'HIGH', NOW()),
('WRK-302', 'Roles and permissions matrix', 'Todo', 'Story',
 'Permission scheme: rows are permissions, columns are roles. Role assignment per project. Roles: VIEWER/MEMBER/LEAD/ADMIN/OWNER.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 8, 'HIGH', NOW()),
('WRK-303', 'Field visibility rules per role (server-enforced)', 'Todo', 'Story',
 'Per field, per role: Hidden / Read-only / Editable. Spring Security @PreAuthorize on field-level endpoints.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 5, 'HIGH', NOW()),

-- Stories (Cap D)
('WRK-310', 'Custom work item types (admin-defined)', 'Todo', 'Story',
 'Admin creates types like Meter Rollout, Tariff Change, Substation Commission. POST /api/work-item-types.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 5, 'HIGH', NOW()),
('WRK-311', 'Custom field library — 17+ types', 'Todo', 'Story',
 'Text, number, currency, date, select, multi-select, user-picker, URL, checkbox, file, JSON and more. field_def table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 8, 'HIGH', NOW()),
('WRK-312', 'Layout designer — drag-drop field grouping per type', 'Todo', 'Story',
 'WYSIWYG drag-drop layout per type: field grouping, ordering, sections, columns. Stored in field_layout table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 5, 'MEDIUM', NOW()),

-- Stories (Cap E — BQL)
('WRK-320', 'BQL — bSmart Query Language foundation', 'Todo', 'Story',
 'Composable query syntax used in filters, automations, rules, dashboards. BQL parser in Spring backend.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 13, 'HIGH', NOW()),

-- Tasks
('WRK-330', 'Flyway migrations: workflow, field_def, permission_scheme tables', 'Todo', 'Task',
 'V3xx migrations for all new tables in iteration 3. See data model doc for schema.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 3, 'HIGH', NOW()),
('WRK-331', 'Seed 20+ built-in workflow templates', 'Todo', 'Task',
 'Software Bug Workflow, Scrum Story Workflow, Incident Workflow, EPC Delivery Workflow as built-in templates.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 3, 'MEDIUM', NOW()),
('WRK-332', 'BCITS domain field types — SubstationCode, MeterMake, FirmwareVersion', 'Todo', 'Task',
 'Seed BCITS-specific custom field definitions as example data for demo and dogfooding.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 2, 'LOW', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 4 — PM Artifacts (RAID, Decisions, Meetings)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E21', 'Epic: Iteration 4 — PM Artifacts (RAID, Decisions, Meetings)', 'Todo', 'Epic',
 'BCITS PMs have their full toolkit: RAID logs, decisions, meetings, action items. Est 5–7 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 65, 'MEDIUM', NOW()),

('WRK-400', 'Risk register — probability × impact matrix', 'Todo', 'Story',
 'Probability, impact, mitigation plan, owner, review date, status. Linked to work items. risk table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 5, 'HIGH', NOW()),
('WRK-401', 'Assumptions log with auto-expiry prompts', 'Todo', 'Story',
 'Logged assumptions with rationale, validation status, owner, expiry date. Alert on expiry.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 3, 'MEDIUM', NOW()),
('WRK-402', 'PM Issues log (distinct from software bugs)', 'Todo', 'Story',
 'Project-level problems: problem, impact, resolution path. pm_issue table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 3, 'MEDIUM', NOW()),
('WRK-403', 'Dependencies tracker — cross-team/cross-project', 'Todo', 'Story',
 'Cross-team dependencies with deadline, status, blocker indicators. dependency table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 3, 'MEDIUM', NOW()),
('WRK-404', 'Decision register — alternatives considered, rationale, ADR format', 'Todo', 'Story',
 'Decision, alternatives, rationale, date, owner, supporting links, related risks. decision table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 5, 'HIGH', NOW()),
('WRK-405', 'Meeting notes — structured capture with auto-extracted actions', 'Todo', 'Story',
 'Agenda, attendees, notes, decisions made, action items emitted. Block-based editor with structured sections.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 8, 'HIGH', NOW()),
('WRK-406', 'RAID dashboard per project — heat indicators by severity', 'Todo', 'Story',
 'Single view of all open Risks, Assumptions, Issues, Dependencies. Heat map by severity.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 5, 'MEDIUM', NOW()),
('WRK-407', 'Stakeholder register with influence/interest map', 'Todo', 'Story',
 'Stakeholders with role, influence, interest, communication frequency, last-contacted. stakeholder table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 3, 'LOW', NOW()),
('WRK-408', 'Lessons learned — taggable, searchable, linkable', 'Todo', 'Story',
 'Post-project: what worked, what did not. lesson_learned table. Linked to decisions and RAID.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 3, 'LOW', NOW()),
('WRK-409', 'Dogfood: log all bSmart Works architecture decisions as ADRs in Works', 'Todo', 'Task',
 'Eat our own dogfood — PostgreSQL choice, Java 21/Spring Boot choice, UUID IDs choice all logged as decisions.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 2, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 5 — Knowledge Repository + Versions
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E22', 'Epic: Iteration 5 — Knowledge Repository + Versions', 'Todo', 'Epic',
 'Centralized workspace knowledge base: runbooks, ADRs, customer KB — searchable, versioned. Est 4–6 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 50, 'MEDIUM', NOW()),

('WRK-500', 'Knowledge spaces with scoped permissions and article hierarchy', 'Todo', 'Story',
 'Workspace-level spaces (Engineering, Support, HR) with separate permissions. knowledge_space table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 5, 'HIGH', NOW()),
('WRK-501', 'Rich article editor — block-based with Mermaid, tables, embeds', 'Todo', 'Story',
 'Block-based editor, markdown shortcuts, code blocks, Mermaid diagrams, images. knowledge_article table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 8, 'HIGH', NOW()),
('WRK-502', 'Article version history and restore', 'Todo', 'Story',
 'Every save creates a version. Diff view. Restore any prior version. article_version table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 5, 'HIGH', NOW()),
('WRK-503', 'Article ↔ WorkItem bidirectional linking', 'Todo', 'Story',
 'Articles cite work items, items link to articles. Context preserved. Bi-directional.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 3, 'MEDIUM', NOW()),
('WRK-504', 'Drafts and publishing workflow with approvals', 'Todo', 'Story',
 'Author → Review → Publish with required approvals before public visibility.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 5, 'MEDIUM', NOW()),
('WRK-505', 'Versions and Releases — assign items to fix/affect version', 'Todo', 'Story',
 'Define version (Portal v4.2.0), assign items, release/archive lifecycle. version table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 5, 'MEDIUM', NOW()),
('WRK-506', 'Time tracking and worklogs', 'Todo', 'Story',
 'Manual time entries: original estimate, remaining, time spent. worklog table. Per-user worklog history.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 3, 'LOW', NOW()),
('WRK-507', 'Dogfood: publish Works runbooks in Works Knowledge space', 'Todo', 'Task',
 'Eat our own dogfood — Works setup guide, dev environment runbook, deployment guide as KB articles.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 3, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 6 — Reports, Dashboards & Insights
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E23', 'Epic: Iteration 6 — Reports, Dashboards & Insights', 'Todo', 'Epic',
 'Self-service reporting — dashboards, widgets, scheduled delivery. Phase 1 internal validation gate. Est 5–7 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 60, 'HIGH', NOW()),

('WRK-600', 'Dashboard designer — drag-drop 12-column grid', 'Todo', 'Story',
 'Drag-drop grid with widgets. Personal, team, project, organization dashboards. dashboard table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 8, 'HIGH', NOW()),
('WRK-601', 'Widget library — 20+ widget types', 'Todo', 'Story',
 'Pie, bar, line, two-dim, scorecard, filter result, sprint health, burndown, cumulative flow. dashboard_widget table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 13, 'HIGH', NOW()),
('WRK-602', 'Custom report builder — sections: chart, table, narrative, KPI grid', 'Todo', 'Story',
 'Visual builder for full-page reports. saved_report table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 8, 'MEDIUM', NOW()),
('WRK-603', 'Scheduled report delivery — email or in-app', 'Todo', 'Story',
 'Schedule delivery with per-recipient personalization. scheduled_report table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 5, 'MEDIUM', NOW()),
('WRK-604', 'Drill-down navigation from any chart element', 'Todo', 'Story',
 'Click chart element to see underlying items. Drill maintains filters and context.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 5, 'HIGH', NOW()),
('WRK-605', 'Export PDF / Excel / PNG for stakeholders without Works access', 'Todo', 'Task',
 'Static exports for stakeholders, regulators, board members.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 3, 'MEDIUM', NOW()),
('WRK-606', 'Embeddable read-only dashboards via iframe', 'Todo', 'Task',
 'iframe-embeddable URLs for internal portals and customer-facing status pages.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 3, 'LOW', NOW()),
('WRK-607', 'Dogfood: build Works sprint health dashboard in Works', 'Todo', 'Task',
 'Eat our own dogfood — create the team velocity + sprint health dashboard for the WORKS project.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 2, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 7 — Compliance Rules Engine
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E24', 'Epic: Iteration 7 — Compliance Rules Engine', 'Todo', 'Epic',
 'Strategic differentiator — Works becomes meaningfully different from Jira/ADO. Est 6–8 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 80, 'HIGH', NOW()),

('WRK-700', 'Rule definition — visual builder (BQL scope + assertion + threshold + severity)', 'Todo', 'Story',
 'BQL scope + assertion + threshold + severity + notify-to. Test-before-activate. Save as template. compliance_rule table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 13, 'HIGH', NOW()),
('WRK-701', 'Seeded rule library — 20+ built-in templates', 'Todo', 'Story',
 'Orphan story, stale item, missing estimate, scope creep, sprint without goal, unassigned in-progress.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 8, 'HIGH', NOW()),
('WRK-702', 'Continuous rule evaluation on every state change', 'Todo', 'Story',
 'Rules run on every state change for continuous rules; periodic for scheduled rules. Event-driven via event store.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 8, 'HIGH', NOW()),
('WRK-703', 'Violation lifecycle — Open → Acknowledged → Resolved / Won''t-Fix', 'Todo', 'Story',
 'Violation lifecycle with audit trail. Bulk acknowledgement. compliance_violation table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 5, 'HIGH', NOW()),
('WRK-704', 'Severity routing and escalation policies', 'Todo', 'Story',
 'Per rule: notify item owner/project admin/Slack. Multi-step escalation if not acknowledged in X hours.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 5, 'HIGH', NOW()),
('WRK-705', 'Compliance dashboard — severity breakdown, 30-day trend, heatmap', 'Todo', 'Story',
 'Severity cards, trend chart, rules × projects heatmap, drill-down to violations.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 8, 'MEDIUM', NOW()),
('WRK-706', 'Auto status duration tracking — time in each status from event log', 'Todo', 'Task',
 'Automatic projection of time each item spent in each status. Computed from event log. status_duration table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 5, 'HIGH', NOW()),
('WRK-707', 'Compliance audit log — regulator-ready exports', 'Todo', 'Task',
 'Append-only log of rule changes, violations, acknowledgements, resolutions. PDF export.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 3, 'HIGH', NOW()),
('WRK-708', 'Dogfood: add code quality compliance rules for WORKS project', 'Todo', 'Task',
 'Eat our own dogfood — P0 bugs must have root cause in 2 days, stories need AC before In Progress.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 2, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 8 — SLA Engine
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E25', 'Epic: Iteration 8 — SLA Engine (Internal & Generalized)', 'Todo', 'Epic',
 'Unified SLA engine for internal delivery and external customer SLAs. Est 5–7 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 60, 'HIGH', NOW()),

('WRK-800', 'SLA policy definition — scope + business-hours + targets + triggers', 'Todo', 'Story',
 'BQL scope + business-hours calendar + targets (response, resolution) + start/pause/stop triggers. sla_policy table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 8, 'HIGH', NOW()),
('WRK-801', 'Business-hours calendars with holidays and time zones', 'Todo', 'Story',
 'Per-policy calendar (Mon-Fri 9-6 IST) with holidays and time zones. business_hours_calendar table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 5, 'HIGH', NOW()),
('WRK-802', 'Visible countdown timers on work items', 'Todo', 'Story',
 'On the work item — Resolve in 2h 14m. Color changes as SLA approaches breach (green/amber/red-pulsing).',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 5, 'HIGH', NOW()),
('WRK-803', 'SLA pause/resume triggers — auto-pause on waiting states', 'Todo', 'Story',
 'Auto-pause on Waiting on customer, auto-resume on customer response. Full audit trail.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 5, 'MEDIUM', NOW()),
('WRK-804', 'SLA escalation — auto-reassign or notify before breach', 'Todo', 'Story',
 'Multiple escalation steps. sla_record table tracks all events immutably.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 5, 'HIGH', NOW()),
('WRK-805', 'SLA reporting — met/breached rates, trend analysis', 'Todo', 'Story',
 'Met/breached rates by period, team, policy. Trend analysis.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 5, 'MEDIUM', NOW()),
('WRK-806', 'Dogfood: add internal P0/P1 SLA to WORKS project bugs', 'Todo', 'Task',
 'Eat our own dogfood — P0 bugs: 4h resolution, P1: 16h. Code review SLA: 24h.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 2, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 9 — Service Management & Customer Portal
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E26', 'Epic: Iteration 9 — Service Management & Customer Portal', 'Todo', 'Epic',
 'Works becomes sellable to first paying utility customers. The commercial gate. Est 8–10 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 90, 'HIGH', NOW()),

('WRK-900', 'Customer accounts — external user identity scoped to customer org', 'Todo', 'Story',
 'Separate auth flow from internal users. customer_account table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 8, 'HIGH', NOW()),
('WRK-901', 'Branded customer portal — white-labeled per customer', 'Todo', 'Story',
 'White-labeled: logo, colors, custom domain. Separate from internal Works UI. customer-facing subdomain.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 13, 'HIGH', NOW()),
('WRK-902', 'Portal forms per request type — conditional fields, visual designer', 'Todo', 'Story',
 'Custom form per request type with conditional fields. Visual form designer. Validation.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 8, 'HIGH', NOW()),
('WRK-903', 'Agent queues — filtered work views for support agents', 'Todo', 'Story',
 'All open, Mine, Unassigned, High priority. Built on existing work item system.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 5, 'HIGH', NOW()),
('WRK-904', 'Customer satisfaction (CSAT) — post-resolution rating', 'Todo', 'Story',
 'Post-resolution rating with optional comment. CSAT trends in reporting. csat_response table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 3, 'MEDIUM', NOW()),
('WRK-905', 'Multi-tier customer SLAs — Platinum/Gold/Silver', 'Todo', 'Story',
 'Different SLA targets per customer tier. Platinum 30-min, Gold 2-hour, Silver 8-hour.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 5, 'HIGH', NOW()),
('WRK-906', 'Customer-facing knowledge base — portal-published articles', 'Todo', 'Story',
 'Subset of internal KB published to portal. Customer-search-optimized.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 5, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 10 — AI Orchestration Foundation + AI Control Plane
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E27', 'Epic: Iteration 10 — AI Orchestration Foundation + AI Control Plane', 'Todo', 'Epic',
 'AI arrives as opt-in architecture. Every AI feature has a documented deterministic fallback. Est 6–8 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 80, 'HIGH', NOW()),

('WRK-1000', 'AI Orchestration service — central service all AI calls flow through', 'Todo', 'Story',
 'Intent detection, entity resolution, plan generation, validation, execution. Single budget + audit trail.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 13, 'HIGH', NOW()),
('WRK-1001', 'Confirmation-first pattern — AI proposes, user confirms, system executes', 'Todo', 'Story',
 'AI never silently mutates. Proposes → validates → user confirms → deterministic execution.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 8, 'HIGH', NOW()),
('WRK-1002', 'AI Control Plane — workspace policy + per-capability toggle', 'Todo', 'Story',
 'Cap Z features: workspace AI policy, per-capability toggle, per-user preference, in-context override. ai_policy table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 13, 'HIGH', NOW()),
('WRK-1003', 'AI budget caps — per-workspace monthly cap with auto-degradation', 'Todo', 'Story',
 'At 80% → degrade to Haiku. At 100% → auto-disable. Admin override. ai_usage_record table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 8, 'HIGH', NOW()),
('WRK-1004', 'AI audit log — every AI call logged with tokens, cost, on/off state', 'Todo', 'Story',
 'ai_audit_log table. Every AI invocation: timestamp, user, capability, prompt size, model, tokens, cost.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 5, 'HIGH', NOW()),
('WRK-1005', 'Natural language → BQL — first AI surface', 'Todo', 'Story',
 'open bugs assigned to me last week becomes BQL with preview before applying.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 8, 'HIGH', NOW()),
('WRK-1006', 'AI off-state UI — buttons hidden, command bar degrades to keyword search', 'Todo', 'Task',
 'AI buttons hidden (not dimmed) when AI is off. Clean, not broken.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 5, 'HIGH', NOW()),
('WRK-1007', 'Model tier selection — Haiku/Sonnet/Opus per use case', 'Todo', 'Task',
 'Admin configures model tier per capability. Cost optimization built in.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 3, 'MEDIUM', NOW()),
('WRK-1008', 'Data boundary controls — restrict which data types go to AI', 'Todo', 'Task',
 'Admin restricts: no PII, no financial data to AI providers. ai_capability_toggle table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 5, 'HIGH', NOW()),
('WRK-1009', 'Dogfood: enable AI for WORKS project, disable for compliance rules', 'Todo', 'Task',
 'Eat our own dogfood — test the AI Control Plane policy hierarchy in our own workspace.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 2, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 11 — AI Expansion + Conversational Command Bar
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E28', 'Epic: Iteration 11 — AI Expansion + Conversational Command Bar', 'Todo', 'Epic',
 'Works is fully AI-native. Opt-in users get meaningfully greater productivity. Est 8–10 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 100, 'HIGH', NOW()),

('WRK-1100', 'Conversational command bar — natural language → multi-step plan', 'Todo', 'Story',
 'Add Priya as developer in WEB team parsed, validated, executed after confirmation. Cmd-K.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 13, 'HIGH', NOW()),
('WRK-1101', 'Multi-action plans with inline edit before execution', 'Todo', 'Story',
 'Find P0 bugs → move to In Progress → add comment. User edits any step before confirming.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 8, 'HIGH', NOW()),
('WRK-1102', 'Smart triage — AI suggests assignee, priority, component', 'Todo', 'Story',
 'Incoming items get AI-suggested assignee/priority from title and description.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 8, 'HIGH', NOW()),
('WRK-1103', 'Story / AC / test case generation with AI', 'Todo', 'Story',
 'Specialized AI generators with templates. User confirms before content is saved.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 8, 'HIGH', NOW()),
('WRK-1104', 'RAG over knowledge base — AI answers grounded in workspace knowledge', 'Todo', 'Story',
 'AI answers with citations from workspace knowledge. Powers KB Q&A.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 8, 'HIGH', NOW()),
('WRK-1105', 'AI comment drafting — context-appropriate tone', 'Todo', 'Story',
 'AI drafts comments. User edits before posting.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'MEDIUM', NOW()),
('WRK-1106', 'Anomaly explanation on charts — why did this change?', 'Todo', 'Story',
 'When dashboards show anomalies, AI explains with citations.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'MEDIUM', NOW()),
('WRK-1107', 'AI-suggested compliance rules from observed patterns', 'Todo', 'Story',
 'AI observes patterns and proposes rules. Admin reviews, edits, activates.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'MEDIUM', NOW()),
('WRK-1108', 'SLA breach prediction from trajectory and history', 'Todo', 'Story',
 'AI predicts likely SLA breaches before they happen.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'HIGH', NOW()),
('WRK-1109', 'Multilingual command bar — Hindi, Hinglish, English', 'Todo', 'Story',
 'Bug WEB-1247 ko Rahul ko assign karo works. Lowers adoption barrier for non-English-first users.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'MEDIUM', NOW()),
('WRK-1110', 'Article suggestion at intake — deflect ticket creation with KB', 'Todo', 'Story',
 'Customer types problem → AI suggests KB articles before ticket creation.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'HIGH', NOW()),
('WRK-1111', 'AI article drafting — user describes need, AI drafts, user edits', 'Todo', 'Story',
 'AI drafts KB articles from descriptions. Templates respected.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 12 — KPI Framework with Privacy Guardrails
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E29', 'Epic: Iteration 12 — KPI Framework with Privacy Guardrails', 'Todo', 'Epic',
 'Team health visible without surveillance. Privacy enforced at API — managers cannot drill into individuals. Est 5–7 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 65, 'HIGH', NOW()),

('WRK-1200', 'Metric definitions and immutable snapshots', 'Todo', 'Story',
 'Define via safe formula builder. Snapshots saved per period — immutable. kpi_metric + kpi_snapshot tables.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 8, 'HIGH', NOW()),
('WRK-1201', 'Default metric catalog — velocity, cycle time, lead time, bug escape', 'Todo', 'Story',
 'Velocity, commitment accuracy, cycle time, lead time, rework, WIP, blocked time, bug escape, PR turnaround.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 5, 'HIGH', NOW()),
('WRK-1202', 'Personal view — individual metrics visible only to the engineer', 'Todo', 'Story',
 'Cycle time, throughput, completion rate. Private. Never visible to manager. API-enforced.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 5, 'HIGH', NOW()),
('WRK-1203', 'Team view — aggregated team metrics, no individual breakdown', 'Todo', 'Story',
 'Team-level aggregated metrics. API-enforced: no individual data access via UI or API.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 5, 'HIGH', NOW()),
('WRK-1204', 'Manager view — API-enforced privacy guardrails', 'Todo', 'Story',
 'Manager sees teams aggregated metrics. API-enforced — no individual data access.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 8, 'HIGH', NOW()),
('WRK-1205', 'AI team-health narrative — explains trends with causes', 'Todo', 'Story',
 'AI generates: Predictability improved; scope stability declined due to mid-sprint additions.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 5, 'MEDIUM', NOW()),
('WRK-1206', 'Dogfood: set up WORKS project KPIs in the new framework', 'Todo', 'Task',
 'Eat our own dogfood — track WORKS velocity, cycle time, bug escape rate using our own KPI framework.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 2, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 13 — Automation Engine + Integrations
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E30', 'Epic: Iteration 13 — Automation Engine + Integrations', 'Todo', 'Epic',
 'Works integrates with BCITS existing tooling — Slack, GitHub, GitLab, email, calendar. Est 6–8 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 80, 'MEDIUM', NOW()),

('WRK-1300', 'Automation engine — visual When/If/Then builder with branching', 'Todo', 'Story',
 'Visual builder: When [trigger], if [condition], then [action]. Multi-step chains. automation_rule table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 13, 'HIGH', NOW()),
('WRK-1301', 'Test mode for automations — dry-run preview', 'Todo', 'Story',
 'Dry-run mode: If activated now, this rule would affect 23 items.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 5, 'MEDIUM', NOW()),
('WRK-1302', 'Outbound webhooks — retry, signing, dead-letter queue', 'Todo', 'Story',
 'Per event type, retry, signing, dead-letter queue. webhook table.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 5, 'MEDIUM', NOW()),
('WRK-1303', 'Public REST API + OAuth 2.0 + OpenAPI 3.1 spec', 'Todo', 'Story',
 'Fully documented OpenAPI 3.1. Every UI action available via API.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 8, 'HIGH', NOW()),
('WRK-1304', 'SSO (SAML, OIDC) and SCIM provisioning', 'Todo', 'Story',
 'Single sign-on, SCIM 2.0 provisioning. Spring Security SAML + OIDC.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 8, 'HIGH', NOW()),
('WRK-1305', 'Slack connector — link channels, /works commands, work-item updates', 'Todo', 'Story',
 'Link channels to projects. /works commands. Send work-item updates to channels.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 5, 'MEDIUM', NOW()),
('WRK-1306', 'GitHub / GitLab connector — PR linking, commit refs, status sync', 'Todo', 'Story',
 'PR auto-links to work item. PR merge → auto-transitions item to Done.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 5, 'HIGH', NOW()),
('WRK-1307', 'Email connector — inbound email → work item creation', 'Todo', 'Story',
 'Inbound: email → work item. Outbound: notifications, digests.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 3, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 14 — Developer Workspace + IDE Extension (Cap U)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E31', 'Epic: Iteration 14 — Developer Workspace + IDE Extension', 'Todo', 'Epic',
 'BCITS engineers have a meaningfully better experience than Jira/ADO/OpenProject. Est 6–8 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 80, 'HIGH', NOW()),

('WRK-1400', 'Developer Workspace home — today work, PRs, blockers, focus blocks', 'Todo', 'Story',
 'Customized landing page showing today''s work, PRs, blockers, focus blocks. AI-assisted.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 8, 'HIGH', NOW()),
('WRK-1401', 'VS Code extension — sidebar with work item context + commit linking', 'Todo', 'Story',
 'IDE sidebar shows work item context. Inline commit linking. Status updates from editor. AC checklist.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 13, 'HIGH', NOW()),
('WRK-1402', 'JetBrains extension — IntelliJ / PyCharm / WebStorm parity', 'Todo', 'Story',
 'Feature parity with VS Code extension for IntelliJ / PyCharm / WebStorm.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 8, 'HIGH', NOW()),
('WRK-1403', 'Focus mode — suppress notifications during scheduled focus blocks', 'Todo', 'Story',
 'Only P0 incidents break through focus mode. Calendar-integrated scheduling.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'MEDIUM', NOW()),
('WRK-1404', 'Standup helper — AI-drafted yesterday/today/blockers from git+work items', 'Todo', 'Story',
 'Auto-drafts standup update from work item and git activity. User edits before posting.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'HIGH', NOW()),
('WRK-1405', 'Personal velocity (private) — cycle time, throughput, completion rate', 'Todo', 'Story',
 'Private to engineer. Never visible to manager. Psychological safety preserved.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'HIGH', NOW()),
('WRK-1406', 'CLI tool — works command for terminal transitions and search', 'Todo', 'Story',
 'Terminal interface for transitions, comments, search. Power-user productivity.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'MEDIUM', NOW()),
('WRK-1407', 'Code review queue — ranked by urgency and expertise', 'Todo', 'Story',
 'Personalized queue of PRs needing review, ranked by urgency and expertise.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'MEDIUM', NOW()),
('WRK-1408', 'Definition-of-done checklists per type or epic', 'Todo', 'Task',
 'Checklists that must complete before resolving. Per type or per epic.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 3, 'MEDIUM', NOW()),
('WRK-1409', 'Dogfood: BCITS dev team adopts Developer Workspace for daily work', 'Todo', 'Task',
 'Eat our own dogfood — all BCITS developers switch to Developer Workspace as their primary Works view.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 2, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 15 — Scrum Master Cockpit + PO Workspace (Cap V + W)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E32', 'Epic: Iteration 15 — Scrum Master Cockpit + PO Workspace', 'Todo', 'Epic',
 'SMs and POs have meaningfully better workflows — the most demo-able product addition. Est 7–9 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 90, 'HIGH', NOW()),

-- Scrum Master Cockpit (Cap V)
('WRK-1500', 'Sprint planning helper — capacity calculator + AI commit suggestion', 'Todo', 'Story',
 'Capacity calculator, AI-suggested sprint commit based on velocity, item suggestion from refined backlog.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 8, 'HIGH', NOW()),
('WRK-1501', 'Standup facilitator — sequential per-member flow, time-boxed', 'Todo', 'Story',
 'Sequential flow per team member, time-boxed, auto-records updates, flags missing.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),
('WRK-1502', 'Impediment tracker — first-class artifact, not buried in chat', 'Todo', 'Story',
 'First-class artifact with owner, severity, age, escalation.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),
('WRK-1503', 'Mid-sprint risk panel — scope creep, stale items, breach predictions', 'Todo', 'Story',
 'Live view of scope creep, stale items, zero-assignment members, SLA breach predictions.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),
('WRK-1504', 'Retro toolkit — template gallery, action item capture, anonymous mode', 'Todo', 'Story',
 '4Ls, Start/Stop/Continue, Mad/Sad/Glad templates. Action items auto-emitted as tracked artifacts.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 8, 'HIGH', NOW()),
('WRK-1505', 'Cross-sprint pattern detection — recurring impediments, scope creep', 'Todo', 'Story',
 'Recurring impediments, repeated estimation misses, common scope-creep sources.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'MEDIUM', NOW()),

-- Product Owner Workspace (Cap W)
('WRK-1510', 'Product roadmap — visual timeline of themes/epics across quarters', 'Todo', 'Story',
 'Visual timeline with status, scope, dates. Drag-drop themes across quarters.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 8, 'HIGH', NOW()),
('WRK-1511', 'Backlog refinement helper — AI-ranked by criteria', 'Todo', 'Story',
 'AI ranks backlog by criteria you define: customer value, effort, strategic alignment.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),
('WRK-1512', 'Customer feedback aggregation — cluster into themes with sentiment', 'Todo', 'Story',
 'Pull from portal, email, comments. AI clusters into themes with sentiment.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),
('WRK-1513', 'OKR linkage — link items to OKRs, visualize progress', 'Todo', 'Story',
 'Link work items to OKRs. Visualize progress at item, epic, theme level.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'MEDIUM', NOW()),
('WRK-1514', 'Release notes auto-draft — AI from completed items, PO edits and publishes', 'Todo', 'Story',
 'AI drafts user-facing release notes from completed items. PO edits and publishes.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),
('WRK-1515', 'Stakeholder map with targeted communication', 'Todo', 'Story',
 'Stakeholders with role, influence, interest. Targeted release/status updates.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 3, 'MEDIUM', NOW()),
('WRK-1516', 'Dogfood: use SM Cockpit for WORKS sprint planning and retros', 'Todo', 'Task',
 'Eat our own dogfood — run all WORKS sprint planning and retros using SM Cockpit.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 2, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 16 — Leadership Console + Admin Operations Center (Cap X + Y)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E33', 'Epic: Iteration 16 — Leadership Console + Admin Operations Center', 'Todo', 'Epic',
 'All 5 role surfaces live. BCITS leadership and administration have meaningfully better workflows. Est 8–10 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 100, 'HIGH', NOW()),

-- Leadership Console (Cap X)
('WRK-1600', 'Cross-team rollup dashboard — aggregated metrics across all teams', 'Todo', 'Story',
 'Aggregated metrics across all teams under leader''s scope. Permission-aware.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 8, 'HIGH', NOW()),
('WRK-1601', 'AI executive briefing — weekly auto-generated narrative', 'Todo', 'Story',
 'Weekly auto-generated narrative tailored to leader''s priorities. Configurable tone, length, focus.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 8, 'HIGH', NOW()),
('WRK-1602', 'Strategic theme tracker — progress, contributing items, risks', 'Todo', 'Story',
 'Each theme: progress, contributing items, owners, risks. Drill-down to underlying work.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),
('WRK-1603', 'Resource allocation view — capacity utilization, rebalancing suggestions', 'Todo', 'Story',
 'Who is on what, capacity utilization, over/under-allocation. AI rebalancing suggestions.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'MEDIUM', NOW()),
('WRK-1604', 'Customer health dashboard — per-customer SLA, escalations, CSAT, churn risk', 'Todo', 'Story',
 'Per-customer composite of SLA, escalations, CSAT, churn-risk indicators.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),
('WRK-1605', 'Board deck auto-draft — quarterly engineering section', 'Todo', 'Story',
 'Generates quarterly board deck slides for engineering/delivery section.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'MEDIUM', NOW()),

-- Admin Operations Center (Cap Y)
('WRK-1610', 'User lifecycle automation — onboarding/offboarding playbooks', 'Todo', 'Story',
 'Onboarding/offboarding playbooks with role-aware steps and audit trail.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 8, 'HIGH', NOW()),
('WRK-1611', 'License / seat management — active seats, cost, growth projection', 'Todo', 'Story',
 'Active seats, available seats, cost per seat, growth projection. Renewal alerts.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'MEDIUM', NOW()),
('WRK-1612', 'Workspace health monitor — storage, API rates, AI cost, integration status', 'Todo', 'Story',
 'Single admin dashboard for all operational metrics.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),
('WRK-1613', 'AI cost dashboard — cost by user, feature, capability vs budget', 'Todo', 'Story',
 'Cost by user, by feature, by capability. Budget vs actual. Threshold alerts.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),
('WRK-1614', 'Compliance evidence package — on-demand SOC 2 / ISO 27001 bundle', 'Todo', 'Story',
 'On-demand audit-ready PDF bundle. Audit prep from weeks to minutes.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),
('WRK-1615', 'Access review — bulk-deactivate inactive users with audit log', 'Todo', 'Task',
 'Periodic review prompts. Bulk-deactivate inactive users. Report generation.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 3, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 17 — Universal Customization Engine (Cap R)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E34', 'Epic: Iteration 17 — Universal Customization Engine', 'Todo', 'Epic',
 'Admins tune every behavior without engineering tickets. Template-based customer onboarding. Est 6–8 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 70, 'MEDIUM', NOW()),

('WRK-1700', 'Workspace settings — centralized single settings surface', 'Todo', 'Story',
 'Branding, locale, timezone, working calendar, defaults — one settings surface for all config.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 5, 'HIGH', NOW()),
('WRK-1701', 'Configuration templates — save, apply, share', 'Todo', 'Story',
 'Save current config as template. Apply to new workspace. Internal library + customer-shareable.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 8, 'HIGH', NOW()),
('WRK-1702', 'Configuration versioning — every change creates a version, diff view, rollback', 'Todo', 'Story',
 'Every config change creates a version. Diff view. Roll back to any prior version.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 8, 'HIGH', NOW()),
('WRK-1703', 'Sandbox mode — test config changes before promoting to production', 'Todo', 'Story',
 'Preview workspace where config changes are tested before promotion. Realistic test data.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 8, 'HIGH', NOW()),
('WRK-1704', 'Config impact analysis — preview what existing data will be affected', 'Todo', 'Story',
 'Before applying: Affects 47 items, 3 users, 2 automations. Continue?',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 5, 'HIGH', NOW()),
('WRK-1705', 'Config import/export — JSON/YAML, source-control friendly', 'Todo', 'Story',
 'Move config between workspaces as JSON/YAML. Backup. Source-control friendly.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 5, 'MEDIUM', NOW()),
('WRK-1706', 'Dogfood: create Utility Customer Workspace Template from WORKS config', 'Todo', 'Task',
 'Eat our own dogfood — export WORKS project config as the first customer onboarding template.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 2, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 18 — Mobile + Real-time + Performance (Cap S)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E35', 'Epic: Iteration 18 — Mobile + Real-time + Performance', 'Todo', 'Epic',
 'Works is a fully modern 2026 product — every device, real-time collaborative, performant. Est 8–10 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 100, 'HIGH', NOW()),

('WRK-1800', 'Native iOS app — Swift, push notifications, biometric auth, offline drafts', 'Todo', 'Story',
 'Swift-based. Push notifications, biometric auth, offline drafts with sync on reconnect.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 21, 'HIGH', NOW()),
('WRK-1801', 'Native Android app — Kotlin, Material Design 3, feature parity', 'Todo', 'Story',
 'Kotlin-based. Feature parity with iOS. Material Design 3.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 21, 'HIGH', NOW()),
('WRK-1802', 'Mobile-optimized PWA — offline via service worker', 'Todo', 'Story',
 'Responsive PWA — works without app install. Service worker for offline.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 8, 'MEDIUM', NOW()),
('WRK-1803', 'Real-time co-presence — live cursors, simultaneous editing', 'Todo', 'Story',
 'Live cursors, simultaneous editing without conflicts. WebSocket-based. <1 second propagation.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 13, 'HIGH', NOW()),
('WRK-1804', 'Offline mode — read/create drafts offline, sync on reconnect', 'Todo', 'Story',
 'Offline drafts saved to device. Sync on reconnect with conflict resolution UI.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 8, 'HIGH', NOW()),
('WRK-1805', 'Command palette Cmd-K — fuzzy search all actions, items, people', 'Todo', 'Story',
 'Comprehensive fuzzy search across all actions, items, people.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 5, 'MEDIUM', NOW()),
('WRK-1806', 'Performance SLAs — P95 targets met, monitoring, CI regressions caught', 'Todo', 'Story',
 'P95 page load <800ms, work item creation <300ms. Performance monitored in CI.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 8, 'HIGH', NOW()),
('WRK-1807', 'Observability — OpenTelemetry, structured logs, in-product status page', 'Todo', 'Story',
 'OpenTelemetry tracing. Structured JSON logs with correlation IDs. In-product status page.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 5, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 19 — Enterprise Security + Compliance Certifications (Cap T)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E36', 'Epic: Iteration 19 — Enterprise Security + Compliance Certifications', 'Todo', 'Epic',
 'Works meets enterprise security bar — SOC 2 Type 2 + ISO 27001 earned. Est 8–10 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 100, 'HIGH', NOW()),

('WRK-1900', 'Passkeys (WebAuthn) — phishing-resistant auth', 'Todo', 'Story',
 'Phishing-resistant auth. Replaces password for security-conscious organizations.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 8, 'HIGH', NOW()),
('WRK-1901', 'Conditional access policies — IP allowlist, device, geo, time-of-day', 'Todo', 'Story',
 'IP allowlist, device requirements, geo restrictions, time-of-day. Per-workspace and per-role.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 8, 'HIGH', NOW()),
('WRK-1902', 'Append-only audit log with cryptographic chain — tamper-evident', 'Todo', 'Story',
 'Every event immutable. Cryptographic chain. Tamper-evident. Streaming to external SIEM.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 8, 'HIGH', NOW()),
('WRK-1903', 'Data residency options — India, EU, US regions', 'Todo', 'Story',
 'Workspace stored in customer-chosen region. Regulatory compliance for utility customers.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 8, 'HIGH', NOW()),
('WRK-1904', 'Encryption at rest with BYOK — customer-managed keys via AWS KMS', 'Todo', 'Story',
 'AES-256 with customer-managed keys option. Customer provides KMS key.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 8, 'HIGH', NOW()),
('WRK-1905', 'AI anomaly detection on access patterns — new geo, mass export, escalation', 'Todo', 'Story',
 'AI flags unusual patterns. Threshold-based fallback when AI is off.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 5, 'HIGH', NOW()),
('WRK-1906', 'GDPR / DPDP data export and right to be forgotten', 'Todo', 'Story',
 'Per-user data export for data subject access requests. Right to be forgotten with audit preservation.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 5, 'HIGH', NOW()),
('WRK-1907', 'Annual penetration test program + bug bounty launch', 'Todo', 'Story',
 'Third-party pen tests. Results under NDA. Continuous internal red-teaming.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 5, 'HIGH', NOW()),
('WRK-1908', 'SOC 2 Type 2 and ISO 27001 certification', 'Todo', 'Story',
 'Earned this iteration. Required for enterprise sales. Compliance evidence package auto-generated.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 13, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 20 — Polish, Advanced AI & Marketplace Foundation
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-E37', 'Epic: Iteration 20 — Polish, Advanced AI & Marketplace Foundation', 'Todo', 'Epic',
 'Works is commercially complete — enterprise, international, third-party ecosystem, fully accessible. Est 10–14 weeks.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 130, 'HIGH', NOW()),

('WRK-2000', 'Multi-step AI agents — complex tasks across capabilities', 'Todo', 'Story',
 'Agents complete complex tasks: Triage all P0 customer requests from last 24 hours across capabilities.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 21, 'HIGH', NOW()),
('WRK-2001', 'Custom AI assistants — workspace-defined personas', 'Todo', 'Story',
 'Workspace-defined assistants: BCITS Compliance Assistant, AMR Domain Expert with workspace-specific system prompts.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 13, 'HIGH', NOW()),
('WRK-2002', 'AI memory and context across sessions', 'Todo', 'Story',
 'AI remembers conversation context, preferences, workspace history across sessions. Long context.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 8, 'MEDIUM', NOW()),
('WRK-2003', 'App marketplace foundation — third-party extensions, listing infra, permission scoping', 'Todo', 'Story',
 'Third-party extensions installable to a workspace. Listing infrastructure. Permission scoping.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 13, 'MEDIUM', NOW()),
('WRK-2004', 'Developer portal — SDK, documentation, sandbox for third-party developers', 'Todo', 'Story',
 'Documentation, SDK, sandbox for third-party developers to build Works extensions.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 13, 'MEDIUM', NOW()),
('WRK-2005', 'Conversational dashboards from natural language', 'Todo', 'Story',
 'Show velocity per team, last 6 sprints → dashboard built from natural language.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 8, 'HIGH', NOW()),
('WRK-2006', 'WCAG 2.2 AA full accessibility audit and remediation', 'Todo', 'Story',
 'Full audit, screen reader optimization, keyboard-only navigation for every feature.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 8, 'HIGH', NOW()),
('WRK-2007', 'Localization — 10+ languages including Hindi, Spanish, French', 'Todo', 'Story',
 'UI in English, Hindi, Spanish, French, German, Portuguese, Japanese, Mandarin, Arabic, Korean.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 8, 'MEDIUM', NOW()),
('WRK-2008', 'Final security hardening — static/dynamic analysis, pen test, bug bounty', 'Todo', 'Task',
 'Static + dynamic analysis, pen test, bug bounty launch, security disclosure policy.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 8, 'HIGH', NOW()),
('WRK-2009', 'Customer chat support — real-time chat with AI tier-1 + human escalation', 'Todo', 'Story',
 'Real-time chat on customer portal with AI tier-1 + human escalation.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 8, 'MEDIUM', NOW()),
('WRK-2010', 'Performance hardening final — P95 targets at 10x scale, query optimization', 'Todo', 'Task',
 'P95 targets met across all operations. Load testing at 10x scale.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 5, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ARCHITECTURE & TECH STACK WORK ITEMS (from doc 07)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

-- Tech stack decisions as tasks in current sprint
('WRK-ARCH-01', 'Architecture: confirm Angular vs React with BCITS engineering leadership', 'Todo', 'Task',
 'Critical unconfirmed choice — Java/Spring Boot confirmed, Angular vs React not confirmed. Block frontend work until resolved.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 2, 'HIGH', NOW()),
('WRK-ARCH-02', 'Architecture: migrate from com.example.demo to com.bcits.works package structure', 'Todo', 'Task',
 'Restructure to com.bcits.works.{auth, workitem, sprint, project, workspace, compliance, sla, ai, audit}.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 5, 'HIGH', NOW()),
('WRK-ARCH-03', 'Architecture: add jOOQ for complex reporting queries', 'Todo', 'Task',
 'Spring Data JPA for standard CRUD; add jOOQ for BQL translation and complex dashboard queries.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 5, 'MEDIUM', NOW()),
('WRK-ARCH-04', 'Architecture: OpenTelemetry tracing across all Spring services', 'Todo', 'Task',
 'Distributed tracing via OpenTelemetry. Structured JSON logging with correlation IDs.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 5, 'HIGH', NOW()),
('WRK-ARCH-05', 'Architecture: event log partitioning by time at scale', 'Todo', 'Task',
 'PostgreSQL table partitioning for event_log when it grows large. Partition by occurred_at month.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 5, 'MEDIUM', NOW()),
('WRK-ARCH-06', 'Architecture: introduce RabbitMQ for async AI jobs and webhooks', 'Todo', 'Task',
 'Async processing for AI calls, bulk ops, scheduled reports. Start with RabbitMQ; Kafka at scale.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 5, 'HIGH', NOW()),
('WRK-ARCH-07', 'Architecture: add read replicas for dashboard/report queries', 'Todo', 'Task',
 'AWS RDS read replicas when dashboards/reports strain the primary. Route read-heavy queries to replicas.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 5, 'MEDIUM', NOW()),
('WRK-ARCH-08', 'Architecture: AWS S3 for attachments — replace local file storage', 'Todo', 'Task',
 'Current: ~/.bsmart-works/uploads (local). Replace with AWS S3 with lifecycle tiering.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 5, 'HIGH', NOW()),
('WRK-ARCH-09', 'Architecture: Redis (AWS ElastiCache) for AI response caching and sessions', 'Todo', 'Task',
 'Session cache, rate limiting, AI response caching (~40% reduction), hot dashboards.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 5, 'HIGH', NOW()),
('WRK-ARCH-10', 'Architecture: Terraform IaC for all AWS infrastructure', 'Todo', 'Task',
 'Infrastructure as code for ECS Fargate, RDS, ElastiCache, S3, CloudFront, Secrets Manager.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 8, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- BUGS — Known gaps and issues requiring fixes
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-BUG-01', 'Bug: No optimistic concurrency on work item updates — silent overwrites possible', 'Todo', 'Bug',
 'Two users editing same item simultaneously will silently overwrite each other. Need version field + 409 conflict response.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 8, 'HIGH', NOW()),
('WRK-BUG-02', 'Bug: App.jsx is a single monolithic file — 1800+ lines violating SRP', 'Todo', 'Bug',
 'All views, components, state management in one file. Causes merge conflicts and makes AI-assisted editing unreliable.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 8, 'MEDIUM', NOW()),
('WRK-BUG-03', 'Bug: Local file storage (uploads/) breaks in multi-instance deployment', 'Todo', 'Bug',
 'Current file uploads go to ~/.bsmart-works/uploads — not shared across ECS instances. Must migrate to S3.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 5, 'HIGH', NOW()),
('WRK-BUG-04', 'Bug: No rate limiting on auth endpoints — brute force vulnerability', 'Todo', 'Bug',
 'Login and signup have no rate limiting. Add Spring Security rate limiting filter or use API Gateway throttling.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 5, 'HIGH', NOW()),
('WRK-BUG-05', 'Bug: BQL not yet implemented — filter builder uses raw SQL', 'Todo', 'Bug',
 'Filters currently use direct SQL construction. Must refactor to BQL parser before iteration 7 compliance rules.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 13, 'HIGH', NOW()),
('WRK-BUG-06', 'Bug: Event store not called on all state changes — compliance audit gaps', 'Todo', 'Bug',
 'EventService.record() called on work item create but not on all updates. Compliance audit log will have gaps.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 5, 'HIGH', NOW()),
('WRK-BUG-07', 'Bug: No input validation on BQL/filter parameters — SQL injection risk', 'Todo', 'Bug',
 'Filter parameters passed through without sanitization. Must use parameterized queries everywhere.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 5, 'CRITICAL', NOW()),
('WRK-BUG-08', 'Bug: Password reset does not expire tokens — security gap', 'Todo', 'Bug',
 'Reset tokens have no expiry check. Add expiry_at to reset token and validate on use.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 3, 'HIGH', NOW()),
('WRK-BUG-09', 'Bug: Sprint capacity bar counts ALL items, not just committed story points', 'Todo', 'Bug',
 'Capacity bar sums all item story_points in sprint. Should sum only committed (non-blocked) items.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 2, 'MEDIUM', NOW()),
('WRK-BUG-10', 'Bug: Dark mode does not persist on hard refresh', 'Todo', 'Bug',
 'Dark mode is class-toggled on document.documentElement but not restored from localStorage on initial load.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 1, 'LOW', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- SUB-TASKS — for critical iteration 1 stories (detailed implementation)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, parent_id, created_at) VALUES

-- Sub-tasks for WRK-1000 (AI Orchestration service)
('WRK-ST-1001', 'Sub-task: AiOrchestrationService — intent detection method', 'Todo', 'Sub-task',
 'AiOrchestrationService.detectIntent(String input) — calls Anthropic API, returns intent + entities.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 3, 'HIGH', 'WRK-1000', NOW()),
('WRK-ST-1002', 'Sub-task: AiOrchestrationService — plan generation method', 'Todo', 'Sub-task',
 'AiOrchestrationService.generatePlan(intent, entities) — returns ordered list of actions to be confirmed.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 3, 'HIGH', 'WRK-1000', NOW()),
('WRK-ST-1003', 'Sub-task: AiOrchestrationService — deterministic execution method', 'Todo', 'Sub-task',
 'AiOrchestrationService.executePlan(confirmedPlan) — runs each step deterministically, no AI involved.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 3, 'HIGH', 'WRK-1000', NOW()),

-- Sub-tasks for WRK-700 (Compliance rule definition)
('WRK-ST-701', 'Sub-task: ComplianceRuleEntity + Flyway migration V7xx', 'Todo', 'Sub-task',
 'ComplianceRule JPA entity, compliance_rule table migration, ComplianceRuleRepository.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 2, 'HIGH', 'WRK-700', NOW()),
('WRK-ST-702', 'Sub-task: BQL rule evaluator — parse and run rules against work items', 'Todo', 'Sub-task',
 'ComplianceRuleEvaluator.evaluate(rule, workItem) — returns ViolationDTO or null.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 5, 'HIGH', 'WRK-700', NOW()),
('WRK-ST-703', 'Sub-task: Rule evaluation trigger — on every WorkItem state change event', 'Todo', 'Sub-task',
 'Spring ApplicationEventListener on WorkItemChanged event → triggers continuous rule evaluation.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER7', 3, 'HIGH', 'WRK-700', NOW()),

-- Sub-tasks for WRK-300 (Workflow editor)
('WRK-ST-301', 'Sub-task: WorkflowEntity + WorkflowStatusEntity + WorkflowTransitionEntity', 'Todo', 'Sub-task',
 'JPA entities for workflow domain. Flyway V3xx migrations.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 3, 'HIGH', 'WRK-300', NOW()),
('WRK-ST-302', 'Sub-task: Transition guard — enforce conditions server-side', 'Todo', 'Sub-task',
 'WorkflowTransitionGuard checks: only-assignee-can-resolve, AC-required, etc. Called in WorkItemService.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 3, 'HIGH', 'WRK-300', NOW()),
('WRK-ST-303', 'Sub-task: Frontend drag-drop workflow editor with React DnD', 'Todo', 'Sub-task',
 'Visual drag-drop status nodes. Add/remove transitions. Save triggers PUT /api/workflows/{id}.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER3', 5, 'HIGH', 'WRK-300', NOW()),

-- Sub-tasks for WRK-1401 (VS Code extension)
('WRK-ST-1401', 'Sub-task: VS Code extension — scaffold with vsce, authenticate to Works API', 'Todo', 'Sub-task',
 'vsce init, Works API client in TypeScript, OAuth device flow for auth.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 3, 'HIGH', 'WRK-1401', NOW()),
('WRK-ST-1402', 'Sub-task: VS Code extension — sidebar work item context panel', 'Todo', 'Sub-task',
 'TreeView showing current item description, AC checklist, recent comments, status dropdown.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'HIGH', 'WRK-1401', NOW()),
('WRK-ST-1403', 'Sub-task: VS Code extension — commit message work item key auto-detection', 'Todo', 'Sub-task',
 'Detect WRK-NNNN pattern in git commit. Auto-link to work item via POST /api/work-items/{id}/commits.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 3, 'HIGH', 'WRK-1401', NOW()),

-- Sub-tasks for WRK-BUG-01 (optimistic concurrency)
('WRK-ST-B01', 'Sub-task: Add @Version field to WorkItem JPA entity', 'Todo', 'Sub-task',
 '@Version Long version; on WorkItem entity. Hibernate handles optimistic locking automatically.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 1, 'HIGH', 'WRK-BUG-01', NOW()),
('WRK-ST-B02', 'Sub-task: Return 409 on OptimisticLockingFailureException', 'Todo', 'Sub-task',
 'GlobalExceptionHandler catches OptimisticLockingFailureException → 409 Conflict with stale version details.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 2, 'HIGH', 'WRK-BUG-01', NOW()),
('WRK-ST-B03', 'Sub-task: Frontend conflict modal — show stale vs current, allow refresh or force', 'Todo', 'Sub-task',
 'On 409 response, show modal: Your version vs Current version. Refresh or Force Save.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 3, 'HIGH', 'WRK-BUG-01', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- WORK ITEM LINKS — strategic connections across the backlog
-- ============================================================
INSERT INTO work_item_links (source_id, target_id, link_type, created_at) VALUES

-- Capability epics → Iteration epics (parent/child)
('WRK-CA',  'WRK-E20', 'RELATES_TO', NOW()),
('WRK-CC',  'WRK-E20', 'RELATES_TO', NOW()),
('WRK-CD',  'WRK-E20', 'RELATES_TO', NOW()),
('WRK-CE',  'WRK-E20', 'RELATES_TO', NOW()),

-- Blocking dependencies across iterations
('WRK-E20',  'WRK-E21', 'BLOCKS', NOW()),  -- Iter 3 must precede Iter 4
('WRK-E21',  'WRK-E22', 'BLOCKS', NOW()),
('WRK-E22',  'WRK-E23', 'BLOCKS', NOW()),
('WRK-E23',  'WRK-E24', 'BLOCKS', NOW()),
('WRK-E24',  'WRK-E25', 'BLOCKS', NOW()),
('WRK-E27',  'WRK-E28', 'BLOCKS', NOW()),  -- AI Control Plane before AI Expansion

-- BQL blocks compliance
('WRK-320',  'WRK-700', 'BLOCKS', NOW()),  -- BQL must exist before compliance rules use it
('WRK-320',  'WRK-800', 'BLOCKS', NOW()),  -- BQL scope used in SLA policies too

-- SLA engine precedes customer portal
('WRK-E25',  'WRK-E26', 'BLOCKS', NOW()),

-- AI Control Plane blocks all AI features
('WRK-1002', 'WRK-1100', 'BLOCKS', NOW()),
('WRK-1002', 'WRK-1103', 'BLOCKS', NOW()),
('WRK-1002', 'WRK-1104', 'BLOCKS', NOW()),

-- Architecture decisions relate to implementation
('WRK-ARCH-01', 'WRK-1800', 'BLOCKS', NOW()),  -- Must confirm Angular/React before mobile
('WRK-ARCH-08', 'WRK-BUG-03', 'RELATES_TO', NOW()),

-- Bug fixes relating to security epics
('WRK-BUG-01', 'WRK-E17',  'RELATES_TO', NOW()),
('WRK-BUG-04', 'WRK-E17',  'RELATES_TO', NOW()),
('WRK-BUG-07', 'WRK-E17',  'RELATES_TO', NOW()),

-- Compliance engine uses event store
('WRK-CA',     'WRK-CK',   'RELATES_TO', NOW()),

-- Sub-task parent links
('WRK-ST-1001', 'WRK-1000', 'PARENT', NOW()),
('WRK-ST-1002', 'WRK-1000', 'PARENT', NOW()),
('WRK-ST-1003', 'WRK-1000', 'PARENT', NOW()),
('WRK-ST-701',  'WRK-700',  'PARENT', NOW()),
('WRK-ST-702',  'WRK-700',  'PARENT', NOW()),
('WRK-ST-703',  'WRK-700',  'PARENT', NOW()),
('WRK-ST-301',  'WRK-300',  'PARENT', NOW()),
('WRK-ST-302',  'WRK-300',  'PARENT', NOW()),
('WRK-ST-303',  'WRK-300',  'PARENT', NOW()),
('WRK-ST-1401', 'WRK-1401', 'PARENT', NOW()),
('WRK-ST-1402', 'WRK-1401', 'PARENT', NOW()),
('WRK-ST-1403', 'WRK-1401', 'PARENT', NOW()),
('WRK-ST-B01',  'WRK-BUG-01', 'PARENT', NOW()),
('WRK-ST-B02',  'WRK-BUG-01', 'PARENT', NOW()),
('WRK-ST-B03',  'WRK-BUG-01', 'PARENT', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- TAGS — categorize items across the backlog
-- ============================================================
INSERT INTO tags (work_item_id, tag) VALUES

-- Architecture tags
('WRK-ARCH-01', 'architecture'), ('WRK-ARCH-01', 'decision'),
('WRK-ARCH-02', 'architecture'), ('WRK-ARCH-02', 'refactor'),
('WRK-ARCH-03', 'architecture'), ('WRK-ARCH-03', 'database'),
('WRK-ARCH-08', 'architecture'), ('WRK-ARCH-08', 'cloud'), ('WRK-ARCH-08', 'aws'),
('WRK-ARCH-10', 'architecture'), ('WRK-ARCH-10', 'infrastructure'), ('WRK-ARCH-10', 'terraform'),

-- AI tags
('WRK-1000', 'ai'), ('WRK-1000', 'claude-api'),
('WRK-1002', 'ai'), ('WRK-1002', 'ai-control-plane'), ('WRK-1002', 'v35'),
('WRK-1003', 'ai'), ('WRK-1003', 'cost-control'),
('WRK-1100', 'ai'), ('WRK-1100', 'conversational'),
('WRK-1104', 'ai'), ('WRK-1104', 'rag'), ('WRK-1104', 'knowledge'),
('WRK-2000', 'ai'), ('WRK-2000', 'agents'),

-- Security tags
('WRK-BUG-04', 'security'), ('WRK-BUG-04', 'auth'),
('WRK-BUG-07', 'security'), ('WRK-BUG-07', 'P0'), ('WRK-BUG-07', 'sql-injection'),
('WRK-BUG-08', 'security'), ('WRK-BUG-08', 'auth'),
('WRK-1900', 'security'), ('WRK-1900', 'passkeys'),
('WRK-1904', 'security'), ('WRK-1904', 'encryption'), ('WRK-1904', 'byok'),
('WRK-1908', 'security'), ('WRK-1908', 'compliance'), ('WRK-1908', 'soc2'),

-- Dogfood tags
('WRK-409',  'dogfood'), ('WRK-507', 'dogfood'), ('WRK-607', 'dogfood'),
('WRK-708',  'dogfood'), ('WRK-806', 'dogfood'), ('WRK-1009', 'dogfood'),
('WRK-1206', 'dogfood'), ('WRK-1409', 'dogfood'), ('WRK-1516', 'dogfood'),
('WRK-1706', 'dogfood'),

-- New v3.5 capabilities
('WRK-CZ', 'v35'), ('WRK-CZ', 'ai-control-plane'),
('WRK-CU', 'v35'), ('WRK-CU', 'developer'),
('WRK-CV', 'v35'), ('WRK-CV', 'scrum-master'),
('WRK-CW', 'v35'), ('WRK-CW', 'product-owner'),
('WRK-CX', 'v35'), ('WRK-CX', 'leadership'),
('WRK-CY', 'v35'), ('WRK-CY', 'admin'),

-- BCITS utility domain
('WRK-332',  'utility'), ('WRK-332', 'bcits-domain'),
('WRK-1109', 'hindi'), ('WRK-1109', 'localization'),

-- Compliance and regulatory
('WRK-CK', 'compliance'), ('WRK-CK', 'differentiator'),
('WRK-700', 'compliance'), ('WRK-702', 'compliance'),
('WRK-1908', 'iso27001'), ('WRK-1902', 'audit')

ON CONFLICT DO NOTHING;


-- ============================================================
-- SUMMARY COMMENT — for the record
-- ============================================================
-- This seed (V10) adds to V8's foundation:
--
-- Iterations added:   3 – 20  (18 future sprints)
-- Capability Epics:   26      (Cap A–T + Z, U–Y)
-- Iteration Epics:    18      (WRK-E20 through WRK-E37)
-- Stories:            ~90
-- Tasks:              ~30
-- Sub-tasks:          ~18
-- Bugs:               10
-- Architecture items: 10
-- Dogfood tasks:      10      (one per iteration — we use Works to build Works)
--
-- Principle: Every iteration has a "Dogfood" task ensuring the team
-- uses the feature being built to track its own work. If the dogfood
-- task feels wrong to do, the feature isn't ready to ship.
-- ============================================================
