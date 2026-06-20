# EPIC 7 - bSmart Today

Status: In progress  
Branch: `epic/07-bsmart-today`  
Roadmap: V.20

## Intent

Make Home/Today a calm daily clarity surface instead of only a configurable dashboard grid. The
experience should answer: what matters now, what needs attention, and what should I do next.

## Source Requirements

- Today is the default authenticated landing page.
- Today must feel calm, habit-forming, and role-aware.
- The daily surface should include a greeting/confidence message, AI/manual brief fallback,
  max-five needs-attention list, work today, approvals/waiting, risks, suggested next actions, and
  quiet wins.
- Role-specific Today layouts are required for developer, team lead or scrum master, product owner,
  executive, and admin. Support/service agent coverage follows the Service Desk EPIC unless that
  role is already available in the current navigation model.
- Today must not leak cross-workspace data.
- Today should remain fast on seeded data.

## Implementation Slice

- Add a pure `buildTodayBrief` helper that derives the daily clarity model from already fetched,
  workspace-scoped role dashboard data.
- Cap attention items at five and prioritize constrained signals:
  blockers, overdue work, high priority work, sprint health, release readiness, portfolio risk, MFA
  posture, and audit follow-up.
- Render a daily clarity band above the existing role-specific Today canvas.
- Preserve the existing configurable widget canvas and saved Today layout behavior.
- Add frontend tests for role-aware brief construction and dashboard action routing.

## Validation Plan

- `cd works-frontend && npm test -- today-brief dashboard-view`
- `cd works-frontend && npm run build`
- `npm run verify`
- GitHub PR checks before merge to `main`
