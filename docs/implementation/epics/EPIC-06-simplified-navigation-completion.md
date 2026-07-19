# EPIC 06 Completion - Simplified Information Architecture and Navigation

Date: 2026-07-19
Branch: `codex/epic-06-navigation-completion`

## Scope completed

- Preserved exactly six rail modes: Home, Deliver, Insight, Service, Know, and Extend.
- Added a visible, keyboard-operable More menu for permitted setup, administration, account, role
  cockpit, and BQL destinations; command-palette access remains available.
- Added the missing `/settings/ai-control` deep link and verified all 38 rendered views against the
  canonical route map.
- Wired role-aware mode landing for authorized role preview and rendered localized shell
  breadcrumbs for mode, surface, and open work-item orientation.
- Localized command-palette destinations and completed the `nav.account` translation in all nine
  non-English catalogues.
- Removed the legacy sidebar's duplicate destination catalogue; it now derives from `nav-model.js`.
- Kept `/rbac/me.surfaces` authoritative and added a backend assertion plus an executable parity
  check against all 37 frontend destinations.

## Code-derived evidence

`scripts/epic-06-completion.mjs` verifies production source rather than completion prose:

- 6 approved modes;
- 38 rendered views exactly match 38 deep-link routes;
- 37 command/More destinations exactly match 37 backend `NavSurfaces` entries;
- all rendered features are reachable;
- 44 navigation keys exist in all 10 locale catalogues;
- More, role landing, breadcrumbs, accessibility coverage, and single-catalogue ownership are wired.

## Validation

- `npm run epic:6`: 11/11 checks passed.
- `npm run verify`: all repository guardrails and EPIC 1-6 gates passed.
- `cd works-frontend && npm run verify`: 1,782 tests across 243 files, production build passed,
  ESLint reported 0 errors and the existing 33 warnings.
- Focused navigation suite: 62 tests passed; navigation-shell axe test passed.
- `cd works-backend && ./mvnw -Dgroups=unit verify`: 1,454 tests passed; JaCoCo and Checkstyle gates
  passed. The focused `RbacControllerAccessTest` contract has 3 passing tests.

No migration or authorization-policy change was made. Flyway remains V119. EPIC 7 is the next
incomplete Phase 3 EPIC.
