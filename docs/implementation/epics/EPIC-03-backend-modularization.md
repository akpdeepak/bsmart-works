# EPIC 03 - Backend Modularization and Service Boundaries

## Blueprint references

- Implementation blueprint: EPIC 3 - Backend Modularization and Service Boundaries
- UI/UX expanded blueprint: backend service boundaries that keep future UI flows coherent
- ADR-0001: modulith now, extract services only when reuse/scale/team triggers justify it
- V1.6 overlay: API-first modular monolith boundaries and future microservice path

## Objective

Move the backend from one large flat package toward domain-aligned modules with enforceable
boundaries, explicit APIs, and smaller controller/service responsibilities.

## Scope in this EPIC

- Establish canonical backend module package markers.
- Strengthen architecture tests so module scaffolding and acyclic package boundaries are enforced.
- Split `WorkItemController` responsibilities into query, command, hierarchy, starring/watching,
  and shared read-support services/controllers.
- Split or reduce `DashboardService` by role/domain responsibility.
- Split `AiAssistService` into command parsing, summarization/answering, deterministic fallback, and
  provider orchestration services.
- Add DTOs where endpoint contracts currently rely on broad ad hoc maps and the change is low-risk.

## Acceptance criteria checklist

- [x] `WorkItemController.java` is below 400 lines.
- [x] `DashboardService.java` is reduced or split by role/domain.
- [x] `AiAssistService.java` is reduced or split by command/summarization/fallback/provider concern.
- [x] No new controller contains complex SQL-heavy orchestration.
- [x] ArchUnit/module tests prevent domain cycles and missing module markers.
- [x] API DTOs are explicit for touched contracts.
- [x] Existing backend tests remain green.

## Implementation summary

- Added canonical module package markers for `auth`, `workspace`, `workitem`, `project`,
  `messaging`, `devsync`, `ai`, `knowledge`, `service`, `sla`, `reporting`, `automation`,
  `security`, and `shared`.
- Extended `ArchitectureTest` with a durable marker-presence gate while preserving the existing
  service/controller/repository layering and acyclic package gates.
- Populated all 14 declared modules with production code and enforced cycle, shared-kernel direction,
  non-vacuity, and flat-root budget rules.
- Split `WorkItemController` into a 187-line route layer backed by read, command, bulk, hierarchy,
  and engagement services, with no controller-owned JDBC or RBAC orchestration.
- Split `DashboardService` into a 35-line facade over role dashboard query orchestration.
- Split AI command execution and summarization out of `AiAssistService` and inject those boundaries.
- Replaced the work-item bulk endpoint's ad hoc map with validated `WorkItemBulkRequest`.

## Validation completed

- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=ArchitectureTest,WorkItemControllerAccessTest,WorkItemTenantScopeTest,WorkItemTrashRouteTest,WorkItemControllerPaginationTest" test`
- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=ArchitectureTest,DashboardControllerAccessTest,WorkItemControllerAccessTest,WorkItemTenantScopeTest,WorkItemTrashRouteTest,WorkItemControllerPaginationTest" test`
- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=ArchitectureTest,AiAssistServiceTest,AiHeuristicsTest,AiAssistControllerAccessTest" test`
- `cd works-backend && .\mvnw.cmd -Dgroups=unit verify`
- `npm run quality-gates`
- `npm run verify`
- `node scripts/epics-01-05-completion.mjs`

Current closeout result (2026-07-19): 1,454 tests passed, JaCoCo thresholds met, and Checkstyle has
zero violations.

## Initial implementation strategy

1. Add the module catalog and package markers first.
2. Make architecture tests enforce marker presence and acyclic modules.
3. Refactor Work Item read/query support into dedicated services, keeping route behavior unchanged.
4. Refactor Work Item command/hierarchy responsibilities.
5. Refactor Dashboard and AI services in smaller commits.
6. Run focused tests after every split and broad backend verify before PR.

## Validation plan

- `cd works-backend && .\mvnw.cmd -Dgroups=unit "-Dtest=ArchitectureTest,WorkItemControllerAccessTest,WorkItemTenantScopeTest,WorkItemTrashRouteTest,WorkItemControllerPaginationTest,AiAssistServiceTest" test`
- `cd works-backend && .\mvnw.cmd -Dgroups=unit verify`
- `npm run quality-gates`
- Full GitHub CI before merge.

## Out of scope

- Extracting separate deployable services.
- Schema-per-module migration.
- Frontend `App.jsx` refactor, which belongs to EPIC 4.
- Repository-wide replacement of every legacy, workspace-scoped JDBC adapter outside the named
  WorkItem/Dashboard/AI orchestration targets.
