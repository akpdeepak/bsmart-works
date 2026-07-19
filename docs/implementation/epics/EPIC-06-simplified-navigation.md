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
