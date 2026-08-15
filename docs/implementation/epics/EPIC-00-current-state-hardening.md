# EPIC 00 - Current-State Hardening, Truth, and Delivery Baseline

## Blueprint references

- Implementation blueprint: EPIC 0 - Current-State Hardening, Truth, and Delivery Baseline
- UI/UX blueprint: product experience architecture, premium reliability, quality gates
- V.20 execution decision: harden, simplify, consolidate, and polish before expansion
- V1.6 overlay: repository safety and docs, baseline checks, no broad feature expansion

## Objective

Establish a trustworthy repository baseline before major redesign or feature expansion.

## Why this matters

The product is already broad. The immediate risk is stale documentation, source-control artifacts,
security drift, and unclear execution sequencing. A reliable baseline keeps future Claude Code/Codex
work safe.

## Current codebase findings

- README still listed Spring Boot 4.0.x and Flyway V65, while the repo uses Spring Boot 4.1.0 and
  migrations through V109.
- Root `node_modules/`, ZIP archives, and runtime logs were tracked in Git despite `.gitignore`.
- Backend Dockerfile already copies `target/works-*.jar`, satisfying the jar copy-pattern item.
- Query-param JWT was accepted by the JWT filter on all API paths, not only the realtime SSE stream.
- Status category resolution is already centralized in the current base and should be verified as
  part of the baseline.
- Roadmap docs already preserve modes as Home, Deliver, Insight, Service, Know, Extend.

## Files and modules inspected

- `README.md`
- `DEPLOY-LOCAL.md`
- `TECH-DEBT.md`
- `.gitignore`
- `package.json`
- `works-backend/pom.xml`
- `works-backend/Dockerfile`
- `works-backend/src/main/resources/application.properties`
- `works-backend/src/main/java/com/bcits/works/SecurityConfig.java`
- `works-backend/src/main/java/com/bcits/works/JwtUtil.java`
- `works-backend/src/main/java/com/bcits/works/StatusDurationController.java`
- `works-backend/src/main/java/com/bcits/works/SprintController.java`
- `works-backend/src/main/java/com/bcits/works/BoardWipLimitService.java`
- `works-backend/src/main/resources/db/migration`
- `docs/implementation/BSMART-TRANSFORMATION-ROADMAP.md`
- `docs/implementation/ROADMAP-STATE.md`

## Requirements breakdown

## UI/UX requirements

- Preserve the existing mode rail model: Home, Deliver, Insight, Service, Know, Extend.
- Do not introduce visible navigation changes in EPIC 0.

## Backend requirements

- Restrict query-param JWT authentication to `/api/v1/realtime/stream`.
- Preserve `Authorization: Bearer` behavior for all normal API paths.
- Verify centralized status category resolution remains covered for flow metrics, sprint reporting,
  and WIP-limit behavior.

## Frontend requirements

- No frontend implementation changes in this EPIC.

## Data model / migration requirements

- No schema changes in this EPIC.
- Next migration remains V110 if later EPICs require database changes.

## Security and RBAC requirements

- Query-param JWT must not authenticate normal API paths.
- No tenant/RBAC broadening.

## AI behavior requirements

- No AI runtime behavior changes in this EPIC.

## Accessibility requirements

- No UI changes in this EPIC.

## Observability requirements

- Current-state inventory records baseline risks and deferred items.

## Test plan

- `npm run ai-rules:check`
- `npm run guardrails`
- `cd works-backend && ./mvnw -Dgroups=unit -Dtest=SecurityConfigJwtFilterTest,StatusDurationCategoryResolverTest,SprintReportTest,BoardWipLimitEnforcementTest test`
- Broader verification as practical before PR.

## Acceptance criteria checklist

- [x] README reflects Spring Boot 4.1.0 and Flyway V109.
- [x] DEPLOY-LOCAL reflects current Flyway migration high-water.
- [x] `CURRENT-STATE.md` exists.
- [x] Docker backend image uses `works-*.jar`.
- [x] Source-control artifacts are removed from Git tracking.
- [x] Query-param JWT is accepted only on realtime SSE.
- [x] Regression tests cover query-param JWT scope.
- [x] Shared status category resolver coverage is verified for flow metrics, sprint reporting, and
  WIP limits.

## Out of scope

- Full EPIC 1 tenant/RBAC hardening.
- App shell refactor.
- V1.6 feature implementation.
- Messenger, operating model, dynamic boards, AI coach, and Admin Studio expansion.

## Risks and mitigations

- Removing tracked `node_modules/` creates a large deletion diff. This is intentional source hygiene;
  dependencies remain reproducible from lockfiles.
- Query-param JWT behavior could affect non-SSE clients relying on insecure query tokens. This is
  intentional; such clients must send `Authorization: Bearer`.

## Implementation task list

- [x] Create EPIC 0 plan.
- [x] Create `CURRENT-STATE.md`.
- [x] Update stale README/DEPLOY facts.
- [x] Remove tracked dependency/archive/log artifacts.
- [x] Restrict query-param JWT to realtime SSE.
- [x] Add regression test.
- [x] Verify existing shared status category resolution.

---

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
