# EPIC 10 - Work Item Experience Redesign

Status: In progress  
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
