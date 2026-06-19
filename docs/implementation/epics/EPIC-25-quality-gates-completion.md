# EPIC 25 Partial Completion Note - Quality Gates

## Completed scope

- Added `scripts/quality-gates.mjs`.
- Added `npm run quality-gates` and included it in root `npm run verify`.
- Added CI job `Quality gates (API, a11y, AI fallback)`.
- Added API contract drift detection for static frontend API routes against backend controller
  mappings.
- Added gate checks for the axe a11y harness/coverage floor and visible AI fallback telemetry.
- Repaired frontend custom-field value calls to use `/field-defs/values/...`.
- Repaired field-visibility settings calls to use `/permission-schemes/field-visibility/...`.
- Added a permission-scheme field-visibility delete mapping.
- Added `KnowledgePresenceController` for the existing knowledge presence and edit-lock client
  contract.

## Validation

- `npm run quality-gates`
- `cd works-frontend && npm test -- field-settings presence`
- `cd works-backend && .\mvnw.cmd -DskipTests "-Djacoco.skip=true" verify`

The quality gate passed, focused frontend route/presence tests passed 37/37, and backend
compile/checkstyle completed with 0 Checkstyle violations.
