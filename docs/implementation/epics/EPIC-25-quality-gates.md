# EPIC 25 Partial - Reliability, Testing, Accessibility, Performance, and Quality Gates

## Blueprint references

- Implementation blueprint: EPIC 25 - Reliability, Testing, Accessibility, Performance, and Quality Gates
- UI/UX expanded blueprint: EPIC 25 quality, accessibility, performance, and QA gates
- Final execution decision: complete key quality gates before broad feature expansion
- V1.6 overlay: validation, E2E scope, API-first safety, performance and hardening requirements

## Objective

Make Phase 1 quality gates executable in CI so future EPICs cannot silently add broken frontend API
calls, remove accessibility coverage, or hide AI fallback telemetry.

## Scope in this PR

- Add a root `quality-gates` script and CI job.
- Fail CI when static frontend `api.raw` / `api.send` routes do not match backend controller mappings.
- Keep the axe accessibility harness and coverage floor visible as a CI-enforced gate.
- Keep AI fallback telemetry visible in Admin/AI settings surfaces.
- Fix stale frontend custom-field value routes to use the existing `field-defs/values` API.
- Fix field-visibility settings routes to use permission-scheme APIs and add the missing delete
  mapping.
- Add backend endpoints for the existing knowledge presence/edit-lock client contract.

## Acceptance criteria checklist

- [x] CI fails on frontend calls to nonexistent backend endpoints.
- [x] CI fails if the axe harness or a11y coverage floor is removed.
- [x] CI fails if AI fallback telemetry disappears from admin-facing surfaces.
- [x] Bundle budget remains enforced by the existing CI job.
- [x] Existing guardrails still block production `WS-001` and unsafe workspace query regressions.
- [x] Focused route/presence frontend tests pass.
- [x] Backend compile/checkstyle passes.

## Test plan

- `npm run quality-gates`
- `cd works-frontend && npm test -- field-settings presence`
- `cd works-backend && .\mvnw.cmd -DskipTests "-Djacoco.skip=true" verify`
- `npm run verify`
- PR CI full gate before merge.

## Out of scope

- Making the on-demand Playwright workflow a required PR gate.
- Full App.jsx decomposition.
- Full strict-mode guardrail cleanup for existing frontend baseline warnings.
- New product modules or broad V1.6 feature expansion.

---

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
