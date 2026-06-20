# EPIC 04 - Frontend Architecture Refactor

## Blueprint references

- Implementation blueprint: EPIC 4 - Frontend Architecture Refactor
- UI/UX expanded blueprint: extract App shell, auth/session, workspace, routes, global providers,
  modals, shortcuts, and realtime responsibilities
- V1.6 overlay: new V1.6 feature logic must not be added directly into the `App.jsx` monolith

## Objective

Turn the frontend root into a clean app boundary so future route, provider, modal, BQL, and feature
state extractions can happen in small, safe PRs.

## Scope in this EPIC slice

- Create `works-frontend/src/app/` as the app architecture boundary.
- Convert `works-frontend/src/App.jsx` into a thin stable entry point.
- Move the legacy shell implementation to `works-frontend/src/app/AppShell.jsx`.
- Add an architecture test that prevents `App.jsx` from growing back into a stateful monolith.
- Preserve all existing routes, navigation, auth, workspace, realtime, modal, and view behavior.

## Acceptance criteria checklist

- [x] `App.jsx` is below 1,000 lines in phase 1.
- [x] No `/* eslint-disable no-unused-vars, no-undef */` at root `App.jsx`.
- [x] App shell has an explicit `src/app` boundary for future provider and route extraction.
- [x] Existing navigation and deep links still route through the same shell implementation.
- [x] Architecture test protects the thin app entrypoint.
- [x] Existing frontend build remains green.

## Implementation summary

- Moved the legacy 4,596-line shell from `src/App.jsx` to `src/app/AppShell.jsx`.
- Replaced `src/App.jsx` with a 5-line wrapper that renders `AppShell`.
- Added `src/app/app-architecture.test.js` to enforce the thin-entry boundary and shell location.

## Validation completed

- `cd works-frontend && npm test -- app-architecture`
- `cd works-frontend && npm run build`
- `npm run verify`

## Follow-on notes

- The next EPIC 4 slice should extract route rendering into `src/app/RouteRenderer.jsx`.
- Subsequent slices should extract workspace/session providers, global overlays, and feature modules
  without adding new feature state back to `AppShell.jsx`.
