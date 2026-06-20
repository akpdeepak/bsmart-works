# EPIC 06 Completion - Simplified Information Architecture and Navigation

Date: 2026-06-20
Branch: `epic/06-simplified-navigation`

## Scope completed

- Preserved the primary rail modes as Home, Deliver, Insight, Service, Know, Extend.
- Removed setup from the rail model and introduced `SETUP_DESTINATIONS` as More/command-palette
  destinations.
- Kept settings, workflows, AI control, customization, security, and trash reachable through More.
- Mapped setup/admin active views to the Extend orientation context.
- Added nav-model tests for the six-mode contract, More grouping, and setup/admin orientation.

## Key files

- `works-frontend/src/lib/nav-model.js`
- `works-frontend/src/lib/nav-model.test.js`
- `docs/implementation/epics/EPIC-06-simplified-navigation.md`

## Local validation

- `cd works-frontend && npm test -- nav-model`
- `cd works-frontend && npm run build`
- `npm run verify`

## Follow-on notes

- Continue navigation simplification with sub-rail prioritization and role-aware default surfaces,
  while preserving command-palette access to all destinations.
