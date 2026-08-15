# EPIC 12 - DevSync / Engineering Intelligence

Status: Completed

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

---

# EPIC 12 - DevSync / Engineering Intelligence Completion

Status: Completed

PR: [#406](https://github.com/akpdeepak/bsmart-works/pull/406)

Merge commit: `519c39bd7001cd41f42121b7af663e9e488ab64b`

## Completed scope

- Added `buildEngineeringActivity` in `works-frontend/src/lib/engineering-activity.js`.
- Added an Engineering Activity panel to Developer Workspace.
- Grouped review flow, linked work evidence, raw activity events, unlinked activity, and release-readiness counters.
- Preserved the no-surveillance DevSync rule with evidence-oriented copy and tests that avoid leaderboard, productivity-score, commit-count, and lines-of-code ranking patterns.
- Updated Developer Workspace tests to cover the visible Engineering Activity contract.

## Validation

- `cd works-frontend && npm test -- engineering-activity developer-workspace`
- `npm run verify`
- `cd works-frontend && npm run verify`
- GitHub CI passed all required jobs on PR #406.

Known baseline: `npm run verify` still reports the existing non-blocking raw hex warning in
`works-frontend/src/components/works/organisms/status-management-tab.jsx`.

## Resume point

Resume with EPIC 13 - Universal AI Command Layer from a synced `main` branch.
