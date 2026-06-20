# EPIC 0–11 Traceability Matrix

Last updated: 2026-06-20
Branch: work/epic0-11-phaseA

This document maps EPIC 0 → EPIC 11 requirements (docs/implementation/epics) to repository code and test artifacts and marks status per requirement. Use this as the authoritative checklist for Phase A (discovery & stabilize) and to drive subsequent implementation PRs.

Legend
- Status: Correctly built / Partially built / Incorrectly built / Not built
- Effort: S = small (1–3d), M = medium (4–8d), L = large (2–4w)
- Priority: P0 = unblocker, P1 = near-term, P2 = medium-term

Summary by EPIC

---

## EPIC 00 — Current-State Hardening (Baseline)
Docs: docs/implementation/epics/EPIC-00-current-state-hardening.md

Key requirements
- Repository baseline truth, README updates, .gitignore cleanup, JWT query-param restriction for realtime only, test gating.

Status: Correctly built
Evidence:
- CURRENT-STATE.md committed
- EPIC 00 docs & completion: docs/implementation/epics/EPIC-00-current-state-hardening.md and EPIC-00-completion.md
- JWT hardening noted in EPIC-00 completion and SecurityConfig/JwtUtil present in backend (works-backend/src/main/java/com/bcits/works).

Remaining actions (Phase A)
- Verify runtime that `access_token` query-param only authenticates `/api/v1/realtime/stream` via integration test.
- Confirm CI guardrails execute ai-rules and guard scripts on PRs.

Estimate / Priority
- Effort: S
- Priority: P0

---

## EPIC 01 — Tenant / RBAC Hardening
Docs: docs/implementation/epics/EPIC-01-tenant-rbac-hardening.md

Key requirements
- Star/unstar workspace scoping, SCIM issuance requires specific permissions, dashboard role endpoints require explicit workspace, remove BQL fallback to WS-001.

Status: Partially built (requires verification & fixes)
Evidence found:
- EPIC doc exists and security notes: docs/implementation/epics/EPIC-01-tenant-rbac-hardening.md, EPIC-01-security-notes.md
- Backend services such as RbacService referenced in docs and codebase.

