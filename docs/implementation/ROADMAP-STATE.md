# bSmart Works Roadmap State V.20

This file is the durable resume ledger for Claude Code, Codex, GPT Code, and future AI coding
sessions.

Update this file after every meaningful roadmap session, PR, merge, validation run, or handoff.

## Current status

- Program mode: **maximal-scope end-to-end completion** (Deepak, 2026-06-20). The authoritative tracker
  is now `docs/implementation/MASTER-COMPLETION-ROADMAP.md`; this file remains the cross-session resume
  ledger.
- Active phase: **Phase 3 — consolidate EPICs 3–12 to full scope.** Phase 2 completed and merged
  2026-07-18 via PR #481; Phase 1 completed 2026-06-21 (PRs #415–#441). EPICs 1–5 have now been
  re-verified against production code and executable gates; EPIC 6 is merged and post-merge
  verified, and EPIC 7 is code-verified complete on `codex/epic-07-today-completion` pending its
  remote PR/CI/merge gate. EPIC 8 remains untouched until that merge completes.
  - ✅ **W2-b god classes — all four split & merged:** `ArticleController`→`ArticleService` (PR #446),
    `KpiService`→`KpiMetricCalculator` (PR #447), `BqlCompiler`→`BqlParser`+`BqlSqlEmitter` (PR #448),
    `WorkItemCommandService`→`WorkItemFieldCopier` (PR #449).
  - ✅ **W2-d:** `locales.js` code-split by language, English-only main bundle (PR #451);
    `BlockEditor` + the six knowledge-view overlays lazy-loaded via React.lazy/Suspense — initial JS
    162.9→140.7 kB gz (PR #452); the completion slice preserved the split and bundle-budget gate.
  - ✅ **W2-e:** `AsyncBoundary` covers the six list/table views plus the primary console, PM,
    Compliance, Service, marketplace, and support loading surfaces.
  - ✅ **W2-f:** the 3 `#94A3B8` hex values were tokenized (PR #450), all legacy structural
    violations were migrated, and the `worksViewStructureLegacy` override was removed.
  - ✅ **W2-a (G-1 kernel):** 35 kernel classes + `dto/` moved to `com.bcits.works.shared` (errors/
    envelope, event store, crypto, the whole tenancy cluster, BQL kernel, utils) — pure move (5
    substantive lines), new ArchUnit rule `sharedKernelDoesNotDependOnDomainModules`, validated by
    1,449 unit tests + real `ddl-auto=validate` boot (PR #454). **Next: G-2 domain carve,
    Identity-first (`auth` → `workspaces` → `security` → rest), one module per PR** with the
    `RbacService` port in shared landing with the auth carve.
  - ✅ **W2 G-2 domain carve (in progress, Identity-first):** `auth` (PR #462, 43 classes) and
    `workspaces` (PR #463, 25 classes) carved, preceded by the `RbacGate` port (PR #460) and
    `EmailService` (PR #461) landing in shared. **`security` carved next (this PR):** 60 flat-root
    classes relocated — 42 to `com.bcits.works.security` (compliance rules/violations/evaluation/
    escalation, audit-log query surface `AuditLogService`/`AuditStreamService`/`AuditSavedQuery`/
    `BqlRunAudit*`, data-privacy/DSAR, evidence packages, PII-vault domain adapters
    `*PiiService`/`DataPrivacyService`/backfill, `SecurityConfig`, `SecurityAdminController`),
    **17 to `shared`** and **1 (`UserPiiService`) to `auth`**. The 17→shared were forced by the
    kernel rule (shared crypto/BQL depend on them, incl. same-package transitive deps invisible to
    imports): the crypto-shred primitives (`WorkspaceSecuritySettings*`, `SubjectDataKey*`,
    `SecurityAuditLogService` + its storage `AuditHashChain`/`AuditLogEntry(+Repo)`), the PII-vault
    **core** (`PiiVaultService`/`Entry`/`Repository`/`Policy`, `BlindIndexService` — same family as
    the already-shared `EncryptionService`/KMS), and the FLS resolver (`FieldVisibility(+Repo+Service)`,
    pinned by `BqlContextFactory`). **Boundary decision (Deepak, Option A):** pin kernel-needed
    classes to `shared` rather than port-extract or revert the #454 kernel; `UserPiiService`→`auth`
    (identity-PII adapter). Result: `auth↔security` and `shared↔security` cycles removed, all edges
    one-directional. **Pure move** (only the 1 forced widening `EvidencePackageService.renderBundle`
    → public + `ComplianceEvaluationServiceTest` co-located for package-private access). Validated:
    ArchUnit acyclic-slices + kernel-direction green, unit suite + 0 Checkstyle, guardrails, real
    `ddl-auto=validate` boot (13.9s). High-water still V119 (no schema change).
  - ✅ **W2 G-2 `workitems` carved (this PR, PR-5):** 42 of 46 work-item-domain classes moved to
    `com.bcits.works.workitems` (`WorkItem*` read/command/bulk, `WorkItemLink*`, `FieldLayout*`,
    `WorkItemTypeConfig*`, `Workflow*`/`WorkflowRuleEngine`/`WorkflowStatus*`/`WorkflowTransition*`,
    `Status*` config/duration/resolver, `DodChecklist*`, `WorkLog*`, `FieldDefController`). **4 left
    in root by design** — `FieldDef`, `FieldDefRepository`, `WorkItemFieldValue`,
    `WorkItemFieldValueRepository` — because `auth.PermissionSchemeController` and
    `security.PiiVaultBackfillService` reach into them; moving them now would create
    `auth↔workitems` / `security↔workitems` cycles. They carve once those consumers move behind a
    workitems read-port (plan §3). The shared BQL/FLS kernel references field *names*, not the
    entity classes, so **no kernel pin** was needed. Pure move: sole non-import change is widening
    the shared `StatusCategoryResolver` (class + `TODO`/`IN_PROGRESS`/`DONE`/`from`/`normalize`) to
    public for its board/sprint consumers; `StatusDurationServiceTest` co-located. Validated:
    ArchUnit acyclic-slices + kernel green, unit suite + 0 Checkstyle, guardrails, real
    `ddl-auto=validate` boot (14.9s). No schema change (V119).
  - ✅ **W2 G-2 `projects` carved (PR-6):** 57 of 59 project-domain classes moved to
    `com.bcits.works.projects` (`Project*`, `Sprint*`, `Release*`, `Board*`, `Ceremony*`, `Retro*`,
    `Standup*`, `Impediment*` (SLA), `CrossProjectDependency*`, `Dependency*`, `RoadmapTheme*`,
    `OkrLink*`, `Raid*`). **2 left in root** — `BoardWipLimitService` (referenced by
    `workitems.WorkItemCommandService`/`Controller` → would cycle) and `ImpedimentService` (mutual
    with `workspaces.TeamRoleService` → would cycle); both carve once those consumers move behind
    ports. `workspaces→projects` (TeamRoleService→Sprint/Ceremony/ProjectTeamMember) is one-way,
    allowed. Pure move + 5 forced method widenings to public (`SprintVarianceService.rate/burndown`,
    `CockpitDigestService.jdbcDay`, `ImpedimentService.ageDays/slaBreached`) for cross-package
    callers; 6 focused `*ServiceTest` co-located. Validated: ArchUnit + unit + 0 Checkstyle +
    guardrails + `ddl-auto=validate` boot (14.1s). No schema change (V119).
  - ✅ **W2 G-2 `sla` carved (PR-7):** all 23 SLA-domain classes moved to `com.bcits.works.sla`
    (`SlaPolicy*`, `SlaInstance*`, `SlaTarget*`, `SlaCalendar*`, `SlaEscalation*`, `SlaCalculationService`,
    `SlaEvaluationService`, `SlaNotificationService`, `SlaClockScheduler`, `SlaReportController`,
    `CustomerSlaTier*`) — fully decoupled: no kernel pin, no cross-module edges either direction,
    **true pure move** (zero non-import changes). ArchUnit + unit + 0 Checkstyle + guardrails +
    `ddl-auto=validate` boot green. V119.
  - ✅ **W2 G-2 `reporting` carved (PR-8):** 49 of 51 reporting-domain classes moved to
    `com.bcits.works.reporting` (`Dashboard*`, `Report*`, `Widget*`, `Kpi*`, `Metric*`, `Pivot*`,
    `Funnel*` controllers, `Leadership*`, `Executive*`, `ConversationalDashboard*`, `TodayLayoutController`,
    `ChartType`). **2 left in root** — `FunnelService` (reached by `workitems.WorkItemCommandService`/
    `Controller` + `workspaces.WorkspaceService`/`WorkspaceSetupService`) and `TodayLayoutService`
    (reached by `workspaces.TeamRoleService`); both would cycle. Remaining `reporting→projects/
    workitems/workspaces` edges are one-way. Pure move + 6 forced widenings to public
    (`DashboardNumbers` class + `toLong`, `DashboardSummaryService.toSeries`,
    `LeadershipService.allocationState/riskScore/healthScore`); 6 focused tests co-located.
    Validated: ArchUnit + unit + 0 Checkstyle + guardrails + `ddl-auto=validate` boot (17.6s). V119.
  - ✅ **W2 G-2 `ai` carved (PR-9):** 32 of 37 AI-domain classes moved to `com.bcits.works.ai` —
    the whole AI Control Plane (`AiControlPlaneService`, `AiPolicy*`, `AiBudget*`, `AiCache*`,
    `AiInvocation*`, `AiProvider`, `AiModelTier`), agents (`AiAgent*`), assistants (`AiAssistant*`),
    memory (`AiMemory*`), `AiAssistService`/`AiCommandExecutionService`/`AiSummarizationService`,
    `AiHeuristics`, `AiWorkspaceSettings*`, `StructuredExtraction*`. **5 left in root** —
    `AiCapabilities`/`AiController`/`Iteration16AiService` (they reference `reporting`, would cycle)
    and `AnomalyDetectionService`/`AnomalyDetector` (reached by `security.SecurityAdminController`,
    closing `ai→workitems→security→ai`). Pure move + 1 widening (`AiAssistService.AiMeta.of` →
    public); 5 focused tests co-located. **Analyzer upgraded** to full-module-graph cycle detection
    (multi-node paths, not just direct pairs) — `scratchpad/analyze_graph.py` pattern. Validated:
    ArchUnit + unit + 0 Checkstyle + guardrails + `ddl-auto=validate` boot (14.9s). V119.
  - ✅ **W2 G-2 `automation` carved (PR-10):** 23 of 27 classes moved to `com.bcits.works.automation`
    (`AutomationRule*`/`Run*`/`Scheduler`/`Controller`, `Integration*` incl. credentials/connections,
    `Marketplace*`, `Webhook*` subscription/delivery/controller, `OAuthCallbackController`).
    **4 left in root** — `WebhookService` (**kernel pin**: `shared.EventService` fans out webhooks on
    every event), `AutomationService` (only `automation→ai` edge, closed all 37 cycles),
    `AutomationCatalog` + `ExtensionExecutionService` (reached by `workitems`). **True pure move**
    (zero widenings); 2 tests co-located. ArchUnit + unit + 0 Checkstyle + guardrails +
    `ddl-auto=validate` boot (13.7s). V119.
  - ✅ **W2 G-2 `messaging` carved (PR-11):** 36 of 38 classes moved to `com.bcits.works.messaging`
    (`Notification*`, `Comment*`, `Chat*`, `Push*`, `Meeting*`, `ActionItem*`, `Watcher/Presence
    Service`, `RealtimeController`, `DecisionController/Repository`). **2 left in root** —
    `RealtimeService` (**kernel pin**: `shared.EventService` pushes SSE to it) and `Decision`
    (auth.ConditionalAccessEvaluator/Service reference it → auth↔messaging). True pure move (zero
    widenings); 2 tests co-located. ArchUnit + unit + 0 Checkstyle + guardrails +
    `ddl-auto=validate` boot. V119.
  - ✅ **W2 G-2 `service` carved (PR-12):** 24 of 30 customer-service classes moved to
    `com.bcits.works.service` (`ServiceRequest*`, `CustomerAccount*`, `CustomerFeedbackController/
    Service/Repository`, `Csat*`, `SupportChat*`, `CustomerPortal/AuthController`, `CustomerContext`,
    `StakeholderCommunication*`, `StakeholderController/Repository`). **6 entities/repos left in root**
    — `CustomerUser(+Repo)`, `CustomerFeedback(+Repo)`, `Stakeholder(+Repo)` — reached by the
    security PII adapters (`CustomerUserPiiService`, `PiiVaultBackfillService`, `StakeholderPiiService`);
    cutting `security→service` broke all 6 cycles. True pure move (zero widenings); 3 tests
    co-located. ArchUnit + unit + 0 Checkstyle + guardrails + `ddl-auto=validate` boot (25.8s). V119.
  - ✅ **W2 G-2 `knowledge` carved (PR-13):** 62 of 63 knowledge/document classes moved to
    `com.bcits.works.knowledge` (`Article*` — service/dao/versions/comments/reactions/tags/exporters/
    presence/workflow/approval, `KnowledgeSpace*`, `DocumentTemplate*`, `KnowledgeAiController`,
    `SpaceFollower*`, exporters `ArticlePdfExporter`/`ArticleDocxSerializer`). **1 left in root** —
    `KnowledgeAiService` (only `knowledge→ai` edge → `AiAssistService`/`AiControlPlaneService`; closed
    all 10 cycles). True pure move (zero widenings); 1 test co-located. ArchUnit + unit +
    0 Checkstyle + guardrails + `ddl-auto=validate` boot. V119.
  - ✅ **W2 G-2 `devsync` carved (PR-14) — LAST domain module:** all 13 DevSync classes moved to
    `com.bcits.works.devsync` (`CodeContext*`, `CodeLink*`, `PullRequest*`, `DeveloperWorkspace*`,
    `DeveloperPortalController`, `DeploymentHealthIndicators`). No module reaches into devsync → no
    cycle possible; true pure move (zero widenings); 1 test co-located. **G-2 domain carve COMPLETE:**
    all 14 modules populated (shared 68, auth 44, workspaces 26, workitems 43, projects 58, sla 24,
    reporting 50, ai 33, automation 24, messaging 37, service 25, knowledge 63, devsync 14,
    security 43). Root flat down 653→156 (the 156 are cross-cutting config/onboarding/cockpit +
    ~30 deferred cycle-breaker classes staged for later port-extraction). ArchUnit + unit +
    0 Checkstyle + guardrails + `ddl-auto=validate` boot. V119.
  - Bundle-budget gate (I-2) remains enforced in CI (`perf-budget`, 500 KB gz initial-JS ceiling).
  - ✅ **Phase 2 closeout:** all 14 backend modules are populated; the flat root fell 291→72;
    `AppShell.jsx` fell 4,628→3,028 with providers/auth/routes/shortcuts/feature state extracted;
    primary `AsyncBoundary` tranches are complete; the legacy view override is removed. Evidence:
    `docs/implementation/epics/PHASE-2-STRUCTURAL-REFACTOR-COMPLETION.md`.
  - ✅ Phase 0 (truth reconciliation + master ledger + restored CI pipeline) — PR #407.
  - ✅ **PII vault + crypto-shredding** EPIC complete — PRs #418–#424 (high-water through V114); only the
    deferred CONTRACT plaintext-column drop remains. See `EPIC-P1-pii-vault-completion.md`.
  - ✅ **#243 central tenant filter** — Slice A binding at the RBAC choke point (PR #426, flag-gated
    `tenant.filter.binding.enabled` default-off); Slices B+C transitive `@Filter` on all 22 transitive
    entities incl. `work_items` (PR #431, `@Filter` now on 136 entities, `TenantFilterCoverageTest`
    enforces every-entity-filtered-or-global); Slice D findById/PK-load gaps closed in 7 controllers
    (PR #432); Slice F doc/control-matrix reconciliation done (PR #436). **Slice E** (CONTRACT removal
    of redundant predicates) deferred until the binding flag soaks in a live env.
  - ✅ **Field-level security** — Slice 1 (read redaction) + Slice 2 (BQL HIDDEN-field exfil closed,
    PR #427) + Slice 3 (guard the rule surface + resolver test + FK index V116, PR #430). Slice 5
    (core-column FLS) deferred by Deepak. Seed/admin-UI for rules (Slice 4) still open (enforcement
    inert until rules authored — safe).
  - ✅ **Distributed rate-limit + JWT revocation** EPIC complete — PR1 token-version revocation (V115),
    PR2 jti blocklist + logout (V117, PR #433), PR3 distributed DB store (V118, PR #434, flag-gated),
    PR4 write-endpoint limiting (PR #435, flag-gated). See `EPIC-P1-rate-limit-jwt-revocation.md`.
  - ✅ **SOC2/ISO control matrix** — `docs/compliance/CONTROL-MATRIX.md` (control → code → test); stale
    SECURITY.md / SOC2 / ISO27001 caveats reconciled.
  - ✅ **WebAuthn** — real FIDO2 attestation/assertion via webauthn4j 0.31.7 complete: WA1 verifier +
    COSE schema (V119, PR #438), WA2 ceremonies behind a flag (PR #439), WA3 frontend
    `navigator.credentials` + passkey login (PR #440), WA4 legacy signed-nonce path removed (PR #441).
    Only the `public_key_pem` CONTRACT column-drop is deferred. See `EPIC-P1-webauthn-fido2.md` §6.
  - **Migration high-water: V119; next V120.** `mvn clean` before trusting boot/IT results.
  - **Flags shipped default-off (operational follow-up, not unexecuted scope):**
    `tenant.filter.binding.enabled` (central tenant-filter binding, canary-first) and
    `app.rate-limit.distributed` (DB-backed rate-limit store). Until flipped, isolation rests on the
    retained per-query predicates and rate limiting is per-instance.
  - **Deferred-by-design carryover into later phases:** #243 Slice E (CONTRACT predicate removal),
    FLS Slice 4 (seed demo rules) + Slice 5 (core-column FLS, Deepak 2026-06-21), PII-vault CONTRACT
    plaintext-column drop, WebAuthn `public_key_pem` column drop, Redis-backed rate limiting (AWS
    infra EPIC).
- Verified-status correction: EPICs 3–5 passed codebase closeout on 2026-07-19; EPICs 6–12 remain
  first slices (partial) and are governed by the master roadmap.
- Open follow-ups (flagged, not Phase-1-blocking): field-visibility tier-source reconciliation
  (`roles` V7 vs `role_def` V21); WorkflowController null-workspace branch + create-side body-workspaceId
  trust on Team/Report/etc + per-operation perm tightening on the Slice-D controllers; FLS rule seeding;
  the deferred #243 Slice E CONTRACT predicate removal.
- Last state update: 2026-07-19 (EPICs 1–5 codebase closeout: 18/18 executable checks, 1,454 backend
  tests, 123 integration tests, 1,771 frontend tests, production/Storybook builds, guardrails, fresh
  V119 runtime boot, and deployment checks; resume
  at EPIC 6 after GitHub merge validation).

## Trigger contract

When Deepak says `Start the bSmart Transformation Roadmap`, begin from EPIC 0 unless this file or
current GitHub evidence proves later work is already complete.

When Deepak says `Resume the bSmart Transformation Roadmap`, inspect this file, git status, local
branches, open PRs, EPIC plans, EPIC completion notes, and current GitHub `main` before deciding the
resume point.

## Source material

- `docs/implementation/BSMART-TRANSFORMATION-ROADMAP.md`
- `docs/implementation/source-documents/bSmart_Works_Final_Execution_Decision_Document.md`
- `docs/implementation/source-documents/bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
- `docs/implementation/source-documents/bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
- `docs/implementation/source-documents/bSmart_Works_AI_Agent_Implementation_Instructions.md`
- `docs/implementation/source-documents/bSmart_Works_V1_6_Claude_Codex_Roadmap.md`
- `C:\Users\user\Downloads\bSmart_Works_Final_Execution_Decision_Document.md`
- `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap.md`
- `C:\Users\user\Downloads\bSmart_Works_Implementation_Blueprint_Epic_Roadmap_UIUX_Expanded.md`
- `C:\Users\user\Downloads\bSmart_Works_AI_Agent_Implementation_Instructions.md`
- `C:\Users\user\Downloads\bSmart_Works_V1_6_Claude_Codex_Roadmap.md`
- `AGENTS.md`
- `CLAUDE.md`
- `ai-rules/*`

## V.20 execution decision

- Final priority: harden, simplify, consolidate, and polish before adding breadth.
- V1 product shape: minimal AI-native work command center for enterprise project, delivery, service,
  knowledge, and engineering visibility.
- Product principle: minimal by default, powerful on demand, accurate always.
- Execution priority layer:
  `docs/implementation/source-documents/bSmart_Works_Final_Execution_Decision_Document.md`
- Phase 1 remains mandatory before major expansion: EPIC 0, EPIC 1, EPIC 2, and EPIC 25 partial.
- Preserved product modes: Home, Deliver, Insight, Service, Know, Extend.
- Work-item hierarchy: preserve the current hierarchy/taxonomy as baseline. Add only logically needed,
  backwards-compatible extensions through explicit EPIC plans with migration/API/frontend/BQL/reporting
  and regression-test coverage.
- Do-not-start-yet constraints: broad messaging platform, full low-code suite, autonomous agents,
  marketplace expansion, advanced analytics, public community, heavy DevSync dashboards, and all
  admin builders at once.
- V1.6 is accepted as a requirements overlay, not as a competing implementation sequence. It adds
  team-first onboarding, delivery framework policies, five user types, Admin/Owner configurability,
  team-key work item IDs, inline BQL filters, dynamic query boards, bSmart Messenger, profile
  preferences, brand placement, premium states/microcopy, AI work coach, and modular monolith
  requirements. These must be mapped into the existing EPIC order.

## Resume checklist

- [ ] Inspect `git status --short --branch`
- [ ] Preserve unrelated local changes
- [ ] Identify current branch and open PR, if any
- [ ] Read active EPIC plan, if any
- [ ] Read latest completion note, if any
- [ ] Verify GitHub `main` state before claiming completion
- [ ] Continue from the latest safe point

## EPIC ledger

| EPIC | Status | Branch | PR | Local validation | Completion note | Notes |
|---|---|---|---|---|---|---|
| EPIC 0 - Current-State Hardening, Truth, and Delivery Baseline | Completed | `main` | [#393](https://github.com/akpdeepak/bsmart-works/pull/393) | `npm run verify`; `cd works-backend && .\mvnw.cmd -Dgroups=unit verify` | `docs/implementation/epics/EPIC-00-current-state-hardening-completion.md` | Baseline docs, source hygiene, JWT query-token scope, verified shared status category resolver |
| EPIC 1 - Multi-Tenant Security and RBAC Hardening | Code-verified complete | `codex/epics-01-05-completion` | #394 + [#485](https://github.com/akpdeepak/bsmart-works/pull/485) | 1,454 backend tests; 18/18 EPIC gate; guardrails | `docs/implementation/epics/EPIC-01-tenant-rbac-hardening-completion.md` | No production default tenant; cross-tenant star/watcher no-mutation; exact SSE query-token scope |
| EPIC 2 - Production Configuration, Deployment, and Secrets Safety | Code-verified complete | `codex/epics-01-05-completion` | #395 + [#485](https://github.com/akpdeepak/bsmart-works/pull/485) | 1,454 backend tests; three Compose templates; 18/18 EPIC gate | `docs/implementation/epics/EPIC-02-production-config-secrets-completion.md` | Startup guard, health probes, templates/CI smoke, backup/restore verification |
| EPIC 25 partial - Reliability, Testing, Accessibility, Performance, and Quality Gates | Completed | `main` | [#396](https://github.com/akpdeepak/bsmart-works/pull/396) | `npm run quality-gates`; `cd works-frontend && npm test -- field-settings presence`; `cd works-backend && .\mvnw.cmd -DskipTests "-Djacoco.skip=true" verify`; `npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-25-quality-gates-completion.md` | API contract drift gate, a11y coverage gate, AI fallback telemetry gate, stale route repairs |
| EPIC 3 - Backend Modularization and Service Boundaries | Code-verified complete | `codex/epics-01-05-completion` | #397 + [#485](https://github.com/akpdeepak/bsmart-works/pull/485) | 1,454 tests; JaCoCo; Checkstyle; architecture gate | `docs/implementation/epics/EPIC-03-backend-modularization-completion.md` | 14 populated modules; 187-line WorkItem adapter; Dashboard facade; injected AI splits |
| EPIC 4 - Frontend Architecture Refactor | Code-verified complete | `codex/epics-01-05-completion` | #398 + [#485](https://github.com/akpdeepak/bsmart-works/pull/485) | 1,771 tests; lint/build; architecture gate | `docs/implementation/epics/EPIC-04-frontend-architecture-refactor-completion.md` | Tested workspace/navigation/overlay/realtime boundaries; 2,884-line guarded shell |
| EPIC 5 - Premium Design System Refresh | Code-verified complete | `codex/epics-01-05-completion` | #399 + [#485](https://github.com/akpdeepak/bsmart-works/pull/485) | 1,771 tests; Storybook build; a11y/design guardrails | `docs/implementation/epics/EPIC-05-premium-design-system-refresh-completion.md` | Blocking token rules; shared states; theme/density; 32 stories; 21 axe screens |
| EPIC 6 - Simplified Information Architecture and Navigation | Code-verified complete | `codex/epic-06-navigation-completion` | #400 + [#486](https://github.com/akpdeepak/bsmart-works/pull/486) | 11/11 EPIC gate; 1,782 frontend tests; route/server/locale parity; axe; backend RBAC contract | `docs/implementation/epics/EPIC-06-simplified-navigation-completion.md` | Visible permission-aware More, 38 deep links, role landing, localized palette/breadcrumbs, one nav catalogue |
| EPIC 7 - bSmart Today | Code-verified complete; PR awaiting CI | `codex/epic-07-today-completion` | #401 + [#487](https://github.com/akpdeepak/bsmart-works/pull/487) | 11/11 EPIC gate; 1,797 frontend tests; Storybook; 1,457 backend unit + 125 integration tests; 7 focused fresh-DB tenant/perf tests; repository gate | `docs/implementation/epics/EPIC-07-bsmart-today-completion.md` | Six roles; full signal model; sourced/fallback AI; act/snooze/dismiss; selected-workspace isolation; 2s budget |
| EPIC 8 - Smart Inbox | Slice shipped (~35%) | `main` | [#402](https://github.com/akpdeepak/bsmart-works/pull/402) | `cd works-frontend && npm test -- smart-inbox notifications-view`; `npm run verify`; `cd works-frontend && npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-08-smart-inbox-completion.md` | Action-first inbox grouping, actionable badge count, activity history preserved |
| EPIC 9 - bSmart Connect Messaging | Slice shipped (~10%) | `main` | [#403](https://github.com/akpdeepak/bsmart-works/pull/403) | `cd works-frontend && npm test -- message-actions support-inbox-view`; `cd works-frontend && npm test -- bql-view.a11y`; `npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-09-connect-messaging-completion.md` | Source-cited reviewed message action drafts, support chat workspace/RBAC preserved, BQL loading a11y fix |
| EPIC 10 - Work Item Experience Redesign | Slice shipped (~20%) | `main` | [#404](https://github.com/akpdeepak/bsmart-works/pull/404) | `cd works-frontend && npm test -- work-item-execution-brief work-item-detail-panel`; `npm run verify`; `cd works-frontend && npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-10-work-item-experience-completion.md` | Cited execution brief, visible due/visibility/DevSync snapshot, display-key preference |
| EPIC 11 - Project Command Center | Slice shipped (~25%) | `main` | [#405](https://github.com/akpdeepak/bsmart-works/pull/405) | `cd works-frontend && npm test -- project-command-center projects-view`; `cd works-frontend && npm test -- bql-view.a11y`; `npm run verify`; `cd works-frontend && npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-11-project-command-center-completion.md` | Explainable project command-center summary, source-cited health, SLA/customer risk, DevSync, project room/customer update affordance, saved views loading a11y fix |
| EPIC 12 - DevSync / Engineering Intelligence | Slice shipped (~25%) | `main` | [#406](https://github.com/akpdeepak/bsmart-works/pull/406) | `cd works-frontend && npm test -- engineering-activity developer-workspace`; `npm run verify`; `cd works-frontend && npm run verify`; GitHub CI all checks passed | `docs/implementation/epics/EPIC-12-devsync-engineering-intelligence-completion.md` | Engineering activity summary in Developer Workspace, source citations, linked/unlinked raw events, release readiness signals, no ranking |
| EPIC 13 - Universal AI Command Layer | Not started | | | | | |
| EPIC 14 - bSmart Answer Engine | Not started | | | | | |
| EPIC 15 - bSmart Canvas and AI-Generated Work Artifacts | Not started | | | | | |
| EPIC 16 - Knowledge and Document Workspace | Not started | | | | | |
| EPIC 17 - Service Desk and Customer Resolution | Not started | | | | | |
| EPIC 18 - SLA, Compliance, Governance, and Evidence | Not started | | | | | |
| EPIC 19 - Automation Builder and bSmart Agents | Not started | | | | | |
| EPIC 20 - Reports, Dashboards, BQL, and Leadership Intelligence | Not started | | | | | |
| EPIC 21 - Integrations, Migration, and Platform APIs | Not started | | | | | |
| EPIC 22 - People Graph, Skills, Stakeholders, and Customer Intelligence | Not started | | | | | |
| EPIC 23 - Onboarding, Templates, and Guided Adoption | Not started | | | | | |
| EPIC 24 - Mobile, PWA, Offline, Realtime, and Smoothness | Not started | | | | | |
| EPIC 26 - Product Analytics, Feedback, and Healthy Engagement Hooks | Not started | | | | | |
| EPIC 27 - Developer Experience and Agent-Ready Implementation System | Not started | | | | | |

## Latest handoff

2026-06-19: EPIC 0 was merged to `main` via
[#393](https://github.com/akpdeepak/bsmart-works/pull/393). It adds `CURRENT-STATE.md`, updates stale
repo/deploy facts, removes generated artifacts from Git tracking, restricts query-param JWT auth to
the realtime SSE stream, verifies shared status category resolver coverage, and records validation.
Resume with EPIC 1 unless GitHub evidence shows a newer EPIC has already been completed.

2026-06-19: EPIC 1 implemented and locally validated on `epic/01-tenant-rbac-hardening`. Scope covers
starred work-item tenant scoping, SCIM token issuance permission enforcement, dashboard
workspace-scoping, field layout project/workspace resolution, RBAC workspace-explicit role APIs, and
BQL membership-based workspace fallback. Validation: focused backend unit tests passed 37/37; broader
`cd works-backend && .\mvnw.cmd -Dgroups=unit verify` passed 1,335 tests with 0 Checkstyle
violations; `npm run guardrails` passed all blocking rules with the two existing non-blocking
baseline warnings.

2026-06-19: EPIC 1 merged to `main` via
[#394](https://github.com/akpdeepak/bsmart-works/pull/394), merge commit
`b1cc91c46c4a870bbfcaa8266afa991d2b6614aa`. GitHub CI passed all required jobs, including
frontend lint/build/test, backend compile/unit/integration/smoke, guardrails, secrets scan,
Storybook, Chromatic, bundle budget, and JetBrains plugin build. Local `main` and `origin/main` were
then updated with `d60d062` to mark EPIC 1 merged. Resume with EPIC 2.

2026-06-19: EPIC 2 implemented and locally validated on `epic/02-production-config-secrets`. Scope
covers prod/staging startup secret validation, dev-token exposure default hardening, public health
probes, deployment health indicators, env templates, Compose readiness, CI Compose smoke validation,
and Postgres/uploads backup/restore documentation. Validation: focused backend tests passed 8/8;
broader `cd works-backend && .\mvnw.cmd -Dgroups=unit verify` passed 1,341 tests with 0 Checkstyle
violations; Compose config validation passed for local/staging/production env templates; `npm run
guardrails` passed all blocking rules with the existing non-blocking raw-hex baseline warning.

2026-06-19: EPIC 2 merged to `main` via
[#395](https://github.com/akpdeepak/bsmart-works/pull/395), squash commit
`59b3c9891d7c8c0bf2bc88aebd426f092a205da7`. GitHub CI passed all required jobs, including the new
Deployment smoke Compose config gate, gitleaks, frontend lint/build/test, Storybook, Chromatic,
backend compile/unit/integration/smoke, guardrails, bundle budget, and JetBrains plugin build.
Resume with EPIC 25 partial.

2026-06-19: EPIC 25 partial is in progress on `epic/25-quality-gates`. Scope covers a new CI
quality gate for static frontend API route drift, axe harness/a11y coverage floor, AI fallback
telemetry visibility, stale custom-field/field-visibility route repairs, and knowledge
presence/edit-lock backend endpoints. Validation so far: `npm run quality-gates` passed;
`cd works-frontend && npm test -- field-settings presence` passed 37/37; `cd works-backend &&
.\mvnw.cmd -DskipTests "-Djacoco.skip=true" verify` passed with 0 Checkstyle violations.

2026-06-19: EPIC 25 partial merged to `main` via
[#396](https://github.com/akpdeepak/bsmart-works/pull/396), squash commit
`7c07f57f136ced3d0070f40f0cbd1e033298bce0`. GitHub CI passed all jobs, including the new
Quality gates job, gitleaks, guardrails, frontend lint/build/test, Storybook, Chromatic, backend
compile/unit/integration/smoke, deployment smoke, bundle budget, and JetBrains plugin build.
Resume with EPIC 3.

2026-06-19: EPIC 3 implemented locally on `epic/03-backend-modularization`. Scope covers canonical
module package markers, marker-presence architecture tests, WorkItem read/command service splits,
Dashboard facade/query split, and AI command execution/summarization service splits. Focused backend
validations passed for Architecture, WorkItem controller, Dashboard controller access, AI assist,
and AI heuristics tests. Broad validation also passed: `cd works-backend && .\mvnw.cmd -Dgroups=unit
verify` (1,342 tests, 0 Checkstyle violations), `npm run quality-gates`, and `npm run verify`
(blocking rules passed; existing non-blocking raw-hex baseline warning remains). Next: open PR, wait
for GitHub CI, merge to `main`, then mark EPIC 3 completed.

2026-06-19: EPIC 3 merged to `main` via
[#397](https://github.com/akpdeepak/bsmart-works/pull/397), squash commit
`b3e4833baef4915456e2b61073bcc9f717041230`. GitHub CI passed all jobs, including backend compile,
unit, integration, smoke, quality gates, guardrails, gitleaks, frontend lint/build/test, Storybook,
Chromatic, bundle budget, deployment smoke, and JetBrains plugin build. Local `main` and
`origin/main` are synced at the merge commit. Resume with EPIC 4.

2026-06-20: EPIC 4 is in progress on `epic/04-frontend-architecture-refactor`. First slice moved
the legacy shell to `works-frontend/src/app/AppShell.jsx`, reduced root `works-frontend/src/App.jsx`
to a thin entry wrapper, added `works-frontend/src/app/app-architecture.test.js` to prevent the
root app file from regrowing state/API logic, and updated the UI/UX scope gate to read the new
app shell boundary. Validation passed: `cd works-frontend && npm test -- app-architecture`;
`cd works-frontend && npm run build`; `npm run verify`.

2026-06-20: EPIC 4 merged to `main` via
[#398](https://github.com/akpdeepak/bsmart-works/pull/398), squash commit
`a2efbf1f5055788227a7896e07ae2f18ae21fd5c`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, and JetBrains plugin build. Local `main` and
`origin/main` are synced at the merge commit. Resume with EPIC 5.

2026-06-20: EPIC 5 is in progress on `epic/05-premium-design-system-refresh`. First slice replaces
the fixed dashboard width with an adaptive `max-w-workspace` design token, keeps `max-w-reading` for
prose/document surfaces, updates the page-width ESLint guardrail, and applies the token to selected
dashboard-like work surfaces. Validation target: `cd works-frontend && npm test -- page-layout
design-system-tokens`; `cd works-frontend && npm run lint`; `cd works-frontend && npm run build`;
`npm run verify`.

2026-06-20: EPIC 5 merged to `main` via
[#399](https://github.com/akpdeepak/bsmart-works/pull/399), squash commit
`e2fd708d9e4ab0a0450ef048bc4715a0bf47da8b`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, and JetBrains plugin build. Local `main` and
`origin/main` are synced at the merge commit. Resume with EPIC 6.

2026-06-20: EPIC 6 is in progress on `epic/06-simplified-navigation`. First slice preserves the
requested rail modes, Home, Deliver, Insight, Service, Know, Extend, moves setup/admin surfaces into
More/command-palette reachability, and adds nav-model tests for the six-mode contract. Validation
target: `cd works-frontend && npm test -- nav-model`; `cd works-frontend && npm run build`;
`npm run verify`.

2026-06-20: EPIC 6 merged to `main` via
[#400](https://github.com/akpdeepak/bsmart-works/pull/400), squash commit
`f63114e7f8d9cc2ca0878d596ad9a7ff55f95346`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, and JetBrains plugin build. Local `main` and
`origin/main` are synced at the merge commit. Resume with EPIC 7.

2026-06-20: EPIC 7 merged to `main` via
[#401](https://github.com/akpdeepak/bsmart-works/pull/401), squash commit
`b581e52d6155f72bfc89d4572c9a276a5221e14b`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build, conventional commits,
AI rules, and DoD version checks. Local `main` and `origin/main` are synced at the merge commit.
Resume with EPIC 8.

2026-06-20: EPIC 8 merged to `main` via
[#402](https://github.com/akpdeepak/bsmart-works/pull/402), squash commit
`d47fc3c1f1cac1cd1d474d615a4dc3bc9d94a19e`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build, conventional commits,
AI rules, and DoD version checks. Local `main` and `origin/main` are synced at the merge commit.
Resume with EPIC 9.

2026-06-20: EPIC 9 is in progress on `epic/09-connect-messaging`. First slice adds source-cited,
review-only message action drafts in Support Inbox for customer messages: task, decision, risk, and
customer commitment. It preserves existing support chat backend RBAC/workspace scope and does not
create official records automatically. Focused validation passed: `cd works-frontend && npm test --
message-actions support-inbox-view`. Next: run broader frontend/repo validation, open PR, wait for
GitHub CI, merge to `main`, then mark EPIC 9 completed.

2026-06-20: EPIC 9 merged to `main` via
[#403](https://github.com/akpdeepak/bsmart-works/pull/403), squash commit
`a3a897098dc133dd4428307ee814404359886d57`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build, conventional commits,
AI rules, and DoD version checks. Local `main` and `origin/main` are synced at the merge commit.
Resume with EPIC 10.

2026-06-20: EPIC 10 is in progress on `epic/10-work-item-experience`. First slice adds a deterministic,
source-cited work item execution brief to the detail panel, covering status, owner, priority, due
date, visibility, DevSync signal, and source counts without changing backend persistence contracts.
Focused validation passed: `cd works-frontend && npm test -- work-item-execution-brief
work-item-detail-panel`. Next: run broader validation, open PR, wait for GitHub CI, merge to `main`,
then mark EPIC 10 completed.

2026-06-20: EPIC 10 merged to `main` via
[#404](https://github.com/akpdeepak/bsmart-works/pull/404), squash commit
`a93c1bbcbeaab9ff303ebe2760aaf736c6e16db7`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build, conventional commits,
AI rules, and DoD version checks. Local `main` and `origin/main` are synced at the merge commit.
Resume with EPIC 11.

2026-06-20: EPIC 11 is in progress on `epic/11-project-command-center`. First slice adds a
deterministic, source-cited project command-center model and renders explainable health, blockers,
SLA/customer risk, decisions, DevSync, project room, customer update draft affordance, and next
actions on team/project cards. Focused validation passed: `cd works-frontend && npm test --
project-command-center projects-view`. Next: run broader validation, open PR, wait for GitHub CI,
merge to `main`, then mark EPIC 11 completed.

2026-06-20: EPIC 11 merged to `main` via
[#405](https://github.com/akpdeepak/bsmart-works/pull/405), squash commit
`c933036b4c14a0e3f6f32c5eec64e3ab747a4a26`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build, conventional commits,
AI rules, and DoD version checks. Local `main` and `origin/main` are synced at the merge commit.
Closeout validation also covered `cd works-frontend && npm test -- bql-view.a11y`, `npm run verify`,
and `cd works-frontend && npm run verify`. Resume with EPIC 12.

2026-06-20: EPIC 12 is in progress on `epic/12-devsync-engineering-intelligence`. First slice adds a
source-cited Engineering Activity panel to Developer Workspace with grouped review flow, linked work
evidence, raw activity-event expansion, unlinked activity visibility, and release-readiness counters
for pending review, failed CI, merged, and deployed signals. The model intentionally avoids
leaderboards, productivity scores, commit-count ranking, and lines-of-code ranking. Focused
validation passed: `cd works-frontend && npm test -- engineering-activity developer-workspace`.
Next: run broader validation, open PR, wait for GitHub CI, merge to `main`, then mark EPIC 12
completed.

2026-06-20: EPIC 12 merged to `main` via
[#406](https://github.com/akpdeepak/bsmart-works/pull/406), squash commit
`519c39bd7001cd41f42121b7af663e9e488ab64b`. GitHub CI passed all jobs, including frontend
lint/build/test, Storybook, Chromatic, backend compile/unit/integration/smoke, guardrails, quality
gates, gitleaks, bundle budget, deployment smoke, JetBrains plugin build, conventional commits,
AI rules, and DoD version checks. Local `main` and `origin/main` are synced at the merge commit.
Local validation covered `cd works-frontend && npm test -- engineering-activity developer-workspace`,
`npm run verify`, and `cd works-frontend && npm run verify`. Resume with EPIC 13.

2026-07-03: Phase 2 (W2) execution is underway and reconciled to remote `main`. Merged: the four
god-class splits (PRs #446–#449), status-management hex tokenization (PR #450), locales.js
per-language code-split (PR #451), BlockEditor + knowledge-overlay lazy-loading (PR #452, initial
JS 162.9→140.7 kB gz), AsyncBoundary tranche 1 across the six list/table views (PR #453), and the
G-1 shared-kernel package move to `com.bcits.works.shared` (PR #454 — 556 files, pure move, new
kernel-direction ArchUnit rule, validated by 1,449 unit tests + a real ddl-auto=validate boot).
Resume point: **G-2 domain carve, Identity-first (`auth` first, with the RbacService port in
shared), one module per PR**; then W2-c AppShell decomposition, AsyncBoundary tranches 2–3, and the
43-file legacy lint-block migration. No schema changes in any Phase-2 PR so far (high-water V119).

2026-07-18: Phase 2 (W2) completed and merged to `main` via
[PR #481](https://github.com/akpdeepak/bsmart-works/pull/481), squash commit
`f8081c63f28b08389ccbb802c73ab0d75b690bf1`. All GitHub CI jobs passed, including backend unit,
both Postgres/Flyway integration suites, workspace isolation, smoke boot with `ddl-auto=validate`,
frontend lint/build/test/security/Storybook/Chromatic, guardrails, secrets, bundle budget,
deployment smoke, and the JetBrains plugin build. The backend carve now populates all
14 declared modules and reduces the flat package root from 291 to 72 source files, protected by
cycle, kernel-direction, non-vacuity, and root-budget architecture tests. `AppShell.jsx` is reduced
from 4,628 to 3,028 lines by extracting providers, authentication, public routes, shortcuts,
`RouteOutlet`, and four feature-state hooks. Primary `AsyncBoundary` tranches are complete, and the
legacy structural-lint override is removed. No schema or API contract change; Flyway remains V119.
Local gates: 1,451 backend unit tests with JaCoCo and Checkstyle, 1,733 frontend tests across 233
files plus lint/build, and the full repository verification suite. See
`docs/implementation/epics/PHASE-2-STRUCTURAL-REFACTOR-COMPLETION.md`.

2026-07-19: EPICs 1–5 were re-audited from production code on
`codex/epics-01-05-completion`; prior completion Markdown was not accepted as evidence. The closeout
removed the last production `WS-001` paths, made workspace startup membership-backed, extracted and
tested shell navigation/overlay/realtime/workspace ownership, reduced `AppShell.jsx` to 2,884 lines,
made `WorkItemController` a 187-line typed HTTP adapter, injected the AI split services, expanded
Storybook theme/density/core-molecule coverage, and made design-literal guardrails blocking. Local
evidence: 18/18 executable EPIC checks, 1,454 backend tests with JaCoCo/Checkstyle, 123 integration
tests, 1,771 frontend tests with lint/build, Storybook build, guardrails, three Compose renders, and a
fresh PostgreSQL/Flyway V119 runtime boot with readiness `UP`. See
`docs/implementation/epics/EPICS-01-05-CODE-VERIFICATION.md`. Closeout PR:
[#485](https://github.com/akpdeepak/bsmart-works/pull/485).

2026-07-19: EPIC 6 was re-audited from production code on
`codex/epic-06-navigation-completion`. The closeout adds the missing visible More path and AI Control
deep link, wires role-aware mode landing and localized shell breadcrumbs, localizes the palette and
all account labels, removes the sidebar's duplicate catalogue, and enforces parity across 38
rendered routes, 37 frontend/backend visibility entries, and 44 keys in 10 locales. Local evidence:
11/11 executable EPIC checks, 1,782 frontend tests across 243 files with lint/build, 1,454 backend
unit tests with JaCoCo/Checkstyle, navigation axe, and the `/rbac/me` surface contract test. Closeout
PR [#486](https://github.com/akpdeepak/bsmart-works/pull/486) passed all required GitHub checks and
was squash-merged as `c83c34f1`; post-merge `main` CI run `29691690131` and local verification were
green. EPIC 7 followed on its own branch.

2026-07-19: EPIC 7 was re-audited from source requirements through production code on
`codex/epic-07-today-completion`. The closeout adds workspace/user/role attention state with
open/snooze/dismiss and changed-signal behavior, caller-only sourced AI with visible deterministic
fallback, support-agent Today, approvals/waits, SLA/customer/code risks, messages, and DevSync
signals. It also closes a developer aggregate leak where one user's memberships could mix multiple
workspaces. Current evidence: 11/11 executable EPIC checks; 1,797 frontend tests across 246 files
with lint/build; Storybook build; 1,457 backend unit tests with JaCoCo/Checkstyle; 125 backend
integration tests; 7 focused fresh-Postgres tenant/performance tests; and the full repository gate.
Closeout PR [#487](https://github.com/akpdeepak/bsmart-works/pull/487) is awaiting CI; do not begin
EPIC 8 before the EPIC 7 merge and post-merge validation.
