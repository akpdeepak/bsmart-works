# EPIC 04 Completion - Frontend Architecture Refactor

Date: 2026-07-19
Branch: `codex/epics-01-05-completion`

## Scope completed

- Kept `src/App.jsx` as a 5-line entry point and reduced `src/app/AppShell.jsx` from 4,628 to 2,884
  lines through provider, auth, public-route, shortcut, route-outlet, and feature-state extraction.
- Extracted membership-backed workspace selection, navigation/deep-link state, global overlays, and
  realtime presence into focused hooks with independent tests.
- Prevented live-data and realtime startup until workspace membership resolves; stale or foreign
  persisted workspace ids are rejected instead of replaced with an invented tenant.
- Removed the shell's file-level `no-unused-vars`/`no-undef` suppression and cleaned the hidden stale
  code it exposed.
- Kept canonical view/entity deep-link mapping in the route layer and added architecture regression
  coverage for the extracted boundaries.

## Validation

- `cd works-frontend && npm run verify`
- `node scripts/epics-01-05-completion.mjs`
- Result: ESLint 0 errors (33 visible legacy warnings), 1,771 tests across 240 files, and a successful
  production build.

Further feature-level decomposition remains healthy continuous architecture work; it is not an open
acceptance item for this EPIC.
