-- V36: Iteration 7 — seeded compliance rule library (Cap K).
-- 22 ready-to-clone templates covering the spec examples (orphan story, stale/missing
-- estimate, scope creep, unassigned in-progress, sprint hygiene). Templates are global
-- (workspace_id NULL, is_template = TRUE, active = FALSE); a workspace clones one into an
-- owned, inactive rule and activates it after a test run (test-before-activate, RB-20 §3:
-- opinionated defaults, customization on top).
--
-- Each rule scopes items via scope_bql and asserts the compliant condition via assertion_bql.
-- A scoped item whose assertion is NOT TRUE (false OR null) is a violation, so "field present"
-- is expressed as `field != ''` — a null/blank field then fails the assertion. BQL strings are
-- dollar-quoted ($q$…$q$) so embedded quotes need no escaping.

INSERT INTO compliance_rules
    (id, workspace_id, project_id, name, description, scope_bql, assertion_bql, severity, is_template, active)
VALUES
    ('CRT-001', NULL, NULL, 'Story needs acceptance criteria before In Progress',
     'Stories must define acceptance criteria before work starts.',
     $q$type = Story AND status = In Progress$q$, $q$acceptance_criteria != ''$q$, 'HIGH', TRUE, FALSE),

    ('CRT-002', NULL, NULL, 'Story is missing an estimate',
     'Every story should carry a story-point estimate for capacity planning.',
     $q$type = Story$q$, $q$story_points > 0$q$, 'MEDIUM', TRUE, FALSE),

    ('CRT-003', NULL, NULL, 'Orphan story (no parent epic)',
     'Stories should roll up to an epic so scope is traceable.',
     $q$type = Story$q$, $q$parent_id != ''$q$, 'LOW', TRUE, FALSE),

    ('CRT-004', NULL, NULL, 'Unassigned in-progress item',
     'Anything in progress must have an owner.',
     $q$status = In Progress$q$, $q$assignee_id != ''$q$, 'HIGH', TRUE, FALSE),

    ('CRT-005', NULL, NULL, 'Overdue in-progress item',
     'In-progress items past their due date breach delivery expectations.',
     $q$status = In Progress$q$, $q$due_date >= today()$q$, 'HIGH', TRUE, FALSE),

    ('CRT-006', NULL, NULL, 'Unassigned critical bug',
     'Critical bugs must be assigned the moment they are raised.',
     $q$type = Bug AND priority = CRITICAL$q$, $q$assignee_id != ''$q$, 'CRITICAL', TRUE, FALSE),

    ('CRT-007', NULL, NULL, 'Bug missing steps to reproduce',
     'A bug without reproduction steps cannot be triaged reliably.',
     $q$type = Bug$q$, $q$steps_to_reproduce != ''$q$, 'MEDIUM', TRUE, FALSE),

    ('CRT-008', NULL, NULL, 'Bug missing severity',
     'Bugs must be classified by severity for prioritization.',
     $q$type = Bug$q$, $q$severity != ''$q$, 'MEDIUM', TRUE, FALSE),

    ('CRT-009', NULL, NULL, 'Story missing business value',
     'Stories should record business value to justify their place.',
     $q$type = Story$q$, $q$business_value > 0$q$, 'LOW', TRUE, FALSE),

    ('CRT-010', NULL, NULL, 'In-progress story without definition of done',
     'Stories in progress must have a definition of done.',
     $q$type = Story AND status = In Progress$q$, $q$definition_of_done != ''$q$, 'MEDIUM', TRUE, FALSE),

    ('CRT-011', NULL, NULL, 'Unassigned in-progress task',
     'Tasks in progress must have an owner.',
     $q$type = Task AND status = In Progress$q$, $q$assignee_id != ''$q$, 'MEDIUM', TRUE, FALSE),

    ('CRT-012', NULL, NULL, 'In-progress item without description',
     'Work in progress should describe what is being done.',
     $q$status = In Progress$q$, $q$description != ''$q$, 'LOW', TRUE, FALSE),

    ('CRT-013', NULL, NULL, 'High-priority item past due',
     'High-priority items past their due date need attention.',
     $q$priority = HIGH$q$, $q$due_date >= today()$q$, 'HIGH', TRUE, FALSE),

    ('CRT-014', NULL, NULL, 'Epic missing description',
     'Epics frame a body of work and must be described.',
     $q$type = Epic$q$, $q$description != ''$q$, 'LOW', TRUE, FALSE),

    ('CRT-015', NULL, NULL, 'In-progress item without an estimate',
     'Unestimated in-progress work distorts capacity and burndown.',
     $q$status = In Progress$q$, $q$story_points > 0$q$, 'MEDIUM', TRUE, FALSE),

    ('CRT-016', NULL, NULL, 'Critical item missing acceptance criteria',
     'Critical work must define acceptance criteria.',
     $q$priority = CRITICAL$q$, $q$acceptance_criteria != ''$q$, 'HIGH', TRUE, FALSE),

    ('CRT-017', NULL, NULL, 'Bug missing expected result',
     'Bugs should state the expected behaviour.',
     $q$type = Bug$q$, $q$expected_result != ''$q$, 'LOW', TRUE, FALSE),

    ('CRT-018', NULL, NULL, 'Bug missing actual result',
     'Bugs should state the observed behaviour.',
     $q$type = Bug$q$, $q$actual_result != ''$q$, 'LOW', TRUE, FALSE),

    ('CRT-019', NULL, NULL, 'Bug missing environment',
     'Bugs should record the environment they occurred in.',
     $q$type = Bug$q$, $q$environment != ''$q$, 'LOW', TRUE, FALSE),

    ('CRT-020', NULL, NULL, 'In-progress item without effort estimate',
     'In-progress items should carry a t-shirt effort estimate.',
     $q$status = In Progress$q$, $q$effort_estimate != ''$q$, 'LOW', TRUE, FALSE),

    ('CRT-021', NULL, NULL, 'Critical item past due',
     'Critical items past their due date are SLA risks.',
     $q$priority = CRITICAL$q$, $q$due_date >= today()$q$, 'CRITICAL', TRUE, FALSE),

    ('CRT-022', NULL, NULL, 'Unassigned high-priority item',
     'High-priority work must have an owner.',
     $q$priority = HIGH$q$, $q$assignee_id != ''$q$, 'HIGH', TRUE, FALSE);
