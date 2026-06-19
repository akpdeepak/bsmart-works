# EPIC 00 Completion - Current-State Hardening, Truth, and Delivery Baseline

## Date

2026-06-19

## Branch

`epic/00-current-state-hardening`

## Pull request

[#393](https://github.com/akpdeepak/bsmart-works/pull/393)

## Summary

EPIC 0 establishes the safe baseline for continuing the bSmart Transformation Roadmap V.20 across
Claude Code, Codex, and future GPT Code sessions.

## Completed scope

- Added `CURRENT-STATE.md` as the durable inventory of repo reality, implemented surfaces, guarded
  areas, deferred expansion, and transformation safety rules.
- Updated stale README and local deploy facts to reflect Spring Boot 4.1.0 and Flyway migrations
  through V109, with V110 as the next migration number.
- Added EPIC 0 implementation plan and completion note under `docs/implementation/epics/`.
- Removed generated/dependency/runtime artifacts from Git tracking: root `node_modules/`, ZIP
  archives, and backend runtime log artifacts.
- Expanded `.gitignore` so ZIPs and runtime logs do not re-enter source control.
- Hardened JWT handling so `access_token` query-param authentication is accepted only on
  `/api/v1/realtime/stream`; normal API paths continue to require `Authorization: Bearer`.
- Verified the existing shared status-name category resolver remains covered across status-duration
  metrics, sprint reporting, and WIP-limit enforcement.
- Preserved the roadmap mode model: Home, Deliver, Insight, Service, Know, Extend.
- Preserved the existing work-item hierarchy/taxonomy.

## Validation

- `npm run ai-rules:check` - passed.
- `npm run guardrails` - blocking rules passed; two known baseline-debt warnings remain non-blocking.
- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=SecurityConfigJwtFilterTest,StatusDurationCategoryResolverTest,SprintReportTest,BoardWipLimitEnforcementTest" test` - passed, 25 tests.
- `npm run verify` - passed.
- `cd works-backend && .\mvnw.cmd -Dgroups=unit verify` - passed, 1,315 tests, 0 failures, 0 errors.

## Known baseline debt carried forward

- Frontend status-management color inputs still contain raw hex fallback values.
- `page-layout.jsx` still contains one arbitrary width reference in a comment.
- Maven reports a Mockito dynamic-agent warning under the current JDK; tests still pass.

## Deferred scope

- EPIC 1 multi-tenant security and RBAC hardening.
- EPIC 2 production configuration, deployment, and secrets safety.
- EPIC 25 partial reliability, testing, accessibility, performance, and quality gates.
- V1.6 feature expansion items, including team-first onboarding, dynamic query boards, bSmart
  Messenger, AI work coach, and Admin/Owner configurability.

## Resume point

After this EPIC is merged to `main`, resume with EPIC 1 unless GitHub evidence shows a newer roadmap
EPIC has already been completed.
