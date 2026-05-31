-- ============================================================
-- V8: Seed Data — bSmart Works tracks itself
-- "Eat your own dogfood" — the app's own development is tracked in the app
-- ============================================================

-- ---- USERS ----
-- Remove legacy users that conflict with canonical seed IDs (CASCADE deletes workspace_members)
-- projects.lead_user_id references are updated first to avoid FK issues
UPDATE projects SET lead_user_id = NULL WHERE lead_user_id IN (
  SELECT id FROM users WHERE email = 'deepak@bcits.com' AND id != 'USR-DEV1'
);
UPDATE work_items SET assignee_id = NULL WHERE assignee_id IN (
  SELECT id FROM users WHERE email IN ('deepak@bcits.com', 'akpdeepak@bcits.com') AND id NOT IN ('USR-DEV1', 'USR-DEV2')
);
UPDATE work_items SET created_by = NULL WHERE created_by IN (
  SELECT id FROM users WHERE email IN ('deepak@bcits.com', 'akpdeepak@bcits.com') AND id NOT IN ('USR-DEV1', 'USR-DEV2')
);
DELETE FROM saved_filters WHERE created_by IN (
  SELECT id FROM users WHERE email IN ('deepak@bcits.com', 'akpdeepak@bcits.com') AND id NOT IN ('USR-DEV1', 'USR-DEV2')
);
DELETE FROM notifications WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('deepak@bcits.com', 'akpdeepak@bcits.com') AND id NOT IN ('USR-DEV1', 'USR-DEV2')
);
-- Delete old users (workspace_members cascades automatically)
DELETE FROM users WHERE email = 'deepak@bcits.com' AND id != 'USR-DEV1';
DELETE FROM users WHERE email = 'akpdeepak@bcits.com' AND id != 'USR-DEV2';

-- Deepak (Owner/Product), Akp (Dev Account)
INSERT INTO users (id, email, password_hash, full_name, avatar_color, timezone) VALUES
    ('USR-DEV1', 'deepak@bcits.com',        '$2a$10$placeholder_bcrypt_hash_1', 'Deepak Pandey',   '#0B2F5C', 'Asia/Kolkata'),
    ('USR-DEV2', 'akpdeepak@bcits.com',     '$2a$10$placeholder_bcrypt_hash_2', 'AKP Dev Account', '#E94E1B', 'Asia/Kolkata')
ON CONFLICT (id) DO NOTHING;

-- ---- WORKSPACE ----
INSERT INTO workspace_members (workspace_id, user_id, system_role, role_id) VALUES
    ('WS-001', 'USR-DEV1', 'OWNER',  'OWNER'),
    ('WS-001', 'USR-DEV2', 'ADMIN',  'ADMIN')
ON CONFLICT DO NOTHING;

-- ---- PROJECT: bSmart Works ----
INSERT INTO projects (id, workspace_id, name, key_prefix, description, lead_user_id, created_at) VALUES
    ('PROJ-WORKS', 'WS-001', 'bSmart Works', 'WRK',
     'AI-native project workspace for BCITS — tracking its own development',
     'USR-DEV1', NOW() - INTERVAL '30 days')
ON CONFLICT DO NOTHING;

INSERT INTO project_members (project_id, user_id, role) VALUES
    ('PROJ-WORKS', 'USR-DEV1', 'LEAD'),
    ('PROJ-WORKS', 'USR-DEV2', 'MEMBER')
ON CONFLICT DO NOTHING;

