-- ============================================================
-- V35: Seed a second workspace (I01-S02 Workspaces)
-- Makes multi-workspace tenant context real and demonstrable: the canonical dogfood users
-- belong to two workspaces, so the switcher shows two and switching exercises real isolation.
-- Seed data only — no schema change. Forward-only.
-- ============================================================

INSERT INTO workspaces (id, name, slug, primary_color, description) VALUES
    ('WS-002', 'BCITS Support Desk', 'support', '#0E7C5E',
     'Customer support and service-desk workspace for the BCITS team.')
ON CONFLICT (id) DO NOTHING;

-- USR-DEV1 (Deepak) owns the second workspace; USR-DEV2 is a member.
INSERT INTO workspace_members (workspace_id, user_id, system_role, role_id) VALUES
    ('WS-002', 'USR-DEV1', 'OWNER',  'OWNER'),
    ('WS-002', 'USR-DEV2', 'MEMBER', 'MEMBER')
ON CONFLICT DO NOTHING;
