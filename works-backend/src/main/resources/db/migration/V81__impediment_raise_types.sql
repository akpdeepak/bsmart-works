-- V80: Role-filtered "Raise" — generalize impediments into the cockpit's single raise model.
--
-- One mechanism, one workflow (open → owned → resolved), one severity/age/escalation model,
-- one audit trail; the TYPE of raise is role-filtered server-side (TeamRoleService role_key):
--   developer        → IMPEDIMENT | RISK | DEPENDENCY
--   product-owner    → + SCOPE_CHANGE | DECISION_NEEDED
--   scrum-master/admin → all, including ESCALATION
-- Decision 2026-06-12 (Deepak): raise_type column on impediments, not a parallel table.
ALTER TABLE impediments ADD COLUMN raise_type VARCHAR(20) NOT NULL DEFAULT 'IMPEDIMENT';
