# Iteration 4 — PM Artifacts: RAID, Decisions, Meetings, Action Items

## What was built

1. **Risks register** — `risk` table with probability × impact heat matrix, mitigation plan, contingency plan, owner, review date, status (OPEN/MITIGATED/CLOSED/ACCEPTED). Full CRUD at `/api/v1/risks`.

2. **Assumptions log** — `assumption` table with validation status (UNVALIDATED/VALIDATED/INVALIDATED), owner, expiry date. Full CRUD at `/api/v1/assumptions`.

3. **PM-style issues log** — `pm_issue` table (distinct from software bugs). Impact field, resolution path, priority, owner. Full CRUD at `/api/v1/pm-issues`.

4. **Dependencies tracker** — `dependency` table with dependent/providing teams, deadline, blocker flag, status (PENDING/IN_PROGRESS/RESOLVED/BLOCKED). Full CRUD at `/api/v1/dependencies`.

5. **Decisions register** — `decision` table with alternatives considered, rationale, decision date, links (JSONB array), related risk. Full CRUD at `/api/v1/decisions`.

6. **Meeting notes** — `meeting` + `meeting_note` tables. Meeting auto-creates 4 structured note sections (AGENDA, NOTES, DECISIONS, ACTIONS). `/api/v1/meetings` and `/api/v1/meetings/{id}/notes/{section}` upsert.

7. **Action items** — `action_item` table linked to source meeting, owner, due date, status (OPEN/IN_PROGRESS/DONE/CANCELLED). Full CRUD at `/api/v1/action-items` with filtering by project, meeting, or owner.

8. **RAID dashboard** — `/api/v1/raid-dashboard?projectId=...` aggregates all RAID data plus action items into one response with summary counts and computed health score (0–100).

9. **Stakeholder register** — `stakeholder` table with influence/interest matrix, engagement strategy (INFORM/CONSULT/INVOLVE/COLLABORATE/EMPOWER), communication frequency, last contacted date. Full CRUD at `/api/v1/stakeholders`.

10. **Lessons learned** — `lesson_learned` table with what-worked/what-didnt-work/recommendation, category, tags. Full CRUD at `/api/v1/lessons-learned`.

## UI

- **PM Artifacts** view in sidebar under "Project Management" section
- Project selector at top — all tabs show data for selected project
- 10 sub-tabs: RAID Dashboard, Risks, Assumptions, Issues, Dependencies, Decisions, Meetings, Actions, Stakeholders, Lessons
- **RAID Dashboard** includes risk heat matrix (probability × impact grid), health score, overdue actions summary
- **Meeting detail** view with 4 editable note sections (auto-saved on blur)
- **PM create modal** with type-specific fields for each artifact type

## Key decisions

- Meetings auto-create 4 note sections on creation (AGENDA/NOTES/DECISIONS/ACTIONS) — no empty state for note sections
- Health score formula: 100 − (open_risks + open_issues + blocked_deps) × 10, min 0
- All PM artifacts use soft delete (deleted_at), consistent with existing entities
- `pm_issue` named separately from `work_item` to avoid confusion in the RAID context