-- ---- SPRINTS ----
INSERT INTO sprints (id, project_id, name, goal, status, start_date, end_date, capacity, created_at) VALUES
    ('SPR-ITER1', 'PROJ-WORKS', 'Sprint 1 — Iteration 1 MVP',
     'Ship a working Kanban PM tool the BCITS team can adopt as their daily tool',
     'COMPLETED',
     CURRENT_DATE - INTERVAL '28 days',
     CURRENT_DATE - INTERVAL '14 days',
     120,
     NOW() - INTERVAL '30 days'),
    ('SPR-ITER2', 'PROJ-WORKS', 'Sprint 2 — Iteration 2 Sprints & Scrum',
     'Add backlog, sprints, swimlanes, reports — replace Excel sprint planning',
     'COMPLETED',
     CURRENT_DATE - INTERVAL '13 days',
     CURRENT_DATE - INTERVAL '1 day',
     80,
     NOW() - INTERVAL '14 days'),
    ('SPR-FIXES', 'PROJ-WORKS', 'Sprint 3 — Security, Quality & Architecture',
     'Fix all P0/P1 issues, enforce RBAC, modularize backend, seed dogfood data',
     'ACTIVE',
     CURRENT_DATE,
     CURRENT_DATE + INTERVAL '14 days',
     60,
     NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- EPICS
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES
    ('WRK-E01', 'Epic: Authentication & Identity', 'Done', 'Epic',
     'Email+password auth, JWT sessions, BCrypt passwords, password reset, MFA foundation',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 13, 'HIGH', NOW() - INTERVAL '29 days'),
    ('WRK-E02', 'Epic: Workspace & Members Management', 'Done', 'Epic',
     'Multi-tenant workspaces, member invite/remove, workspace switcher, settings',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 8, 'HIGH', NOW() - INTERVAL '29 days'),
    ('WRK-E03', 'Epic: Work Items — Core CRUD', 'Done', 'Epic',
     '7 item types, CRUD with rich fields, Kanban board, drag-drop, density modes',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 21, 'HIGH', NOW() - INTERVAL '28 days'),
    ('WRK-E04', 'Epic: Collaboration — Comments & Notifications', 'Done', 'Epic',
     'Threaded comments, @mentions, internal flag, in-app notifications, preferences',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 13, 'MEDIUM', NOW() - INTERVAL '27 days'),
    ('WRK-E05', 'Epic: Search & Discovery', 'Done', 'Epic',
     'Full-text search, debounced, recent boosts, type-ahead results',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 5, 'MEDIUM', NOW() - INTERVAL '26 days'),
    ('WRK-E06', 'Epic: My Works & Personal Home', 'Done', 'Epic',
     'Assigned items, mentions tab, recent activity, personal workspace view',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 8, 'MEDIUM', NOW() - INTERVAL '25 days'),
    ('WRK-E07', 'Epic: Projects — Structure & Archive', 'Done', 'Epic',
     'Project containers, key prefix, lead, members, archive, progress bars',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 8, 'MEDIUM', NOW() - INTERVAL '24 days'),
    ('WRK-E08', 'Epic: Event Store & Audit Foundation', 'Done', 'Epic',
     'Append-only event log, activity log per item, event types, history reconstruction',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 8, 'HIGH', NOW() - INTERVAL '23 days'),
    ('WRK-E09', 'Epic: Attachments & File Management', 'Done', 'Epic',
     'File upload, local storage, MIME type detection, delete, size display',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 5, 'LOW', NOW() - INTERVAL '22 days'),
    ('WRK-E10', 'Epic: Work Item Links & Relationships', 'Done', 'Epic',
     'BLOCKS, BLOCKED_BY, RELATES_TO, DUPLICATES, PARENT/CHILD link types',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 8, 'MEDIUM', NOW() - INTERVAL '21 days'),
    ('WRK-E11', 'Epic: Sprints & Scrum Board', 'Done', 'Epic',
     'Sprint lifecycle PLANNING→ACTIVE→COMPLETED, sprint board, capacity tracking',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER2', 21, 'HIGH', NOW() - INTERVAL '13 days'),
    ('WRK-E12', 'Epic: Backlog Management', 'Done', 'Epic',
     'Drag-drop reorder, refinement mode, story points, priority, move to sprint',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER2', 13, 'HIGH', NOW() - INTERVAL '12 days'),
    ('WRK-E13', 'Epic: Sprint Reports & Analytics', 'Done', 'Epic',
     'KPI cards, burndown/delivery chart, velocity, item outcomes table',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER2', 13, 'MEDIUM', NOW() - INTERVAL '10 days'),
    ('WRK-E14', 'Epic: Filters — Quick, Saved, Swimlanes', 'Done', 'Epic',
     'Quick filter chips, saved named filters, swimlanes by assignee/type/priority',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER2', 8, 'MEDIUM', NOW() - INTERVAL '8 days'),
    ('WRK-E15', 'Epic: Design System & Brand', 'Done', 'Epic',
     'Tailwind tokens, Button/StatusBadge/Logo components, Inter font, dark mode, PWA assets',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 8, 'MEDIUM', NOW() - INTERVAL '20 days'),
    ('WRK-E16', 'Epic: Security — P0 Fixes', 'Done', 'Epic',
     'BCrypt migration, JWT verification filter, UUID IDs, global CORS, error handling',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 13, 'CRITICAL', NOW() - INTERVAL '2 days'),
    ('WRK-E17', 'Epic: RBAC & Tier Access Control', 'In Progress', 'Epic',
     'Roles (VIEWER/MEMBER/LEAD/ADMIN/OWNER), permission matrix, tier-based feature gating',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 21, 'HIGH', NOW()),
    ('WRK-E18', 'Epic: Architecture — Modular Monolith', 'In Progress', 'Epic',
     'Domain package restructure, service layer separation, clear API boundaries',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 13, 'HIGH', NOW()),
    ('WRK-E19', 'Epic: UI/UX — Professional Polish', 'In Progress', 'Epic',
     'Dashboard home, role-based UI, visual hierarchy, data-driven decision surfaces',
     'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 21, 'HIGH', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- STORIES & TASKS — Sprint 1 (Iteration 1 MVP)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, assignee_id, created_by, sprint_id, story_points, priority, created_at) VALUES

-- Auth stories
('WRK-001', 'Implement email + password signup', 'Done', 'Story',
 'POST /api/v1/auth/signup with validation, duplicate check, password hash, JWT response',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 5, 'HIGH', NOW() - INTERVAL '29 days'),
('WRK-002', 'Implement login with JWT token', 'Done', 'Story',
 'POST /api/v1/auth/login — verify credentials, return JWT + user object',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 3, 'HIGH', NOW() - INTERVAL '29 days'),
('WRK-003', 'Forgot password / reset password flow', 'Done', 'Story',
 'Forgot password endpoint, reset endpoint, frontend form with back to login',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 3, 'MEDIUM', NOW() - INTERVAL '28 days'),
('WRK-004', 'JWT session persistence in localStorage', 'Done', 'Task',
 'Store token + user in bSmartSession, restore on page reload, logout clears',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 2, 'HIGH', NOW() - INTERVAL '28 days'),

-- Workspace stories
('WRK-010', 'Workspace switcher dropdown in sidebar', 'Done', 'Story',
 'Click workspace name → dropdown with workspaces list, settings link, active checkmark',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 3, 'MEDIUM', NOW() - INTERVAL '27 days'),
('WRK-011', 'Workspace members — invite by email', 'Done', 'Story',
 'POST /api/v1/workspaces/{id}/members with email + role, UI in settings page',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 3, 'MEDIUM', NOW() - INTERVAL '26 days'),
('WRK-012', 'Workspace members — remove member', 'Done', 'Task',
 'DELETE endpoint + remove button in settings (cannot remove self)',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 2, 'LOW', NOW() - INTERVAL '26 days'),

-- Work Item stories
('WRK-020', '7 built-in work item types with icons + colors', 'Done', 'Story',
 'Task ✓, Story 📖, Bug 🐛, Epic ⚡, Sub-task ↳, Incident 🔥, Service Request 🎫',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 3, 'HIGH', NOW() - INTERVAL '28 days'),
('WRK-021', 'Work item CRUD — full field set', 'Done', 'Story',
 'Title, description, status, type, assignee, due date, tags, priority, story points',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 8, 'HIGH', NOW() - INTERVAL '27 days'),
('WRK-022', 'Kanban board with drag-drop status change', 'Done', 'Story',
 'Three columns Todo/In Progress/Done, optimistic UI, revert on failure',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 5, 'HIGH', NOW() - INTERVAL '26 days'),
('WRK-023', 'Board density modes — compact/comfortable/spacious', 'Done', 'Story',
 'Toggle in board header, user preference persists in state',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 2, 'LOW', NOW() - INTERVAL '24 days'),
('WRK-024', 'Delete work item with cascade cleanup', 'Done', 'Task',
 'Delete tags, comments, links, attachments before deleting item. Confirmation dialog.',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 3, 'MEDIUM', NOW() - INTERVAL '23 days'),
('WRK-025', 'Work item detail panel — tabbed layout', 'Done', 'Story',
 'Details / Comments / Links / Files / Activity tabs, 500px side panel',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 5, 'MEDIUM', NOW() - INTERVAL '22 days'),

-- Comments + Notifications
('WRK-030', 'Comments with @mention detection', 'Done', 'Story',
 '@name triggers user dropdown, inserts mention, backend sends notification',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 5, 'MEDIUM', NOW() - INTERVAL '25 days'),
('WRK-031', 'Comment internal-only flag', 'Done', 'Task',
 'Checkbox on composer, yellow highlight on internal comments, backend stores flag',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 2, 'LOW', NOW() - INTERVAL '24 days'),
('WRK-032', 'In-app notifications + unread count badge', 'Done', 'Story',
 'Orange badge on bell icon, mark-read per item and mark-all-read',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 5, 'HIGH', NOW() - INTERVAL '23 days'),
('WRK-033', 'Notification preferences per user', 'Done', 'Story',
 'Toggle assign/comment/mention/digest in workspace settings',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 3, 'LOW', NOW() - INTERVAL '21 days'),

-- Search, My Works, Activity
('WRK-040', 'Debounced full-text search', 'Done', 'Story',
 '300ms debounce, searches title + description, dropdown results with type badge',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 3, 'MEDIUM', NOW() - INTERVAL '22 days'),
('WRK-041', 'My Works — assigned items tab', 'Done', 'Story',
 'Personal view filtered to current user assigned items with status + due date',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 3, 'MEDIUM', NOW() - INTERVAL '20 days'),
('WRK-042', 'My Works — mentions + activity tabs', 'Done', 'Story',
 'Mentions tab from notifications, activity tab showing recent involvement',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 3, 'LOW', NOW() - INTERVAL '19 days'),
('WRK-043', 'Activity log per work item (from event store)', 'Done', 'Story',
 'Activity tab in detail panel — fetches events table by aggregate_id',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 3, 'MEDIUM', NOW() - INTERVAL '18 days'),

-- Projects
('WRK-050', 'Projects CRUD with key prefix', 'Done', 'Story',
 'Create/edit/archive projects with key prefix (WEB, AMR), lead, description',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 5, 'MEDIUM', NOW() - INTERVAL '27 days'),
('WRK-051', 'Project members management', 'Done', 'Task',
 'Add/remove project members, separate from workspace members',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 3, 'LOW', NOW() - INTERVAL '24 days'),
('WRK-052', 'Project progress bar (% done)', 'Done', 'Task',
 'Visual progress bar in project card based on done items / total items',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 2, 'LOW', NOW() - INTERVAL '22 days'),

-- Design System
('WRK-060', 'Tailwind design tokens — brand palette', 'Done', 'Task',
 'brand-navy, brand-teal, brand-orange, semantic colors, neutral scale in tailwind.config.js',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 3, 'HIGH', NOW() - INTERVAL '26 days'),
('WRK-061', 'Works component library — Button, StatusBadge, Logo', 'Done', 'Story',
 'cva-based variants, works/button.jsx, works/status-badge.jsx, works/logo.jsx',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 5, 'HIGH', NOW() - INTERVAL '25 days'),
('WRK-062', 'Empty states on all views', 'Done', 'Task',
 'EmptyState component with icon, title, subtitle, action button on every empty list',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 2, 'MEDIUM', NOW() - INTERVAL '22 days'),
('WRK-063', 'Dark mode toggle with Tailwind class strategy', 'Done', 'Task',
 'darkMode: class in tailwind config, moon/sun toggle in topbar, persists to localStorage',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 3, 'LOW', NOW() - INTERVAL '20 days'),
('WRK-064', 'PWA assets — favicon, manifest, Inter font', 'Done', 'Task',
 'Proper brand SVG favicon, manifest.json, Google Fonts Inter + JetBrains Mono in head',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER1', 2, 'LOW', NOW() - INTERVAL '19 days'),

-- Event Store
('WRK-070', 'Append-only event store foundation', 'Done', 'Story',
 'events table, EventService.record(), called on every state change — create/update/delete',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 5, 'HIGH', NOW() - INTERVAL '28 days'),

-- Attachments + Links
('WRK-080', 'File attachments — upload + delete', 'Done', 'Story',
 'Multipart upload to ~/.bsmart-works/uploads, list with filename/size, delete',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 5, 'MEDIUM', NOW() - INTERVAL '23 days'),
('WRK-081', 'Work item links — UI + API', 'Done', 'Story',
 'Link types: BLOCKS, BLOCKED_BY, RELATES_TO, DUPLICATES, PARENT, CHILD. UI in Links tab.',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER1', 5, 'MEDIUM', NOW() - INTERVAL '22 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STORIES & TASKS — Sprint 2 (Iteration 2 Sprints)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, assignee_id, created_by, sprint_id, story_points, priority, created_at) VALUES
('WRK-100', 'Sprint entity — PLANNING/ACTIVE/COMPLETED lifecycle', 'Done', 'Story',
 'Sprint CRUD, status transitions, start/complete buttons in backlog view',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER2', 8, 'HIGH', NOW() - INTERVAL '13 days'),
('WRK-101', 'Backlog view — items not in sprint', 'Done', 'Story',
 'Items where sprint_id IS NULL, grouped under sprint sections, then backlog section',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER2', 5, 'HIGH', NOW() - INTERVAL '12 days'),
('WRK-102', 'Backlog drag-drop reorder', 'Done', 'Story',
 'Drag handle, visual drop indicator, optimistic reorder, PUT /backlog/reorder API',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER2', 5, 'MEDIUM', NOW() - INTERVAL '11 days'),
('WRK-103', 'Refinement mode — inline story points + priority', 'Done', 'Story',
 'Toggle shows select/number inputs per item in backlog for quick refinement',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER2', 3, 'MEDIUM', NOW() - INTERVAL '10 days'),
('WRK-104', 'Sprint capacity bar in backlog + sprint board', 'Done', 'Task',
 'Sum of story_points vs sprint.capacity shown as progress bar',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER2', 3, 'MEDIUM', NOW() - INTERVAL '10 days'),
('WRK-105', 'Move items to sprint / back to backlog', 'Done', 'Task',
 'Sprint selector dropdown on hover in backlog, Back to Backlog button in sprint item list',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER2', 3, 'HIGH', NOW() - INTERVAL '11 days'),
('WRK-106', 'Sprint board — active sprint Kanban', 'Done', 'Story',
 'Separate sprint board view reusing Kanban with sprint header, goal, dates',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER2', 5, 'HIGH', NOW() - INTERVAL '9 days'),
('WRK-107', 'Swimlanes — by assignee, type, priority', 'Done', 'Story',
 'Swimlane toggle dropdown, horizontal dividers with group label between column groups',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER2', 5, 'MEDIUM', NOW() - INTERVAL '8 days'),
('WRK-108', 'Quick filters — Mine, Blockers, High Priority, Bugs', 'Done', 'Story',
 'Chip buttons above sprint board, active chip highlighted brand-navy',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER2', 3, 'MEDIUM', NOW() - INTERVAL '7 days'),
('WRK-109', 'Saved filters — name, save, apply, list', 'Done', 'Story',
 'Save current filter with name, list in sprint board header, apply on click',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-ITER2', 3, 'LOW', NOW() - INTERVAL '6 days'),
('WRK-110', 'Sprint reports — KPI cards + burndown chart', 'Done', 'Story',
 'Total/Done/Completion%/Velocity cards, stacked bar burndown, item outcomes table',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER2', 8, 'MEDIUM', NOW() - INTERVAL '5 days'),
('WRK-111', 'Work item links API + DB (Sprint 2)', 'Done', 'Task',
 'work_item_links table, GET/POST/DELETE endpoints, link types enum',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-ITER2', 3, 'MEDIUM', NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Sprint 3 — Active (Security Fixes + RBAC + Architecture)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, project_id, assignee_id, created_by, sprint_id, story_points, priority, created_at) VALUES

-- DONE (Security fixes already shipped)
('WRK-200', 'BCrypt password hashing — replace SHA-256', 'Done', 'Task',
 'spring-security BCryptPasswordEncoder, auto-migrate legacy hashes on first login',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 5, 'CRITICAL', NOW() - INTERVAL '3 days'),
('WRK-201', 'JWT verification filter on all protected endpoints', 'Done', 'Task',
 'Spring Security OncePerRequestFilter, 401 on invalid token, login/signup permitted',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 5, 'CRITICAL', NOW() - INTERVAL '3 days'),
('WRK-202', 'UUID-based IDs — replace Math.random()', 'Done', 'Bug',
 'Work items, sprints, projects all use UUID substring. Eliminates 10K ID space collision.',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 3, 'CRITICAL', NOW() - INTERVAL '3 days'),
('WRK-203', 'Global CORS config — remove per-controller @CrossOrigin', 'Done', 'Task',
 'Single CorsConfigurationSource bean in SecurityConfig. 12 controllers updated.',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 2, 'HIGH', NOW() - INTERVAL '3 days'),
('WRK-204', 'Frontend error handling — apiFetch wrapper + toast', 'Done', 'Task',
 'Centralized apiFetch with error throw, Toast component, auto-dismiss 4s',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 3, 'HIGH', NOW() - INTERVAL '2 days'),
('WRK-205', 'Debounced handleUpdateItem — fix infinite loop risk', 'Done', 'Bug',
 '600ms debounce with useRef timer, prevents rapid PUT requests on every keypress',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 2, 'HIGH', NOW() - INTERVAL '2 days'),
('WRK-206', 'darkMode: class in tailwind.config.js', 'Done', 'Bug',
 'Without this setting, dark mode toggle had zero visual effect despite class toggling',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 1, 'MEDIUM', NOW() - INTERVAL '2 days'),
('WRK-207', 'Fix backlog reorder type cast — Number cast to int', 'Done', 'Bug',
 '((Number) item.get("order")).intValue() — prevents Long→int PostgreSQL type mismatch',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 1, 'HIGH', NOW() - INTERVAL '2 days'),
('WRK-208', 'deleteWorkItem — single findById, cascade all children', 'Done', 'Bug',
 'Single DB call, also deletes links + attachments before item delete',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 2, 'HIGH', NOW() - INTERVAL '2 days'),
('WRK-209', 'Fix hardcoded localhost URL in SprintItemList', 'Done', 'Bug',
 'Was: http://localhost:8080/... Now: ${API}/... uses central constant',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 1, 'MEDIUM', NOW() - INTERVAL '2 days'),
('WRK-210', 'Eat your own dogfood — seed all project work in the app', 'Done', 'Story',
 'V8 migration seeding all Iteration 1 + 2 work items as real data in bSmart Works',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 5, 'HIGH', NOW()),

-- IN PROGRESS (current sprint)
('WRK-211', 'RBAC — roles table, permissions matrix, tier enforcement', 'In Progress', 'Story',
 'VIEWER/MEMBER/LEAD/ADMIN/OWNER tiers, permission matrix, Spring Security method security',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 13, 'HIGH', NOW()),
('WRK-212', 'Architecture — modular monolith domain packages', 'In Progress', 'Story',
 'Restructure com.example.demo into domain packages: auth, workitem, sprint, etc.',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 8, 'HIGH', NOW()),
('WRK-213', 'Dashboard home — data-driven decision surface', 'In Progress', 'Story',
 'Replace board as default view with a real dashboard: active sprint, assigned items, recent activity',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 8, 'HIGH', NOW()),

-- TODO (upcoming in this sprint)
('WRK-220', 'Frontend role-based feature gating', 'Todo', 'Story',
 'Hide/disable create/delete/admin actions based on user tier. Show locked state for lower tiers.',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 8, 'HIGH', NOW()),
('WRK-221', 'Privacy controls — field-level visibility', 'Todo', 'Story',
 'Internal comments visible only to LEAD+, attachments scoped to project members',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 5, 'MEDIUM', NOW()),
('WRK-222', 'Role management UI in workspace settings', 'Todo', 'Story',
 'Dropdown to change member role, role audit log, cannot demote OWNER',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 5, 'MEDIUM', NOW()),
('WRK-223', 'App.jsx component split — extract views into separate files', 'Todo', 'Task',
 'BoardView, BacklogView, SprintView, ReportsView, WorkItemDetailPanel as separate components',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 8, 'MEDIUM', NOW()),
('WRK-224', 'Optimistic concurrency — prevent silent overwrites', 'Todo', 'Task',
 'version field on work_items, 409 on stale update, frontend shows conflict modal',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 8, 'HIGH', NOW()),
('WRK-225', 'Performance — index frequently queried columns', 'Todo', 'Task',
 'Add indexes: work_items.sprint_id, work_items.assignee_id, events.aggregate_id',
 'PROJ-WORKS', 'USR-DEV2', 'USR-DEV1', 'SPR-FIXES', 3, 'MEDIUM', NOW()),
('WRK-226', 'Rich text description — markdown preview', 'Todo', 'Story',
 'Render markdown in description display, toggle edit/preview mode',
 'PROJ-WORKS', 'USR-DEV1', 'USR-DEV1', 'SPR-FIXES', 5, 'LOW', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- WORK ITEM LINKS — connect related items
-- ============================================================
INSERT INTO work_item_links (source_id, target_id, link_type, created_at) VALUES
    ('WRK-001', 'WRK-E01', 'PARENT', NOW() - INTERVAL '28 days'),
    ('WRK-002', 'WRK-E01', 'PARENT', NOW() - INTERVAL '28 days'),
    ('WRK-003', 'WRK-E01', 'PARENT', NOW() - INTERVAL '28 days'),
    ('WRK-200', 'WRK-E16', 'PARENT', NOW() - INTERVAL '3 days'),
    ('WRK-201', 'WRK-E16', 'PARENT', NOW() - INTERVAL '3 days'),
    ('WRK-202', 'WRK-E16', 'PARENT', NOW() - INTERVAL '3 days'),
    ('WRK-201', 'WRK-001', 'RELATES_TO', NOW() - INTERVAL '3 days'),
    ('WRK-211', 'WRK-220', 'BLOCKS',    NOW()),
    ('WRK-212', 'WRK-223', 'BLOCKS',    NOW()),
    ('WRK-211', 'WRK-221', 'BLOCKS',    NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- TAGS
-- ============================================================
INSERT INTO tags (work_item_id, tag) VALUES
    ('WRK-200', 'security'), ('WRK-200', 'P0'),
    ('WRK-201', 'security'), ('WRK-201', 'P0'), ('WRK-201', 'jwt'),
    ('WRK-202', 'security'), ('WRK-202', 'P0'), ('WRK-202', 'bug'),
    ('WRK-022', 'frontend'), ('WRK-022', 'board'),
    ('WRK-110', 'reports'), ('WRK-110', 'analytics'),
    ('WRK-211', 'rbac'), ('WRK-211', 'security'),
    ('WRK-223', 'refactor'), ('WRK-223', 'architecture'),
    ('WRK-210', 'dogfood'), ('WRK-210', 'seed')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_work_items_sprint_id    ON work_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee_id  ON work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_items_project_id   ON work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status       ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_events_aggregate_id     ON events(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_events_actor_id         ON events(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_work_item_id   ON comments(work_item_id);
