-- ============================================================
-- V124: Phase 4 Framework Engine and User Types
-- ============================================================

-- Add framework selection to projects (Scrum, Kanban, Waterfall, Lean, DSDM, XP, Custom)
ALTER TABLE projects ADD COLUMN framework VARCHAR(50) DEFAULT 'CUSTOM' NOT NULL;

-- Add business user types to workspace_members (Individual, Team Lead, Management, Admin, Owner)
ALTER TABLE workspace_members ADD COLUMN business_user_type VARCHAR(50) DEFAULT 'INDIVIDUAL' NOT NULL;
