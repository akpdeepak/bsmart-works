# EPIC 06 - Simplified Information Architecture and Navigation

## Blueprint references

- Implementation blueprint: EPIC 6 - Simplified Information Architecture and Navigation
- UI/UX expanded blueprint: simplified product experience architecture and navigation
- User correction: preserve the rail modes as Home, Deliver, Insight, Service, Know, Extend

## Objective

Keep navigation calm and predictable through the six-mode rail while ensuring every rendered
feature remains permission-aware, localized, deep-linkable, and reachable in two clicks or through
the command palette.

## Scope

- Preserve exactly Home, Deliver, Insight, Service, Know, and Extend as product modes.
- Keep setup, administration, role cockpits, account, and BQL off the rail and available through a
  visible More menu and the command palette.
- Derive all frontend navigation renderers from `nav-model.js` and keep its visibility catalogue in
  executable parity with the server-authoritative `NavSurfaces` catalogue.
- Use role-aware mode landing while an authorized Admin/Owner previews a role.
- Render localized shell breadcrumbs for mode, surface, and open entity orientation.
- Give every rendered surface a canonical deep link without breaking existing URLs.

## Acceptance criteria checklist

- [x] Rail has exactly the six approved modes and no setup mode.
- [x] Primary navigation has no more than eight items.
- [x] Every rendered view is reachable through rail/sub-rail, More, or command palette.
- [x] More destinations are filtered by the server surface list or tier fallback.
- [x] Role-aware navigation declutters without replacing backend authorization.
- [x] Navigation labels resolve in all ten supported locales.
- [x] Every navigation destination has a canonical deep link; existing deep links still resolve.
- [x] Major destinations require no more than two clicks or are command-palette reachable.
- [x] Breadcrumbs and the contextual work-item panel preserve shell orientation.
- [x] Keyboard and axe accessibility checks pass.

## Validation

- `npm run epic:6`
- `npm run verify`
- `cd works-frontend && npm run verify`
- `cd works-backend && ./mvnw -Dgroups=unit -Dtest=RbacControllerAccessTest test`

No schema or API response-shape change is required. Flyway remains at V119.

---

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
