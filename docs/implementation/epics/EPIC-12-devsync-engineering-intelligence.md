# EPIC 12 - DevSync / Engineering Intelligence

Status: In progress

Branch: `epic/12-devsync-engineering-intelligence`

## Scope for this slice

Build the first V.20 DevSync surface inside the existing Developer Workspace:

- group review, CI, deployment, and raw activity signals into an engineering activity summary;
- cite the source signals used by the summary;
- show linked and unlinked activity without blaming individuals;
- surface PR review flow, CI/deployment release-readiness signals, and next actions;
- preserve the existing private personal velocity boundary.

## Guardrails

- No developer leaderboard.
- No productivity score.
- No commit-count or lines-of-code ranking.
- No automatic official work-item state changes.
- Source-backed summaries only.

## Validation target

- `cd works-frontend && npm test -- engineering-activity developer-workspace`
- `npm run verify`
