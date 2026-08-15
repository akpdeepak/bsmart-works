# EPIC 10 - Work Item Experience Redesign

Status: Completed
Branch: `epic/10-work-item-experience`  
Started: 2026-06-20

## Intent

Redesign the work item detail experience into a calmer, structured execution surface while preserving
the current work-item hierarchy, mutation contracts, RBAC, and tenant-scoped backend behavior.

## Source Requirements

- Detail view must make status, owner, priority, due date, blockers, SLA/customer visibility, DevSync,
  activity, audit, and AI/source-backed summary information easy to understand.
- Inline updates for key fields must remain reliable.
- Comments, attachments, links, and activity must stay available without turning the detail page into
  raw event noise.
- AI assistance must be additive, source-cited, and reviewable.
- V1.6 overlays for work type policy, team display keys, and inline BQL filters remain accepted
  requirements, but this first slice avoids backend contract changes.

## Current Slice

- Add a deterministic execution brief builder in `works-frontend/src/lib/work-item-execution-brief.js`.
- Render the execution brief under the work item detail header with source citations.
- Surface due date, customer/internal visibility, and DevSync link state as always-visible snapshot
  fields.
- Prefer `displayKey` over `autoId`/internal ID where available.

## Validation Plan

- `cd works-frontend && npm test -- work-item-execution-brief work-item-detail-panel`
- `npm run verify`
- `cd works-frontend && npm run verify`
- GitHub CI before merge.

---

# EPIC 10 - Work Item Experience Redesign Completion

Status: Completed
PR: [#404](https://github.com/akpdeepak/bsmart-works/pull/404)  
Merge commit: `a93c1bbcbeaab9ff303ebe2760aaf736c6e16db7`  
Completed: 2026-06-20

## Delivered

- Added `works-frontend/src/lib/work-item-execution-brief.js` to build a deterministic, source-cited
  execution snapshot for a work item.
- Added an always-visible execution brief below the work item detail header.
- Surfaced status, owner, priority, due date, customer/internal visibility, and DevSync linked-code
  state without changing backend contracts.
- Preferred `displayKey` over `autoId` or internal ID where available.
- Added focused tests for the brief builder and detail panel rendering.

## Validation

- `cd works-frontend && npm test -- work-item-execution-brief work-item-detail-panel`
- `npm run verify`
- `cd works-frontend && npm run verify`
- GitHub CI for PR #404 passed all required jobs:
  frontend lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke,
  guardrails, quality gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build,
  conventional commits, AI rules, and DoD version checks.

## Follow-Up

- Continue with EPIC 11 - Project Command Center.
- Future EPIC 10-adjacent work can deepen inline field editing, activity grouping, approval/SLA panels,
  and server-backed display-key generation as the related policy and people-graph EPICs land.
