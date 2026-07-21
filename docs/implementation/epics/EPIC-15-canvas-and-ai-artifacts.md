# EPIC 15 - bSmart Canvas and AI-Generated Work Artifacts

Status: In progress
Branch: `epic/15-canvas-and-ai-artifacts`
Started: 2026-07-21

## Intent

Create a side-by-side AI canvas where AI-generated outputs become editable work artifacts. AI responses should not remain trapped in chat. They should become reports, plans, RCA, checklists, release notes, and evidence bundles.

## Source Requirements

Canvas layout:
- left: AI instruction/chat
- center: editable artifact
- right: sources, comments, approvals, version history

Artifacts:
- project plan
- RCA
- SLA report
- sprint plan
- customer update
- release note
- test checklist
- risk register
- compliance evidence bundle

Acceptance Criteria:
- AI can generate an editable artifact.
- User can edit and save artifact.
- Artifact has source references.
- Artifact can be approved/published/exported.
- Version history is retained.
- External/customer sharing requires explicit approval.

## Current Slice

- Implement the 3-panel UI inside `ai-studio-view.jsx`.
- Plumb the generation of AI artifacts so they render in `BlockEditor.jsx`.
- Provide backend endpoints via `ArticleExportController.java` and `ExecutiveBriefingController.java` for export/generation.
- Integrate artifacts into `ExportController.java`.

## Validation Plan

- `cd works-frontend && npm test -- ai-studio-view block-editor`
- `npm run verify`
- `cd works-frontend && npm run verify`
- GitHub CI before merge.