Issues / Gaps
- Need to audit WorkItemController, Star/Unstar flows: confirm resolution via RbacService.workspaceForWorkItem and not allowing cross-tenant writes. (Files to inspect: works-backend/src/main/java/com/bcits/works/*WorkItemController*.java and starred_items queries.)
- Dashboard endpoints: ensure they use AuthenticatedUser.id() rather than userId query param. (Files: DashboardController, DashboardService.)
- BQL fallback check: search for WS-001 fallback occurrences and add guard tests.

Next steps (Phase A)
- Add unit tests for star/unstar tenant scoping and dashboard workspace scoping.
- Patch controllers where necessary and include not-found semantics for cross-tenant access.

Estimate / Priority
- Effort: M
- Priority: P0

---

## EPIC 02 — (Production configuration & RBAC continuation)
Docs: (not found explicitly in epics index)

Status: Not built / Not found
Notes:
- The roadmap references EPIC 2 but no dedicated EPIC-02 doc was found in the epics directory in the discovery pass. We will create an EPIC-02 plan and then implement.

Next steps
- Create docs/implementation/epics/EPIC-02-prod-config.md with scope: secrets management, deploy hardening, branch protections and runbooks.

Estimate / Priority
- Effort: M
- Priority: P1

---

## EPIC 03 — Backend Modularization
Docs: docs/implementation/epics/EPIC-03-backend-modularization.md

Status: Correctly built
Evidence:
- EPIC 03 doc and completion notes exist; ArchitectureTest and split services exist (WorkItemReadService, WorkItemCommandService, AiSummarizationService).

Next steps
- Run module architecture tests and full backend `mvnw verify` in CI to confirm no regressions.

Estimate / Priority
- Effort: S (verification)
- Priority: P1

---

## EPIC 04 — Frontend Architecture Refactor
Docs: docs/implementation/epics/EPIC-04-frontend-architecture-refactor.md

Status: Correctly built
Evidence:
- App boundary created: works-frontend/src/app/AppShell.jsx and thin App.jsx. Architecture tests in frontend.

Next steps
- Continue extraction of providers/routes per EPIC 4 follow-ons.

Estimate / Priority
- Effort: S
- Priority: P1

---

## EPIC 05 — (Not located)
Status: Not found / Not built
Action
- Run full epics directory scan; if EPIC-05 missing, author EPIC-05 placeholder and request sponsorship for scope.

Estimate / Priority
- Effort: S
- Priority: P2

---

## EPIC 06 — Simplified Navigation & IA
Docs: docs/implementation/epics/EPIC-06-simplified-navigation-completion.md

Status: Correctly built
Evidence:
- nav-model.js and nav-model.test.js exist at works-frontend/src/lib
- EPIC completion doc present

Next steps
- Verify navigation tests run in CI and validate role-aware default surfaces.

Estimate / Priority
- Effort: S
- Priority: P1

---

## EPIC 07 — (Not located)
Status: Not found / Not built
Action
- Locate or create EPIC-07 doc. Follow V.20 sequence.

Estimate / Priority
- Effort: S
- Priority: P2

---

## EPIC 08 — Smart Inbox
Docs: docs/implementation/epics/EPIC-08-smart-inbox.md

Status: Partially built / In progress
Evidence:
- EPIC doc exists describing a Smart Inbox classifier and UI changes. Need to confirm code artifacts (classifier, notifications view changes).

Issues / Gaps
- Confirm presence of classifier and notifications view split in works-frontend/components/notifications*.
- Ensure RBAC/privacy constraints applied to notification sources.

Next steps (Phase A)
- Implement/verify classifier logic, add unit tests and ensure UI uses classifier for badge counts.

Estimate / Priority
- Effort: M
- Priority: P1

---

## EPIC 09 — (Not located)
Status: Not found / Not built
Action
- Locate or author EPIC-09 plan.

Estimate / Priority
- Effort: S
- Priority: P2

---

## EPIC 10 — Work Item Experience Redesign
Docs: docs/implementation/epics/EPIC-10-work-item-experience.md

Status: Partially built / In progress
Evidence:
- EPIC doc and current-slice mention works-frontend/src/lib/work-item-execution-brief.js and rendering in work item detail.

Issues / Gaps
- Verify inline update reliability, AI assistance integration, and source citations (AiAssistService connectors) in the work-item detail component.
- Ensure performance of detail view and add tests for optimistic updates.

Next steps
- Unit & integration tests for execution brief and inline updates; link to AiAssistService fallback behavior.

Estimate / Priority
- Effort: L
- Priority: P1→P2 depending on criticality

---

## EPIC 11 — (Not located)
Status: Not found / Not built
Action
- Locate EPIC-11 doc or create it per roadmap ordering.

Estimate / Priority
- Effort: S
- Priority: P2

---

Global cross-EPIC gaps and high-priority refactors (Phase A targets)

1) Portal API contract & backend coverage (P0)
- Problem: Frontend assumes a stable set of portal endpoints (CustomerPortal, portalChatClient, KB) that may not be fully implemented server-side.
- Action: Add OpenAPI contract and backend stubs; add contract tests and Playwright E2E for the core portal flow.
- Effort: M

2) Chat transport centralization (P0 → P1)
- Problem: Current widget polls every 8s (works-frontend/src/components/works/organisms/support-chat-widget.jsx).
- Action: Refactor portalChatClient to pluggable transport; initially keep polling but encapsulated so SSE/WS swap later is straightforward.
- Effort: S–M

3) RBAC enforcement & multi-tenant scoping (P0)
- Problem: star/unstar, dashboard, BQL fallback previously allowed tenant leaks (EPIC 1). Partial fixes exist in docs but must be verified in code with tests.
- Action: Add unit tests and fix controllers/queries to enforce workspace predicates.
- Effort: M

4) Observability & telemetry (P1)
- Problem: Missing metrics hooks for API timings, chat events.
- Action: Instrument apiClient (works-frontend/src/lib/apiClient.js) and backend controller entry points; export counters and request latencies.
- Effort: M

5) Accessibility & design-system consolidation (P1)
- Problem: Accessibility program (ACCESSIBILITY.md) and many UI primitives require alignment.
- Action: a11y audit, fix critical issues, extract shared atoms, Storybook improvements.
- Effort: L

Phase A deliverables (first PRs)
- docs/implementation/traces/epic-0-11-trace.md (this file)
- docs/openapi/portal.yaml (OpenAPI v3 contract)
- works-backend: controller stubs for portal endpoints that implement contract
- works-backend: unit tests for RBAC star/unstar and dashboard scoping
- works-frontend: portalChatClient refactor to pluggable transport
- works-frontend/e2e/playwright tests for login→create→view request flow
- .github/workflows/ci-epic0-phaseA.yml (CI job running contract test + E2E)

Phase A acceptance criteria (must be green in CI)
- Traceability file present and reviewed
- OpenAPI contract added
- Backend stubs conform to contract and are consumed by the frontend in dev
- RBAC tests passing locally
- Playwright tests pass against the dev stack using stubs

Next steps (what I will do now)
1. Commit this traceability file to branch `work/epic0-11-phaseA` (done).
2. Add docs/openapi/portal.yaml and the minimal backend stubs + tests in small incremental commits. I will open PRs as each logical group completes and request reviewers.

If you agree I will proceed to implement Phase A (OpenAPI + backend stubs + RBAC tests + portalChatClient refactor + E2E skeleton). Confirm:
- Use dev-mode stubs for external services (chat/AI/KB) — default YES
- Add CI workflows in the repository — default YES

If you prefer real integration with external AI services now, provide dev/test credentials; otherwise I will implement stubs so E2E runs in CI without secrets.

---

Commit notes
- Created: docs/implementation/traces/epic-0-11-trace.md in branch work/epic0-11-phaseA

