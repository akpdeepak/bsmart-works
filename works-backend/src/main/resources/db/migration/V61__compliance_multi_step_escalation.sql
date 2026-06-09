-- Iteration 7 (Cap K): multi-step escalation chains
-- escalation_steps stores [{hours, targets:[{type,...}]}, ...] ordered by hours ASC.
-- next_escalation_step tracks which step each violation is waiting on (0 = none fired yet).
ALTER TABLE compliance_rules
    ADD COLUMN IF NOT EXISTS escalation_steps JSONB NOT NULL DEFAULT '[]';

ALTER TABLE compliance_violations
    ADD COLUMN IF NOT EXISTS next_escalation_step INTEGER NOT NULL DEFAULT 0;
