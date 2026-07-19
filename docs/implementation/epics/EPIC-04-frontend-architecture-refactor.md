# EPIC 04 - Frontend Architecture Refactor

## Blueprint references

- Implementation blueprint: EPIC 4 - Frontend Architecture Refactor
- UI/UX expanded blueprint: extract App shell, auth/session, workspace, routes, global providers,
  modals, shortcuts, and realtime responsibilities
- V1.6 overlay: new V1.6 feature logic must not be added directly into the `App.jsx` monolith

## Objective

Turn the frontend root into a clean app boundary so future route, provider, modal, BQL, and feature
state extractions can happen in small, safe PRs.

## Scope in this EPIC

- Create `works-frontend/src/app/` as the app architecture boundary.
- Convert `works-frontend/src/App.jsx` into a thin stable entry point.
- Move the legacy shell implementation to `works-frontend/src/app/AppShell.jsx`.
- Add an architecture test that prevents `App.jsx` from growing back into a stateful monolith.
- Preserve all existing routes, navigation, auth, workspace, realtime, modal, and view behavior.
- Extract workspace, navigation, overlays, and realtime ownership behind independently testable
  boundaries.
- Remove file-level lint suppression from the shell and gate the phase-2 size ceiling.

## Acceptance criteria checklist

- [x] `App.jsx` is below 1,000 lines in phase 1.
- [x] No `/* eslint-disable no-unused-vars, no-undef */` at root `App.jsx`.
- [x] App shell has an explicit `src/app` boundary for future provider and route extraction.
- [x] Existing navigation and deep links still route through the same shell implementation.
- [x] Architecture test protects the thin app entrypoint.
- [x] Existing frontend build remains green.
- [x] Membership resolution precedes workspace-scoped data and realtime startup.
- [x] Workspace, navigation, overlays, realtime, and providers have focused tests.
- [x] Route and entity deep-link mapping remains centralized.
- [x] `AppShell.jsx` is below the enforced 3,000-line closeout ceiling.

## Implementation summary

- Moved the legacy shell from `src/App.jsx` to `src/app/AppShell.jsx`, then reduced it from 4,628 to
  2,884 lines through focused extractions.
- Replaced `src/App.jsx` with a 5-line wrapper that renders `AppShell`.
- Added `src/app/app-architecture.test.js` to enforce the thin-entry boundary and shell location.
- Added tested workspace, navigation, overlay, and realtime hooks; removed the file-level lint disable.

## Validation completed

- `cd works-frontend && npm test -- app-architecture`
- `cd works-frontend && npm run build`
- `npm run verify`
- `cd works-frontend && npm run verify` (1,771 tests, 0 lint errors, production build passed)
- `node scripts/epics-01-05-completion.mjs`
