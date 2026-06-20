# EPIC 11 - Project Command Center

Status: In progress  
Branch: `epic/11-project-command-center`  
Started: 2026-06-20

## Intent

Make project/team pages answer "are we on track?" quickly, with source-backed health, risks,
blockers, decisions, customer/SLA exposure, DevSync signals, project-room access, and next actions.

## Source Requirements

- Project overview should show health, progress, milestones/timeline, risks, issues, decisions,
  dependencies, SLA exposure, team workload, DevSync summary, messages/project room, documents, and
  AI executive summary.
- Health score must be explainable, not only a color.
- Risks, blockers, dependencies, and SLA exposure must have clear next-action framing.
- Customer update drafts should be generated from cited project signals.
- No cross-workspace data should appear.

## Current Slice

- Add `works-frontend/src/lib/project-command-center.js` to compute a deterministic command-center
  summary from already scoped project/work-item data.
- Render explainable health, source citations, risk/blocker signal, SLA/customer risk, decisions,
  DevSync linked-code state, project-room readiness, customer-update draft affordance, and next
  actions on `ProjectsView` cards.
- Keep all data read-only and derived from existing props; no backend persistence or authorization
  contract changes.

## Validation Plan

- `cd works-frontend && npm test -- project-command-center projects-view`
- `npm run verify`
- `cd works-frontend && npm run verify`
- GitHub CI before merge.
