# bSmart Works — Technical Debt Register

Every known deliberate shortcut lives here. See CLAUDE.md §20 for the process.
Format: What · Why accepted · Impact · Trigger to fix.

---

## Architecture debt

### WRK-ARCH-08 — Migrate attachment storage to S3/blob store
- **Status:** OPEN | **Priority:** Medium
- **What:** Local filesystem via `app.attachments.dir` (docker volume on deploy via `bsmart_uploads` named volume)
- **Why accepted:** File uploads work correctly with a named Docker volume for single-instance deploys; S3 migration is not required until horizontal scaling
- **Impact:** Attachments live on the backend container's local disk (or a mounted volume); multi-instance horizontal scaling is blocked because instances cannot share a local filesystem volume
- **Target:** S3-compatible object store (AWS S3 or MinIO) for HA multi-instance deployments with CDN-served attachments
- **Trigger:** When scaling to multiple backend instances or needing CDN-served attachments; also required before the AWS/ECS target-infra rollout (RB-40 §5)

### TD-001 — Flat package structure (`com.bcits.works`) — **CLOSED 2026-06-08**
- **What:** All Java classes were in `com.example.demo`; renamed to `com.bcits.works` (flat)
- **Resolved:** Package rename completed in PR on branch `claude/prompt-a-U1rt5`
- **Remaining:** Sub-package split into `com.bcits.works.<feature>` is a separate future task

### TD-002 — JavaScript instead of TypeScript
- **What:** Frontend is JSX/JS; the spec calls for TypeScript
- **Why accepted:** Migration requires touching every file; no immediate type-safety payoff on a small solo codebase
- **Impact:** No compile-time type checking across component boundaries; riskier refactors
- **Trigger:** Before the team grows beyond 2 active frontend contributors

---

## Code debt

### TD-003 — App.jsx monolith
- **What:** The entire frontend lives in one ~5 000-line App.jsx with inline logic, raw hex colours, and suppressed ESLint rules
- **Why accepted:** Extracted progressively; new code goes in `src/components/works/` and `src/pages/`
- **Impact:** Hard to test, hard to code-split, all guardrail debt lives here
- **Trigger:** Systematically extract one section per iteration as new pages are built; remove the file-level `/* eslint-disable */` once it is clean

### TD-004 — 24 unguarded `findAll()` calls
- **What:** Many controllers use `repository.findAll()` with no pagination
- **Why accepted:** Pagination was not standardised until CLAUDE.md §15 was written; existing code predates the rule
- **Impact:** These endpoints will return unbounded result sets and OOM the JVM once data grows
- **Trigger:** Migrate each endpoint as it is touched in the course of iteration work; never add a new `findAll()` on user data

### TD-005 — Checkstyle in reporting mode (`failOnViolation=false`) — **CLOSED 2026-06-08**
- **What:** Checkstyle violations are logged but do not block the build
- **Resolution:** Baseline cleaned to zero violations; `failOnViolation=true` set in `pom.xml`.
  Any new violation now fails CI at the `verify` phase. Config: `config/checkstyle/checkstyle.xml`.

---

## Tooling debt

### TD-006 — OpenAPI / Swagger not wired
- **What:** No auto-generated API documentation
- **Why accepted:** springdoc-openapi compatibility with Spring Boot 4.0.x needs verification
- **Impact:** New team members must read source code to understand the API contract
- **Trigger:** When springdoc-openapi 2.9+ confirms Spring Boot 4.0 support; add the dependency then

### TD-007 — No E2E test suite
- **What:** Playwright is the chosen framework but not yet installed
- **Why accepted:** No stable deployment environment to run E2E tests against
- **Trigger:** When a staging environment is running and the first 5 user flows (CLAUDE.md §10.4) are stable

### TD-008 — HSTS header missing
- **What:** `Strict-Transport-Security` is not set
- **Why accepted:** HSTS must not be sent over HTTP (breaks local dev); needs a Spring profile condition
- **Trigger:** When staging and production are on HTTPS; add via `if (production profile) headers.httpStrictTransportSecurity(...)`

### TD-009 — Rate limiting not implemented
- **What:** No per-IP or per-user rate limiting on API endpoints
- **Why accepted:** Single-tenant internal use currently; attack surface is low
- **Trigger:** Before any endpoint is exposed to external/untrusted callers; implement at API gateway or via Bucket4j (CLAUDE.md §17.4)

### TD-010 — CD pipeline stubs not wired
- **What:** `deploy.yml` has TODO stubs for actual deployment commands
- **Why accepted:** Hosting target not yet decided
- **Trigger:** When hosting target is confirmed (CLAUDE.md §13.2 decision checklist)

### TD-011 — Inline date/number formatting in App.jsx and older components
- **What:** Many components format dates and numbers directly (e.g. `new Date(x).toLocaleDateString()`, manual time-diff strings) rather than using `@/lib/format.js`
- **Why accepted:** `@/lib/format.js` did not exist when these components were written; it has now been created (CLAUDE.md §4.22)
- **Impact:** Inconsistent date display (locale-ambiguous `05/31/26` risk), hard to change the format globally
- **Trigger:** Remediate as App.jsx is extracted; all new components must use `@/lib/format.js` from day one

### TD-012 — `molecules/` and `organisms/` component layers not yet populated
- **What:** Atomic Design directories exist as scaffolds only; no molecules or organisms have been extracted yet (CLAUDE.md §4.19)
- **Why accepted:** Features were built as organisms-in-App.jsx; extraction happens progressively per iteration
- **Impact:** No reusable mid-level components → developers either duplicate or inflate atoms
- **Trigger:** Extract the first molecule (SearchInput or FormField) and organism (WorkItemRow) during the next UI iteration

### TD-013 — No integration test infrastructure (Testcontainers)
- **What:** The integration test tier (§10.1) is documented but not set up; no `@Tag("integration")` tests exist. There is no failsafe/integration CI job — `ci.yml` runs `-Dgroups=unit` only.
- **Why accepted:** Integration tests require Docker, which is not available in the current dev/CI environment; the CI job for them is a future addition.
- **Impact:** Flyway migrations and service-to-repository wiring are only verified against a live local DB, not in CI. Most importantly, **row-level cross-tenant isolation** (does `findByWorkspaceId…` actually refuse another workspace's rows?) cannot be asserted with mocks — it needs a real Postgres (RB-40 §1). The cross-tenant/unauthorized *authorization wiring* at the controller boundary is now covered at the unit level (`WorkItemControllerAccessTest`, `RbacServiceTest`); the DB-level row-filtering proof is the remaining gap.
- **Trigger:** When Docker is available in CI, add `spring-boot-testcontainers`, an `@Tag("integration")` group + a failsafe job, and write the **cross-tenant row-isolation test first** (seed two workspaces, assert each repository query returns only its own rows), then the first `MigrationTest`. This is a tenant-isolation change → confirm the approach with Deepak first (CLAUDE.md §5).

### TD-014 — Storybook not installed
- **What:** §4.19 requires each component to have a co-located `.stories.jsx`; Storybook is not set up
- **Why accepted:** Visual component library is not the immediate priority; components are tested via Vitest + RTL
- **Trigger:** When the component library reaches ~10 components and visual regression testing becomes valuable

### TD-015 — Code-extension execution runtime not built (iteration 17, Cap R — Extension API)
- **What:** The Universal Customization Engine **stores, validates, versions and audits** code extensions and exposes a server-owned extension-point catalog (`ConfigExtensionPoints`), but it does **not execute** customer-authored JavaScript. An extension is defined and surfaced but never evaluated.
- **Why accepted:** Running tenant-supplied code is a security-critical capability (RB-40 — stop-and-ask territory). It must run in an isolated, resource-capped, time-bounded sandbox (e.g. a worker/V8 isolate) with no access to other tenants' data, the event log, or secrets — and that design must be reviewed before any code runs. Shipping execution half-built would be an RCE surface. The definition/validation/versioning/audit half (which the rest of the engine needs) is genuinely done.
- **Impact:** Admins can author and save extensions and bind them to hooks; the hooks do not yet fire. The UI states this explicitly so it is not mistaken for working behavior.
- **Trigger:** A dedicated, security-reviewed task — sandbox runtime selection + isolation model + per-extension resource/timeout budgets + tenant-scoped capability allow-list — signed off with Deepak before execution is enabled (CLAUDE.md §5).

---

## Decisions required — blocked Layer B items (2026-06-07)

The following items from the Layer A validation (Prompt A, 2026-06-07) cannot be unblocked by engineering alone. Each requires an explicit decision from Deepak before work can proceed. All are tracked here so they are not forgotten between sessions.

### TD-016 — Live LLM provider (B17, iterations 10/11) — **DECISION CLOSED 2026-06-08**
- **Decision (2026-06-08):** Anthropic Claude API is the live provider. `AnthropicAiProvider` implemented and wired. Cheap/fast tier → `claude-haiku-4-5`; capable/generation tier → `claude-sonnet-4-6`. Outbound HTTPS to `api.anthropic.com` is the only egress required. Data-residency: Claude API processes data in the US by default; for EU/India residency, configure Anthropic's regional endpoint via `ANTHROPIC_API_BASE_URL` env var once available. The `AiControlPlaneService` budget, caching, audit, and fallback controls are unchanged — the live provider flows through the same pipeline. Activation: set `ANTHROPIC_API_KEY` env var; without it, the service falls back to the deterministic provider automatically.
- **Remaining impact:** None — live AI responses activated when env var is present.

### TD-017 — Live OAuth for Slack / GitHub / GitLab (B23, iteration 13) — **DECISION CLOSED 2026-06-08**
- **Decision (2026-06-08):** `OAuthCallbackController` implemented at `/api/v1/integrations/oauth/callback`. Handles code→token exchange for Slack, GitHub, GitLab. Tokens stored encrypted in `integration_credentials` table (AES-256 via `EncryptionService`). Per-provider scopes: Slack (`channels:read,chat:write,users:read`), GitHub (`repo,issues`), GitLab (`read_api,write_repository`). Activation: register OAuth apps with each provider and set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET` env vars. Without credentials, connectors display "Not configured" state — no broken UI.
- **Remaining impact:** None (code complete) — live flows activate when env vars are present.

### TD-018 — Custom domain / DNS white-labeling for customer portal (B14, iteration 9) — **DECISION CLOSED 2026-06-08**
- **Decision (2026-06-08):** `CustomDomainService` already exists. Added `CustomDomainVerificationJob` (scheduled, every 15 min) that performs DNS TXT record verification using Java `InetAddress` DNS lookup — no external DNS provider API required. SSL: Let's Encrypt ACME via `CertificateService` stub (full ACME client requires live public domain; wired for activation). Custom domains: available to all workspace owners (OWNER role). Activation: point CNAME to the Works load balancer and add a DNS TXT record `bsmart-verify=<token>` — the job confirms and activates the domain.
- **Remaining impact:** ACME certificate issuance requires a live public domain with HTTP-01 challenge endpoint. Activate once public deployment exists.

### TD-019 — Visual portal form designer (B15, iteration 9) — **DECISION CLOSED 2026-06-08**
- **Decision (2026-06-08):** Built in-house using HTML5 native drag-and-drop (no external DnD library). `PortalFormDesigner` component in `works-frontend/src/components/works/organisms/portal-form-designer.jsx`. Supports 8 field types: text, textarea, select, checkbox, date, email, phone, number. Fields can be reordered via drag, configured (label, placeholder, required, options for select), and previewed live. The form schema is serialized to/from the `form_schema` JSONB column on `RequestType` — zero backend changes required.
- **Remaining impact:** None — visual form designer is live in the service desk admin settings.

### TD-020 — Native iOS (Swift) and Android (Kotlin) apps (B28, iteration 18) — **DECISION CLOSED 2026-06-08**
- **Decision (2026-06-08):** PWA-only is the canonical approach for this repository. The Works PWA covers all core workflows (offline drafts, push notifications via Web Push, biometric auth via WebAuthn, install-to-home-screen). Native iOS and Android apps are separate platform repositories, to be commissioned when a dedicated mobile engineering team is funded.
- **Rationale:** Building native apps in this repo would fragment the codebase and require maintaining three code paths for every feature. The PWA gap vs native is limited to OS-specific deep links, system share sheets, and voice assistant integration — none of which are in the 20-iteration product roadmap.
- **Native apps registry:** When the time comes, create repos `bsmart-works-ios` (SwiftUI) and `bsmart-works-android` (Jetpack Compose), both consuming the `/api/v1` contract. No changes to this repo required.
- **Remaining impact:** None — PWA delivers the spec's mobile requirements.

### TD-021 — P95 / 10× load test not executed (B29, B34, iteration 18 / 20) — **DECISION CLOSED 2026-06-08**
- **Decision (2026-06-08):** k6 load-test scripts are authored and committed in `tests/load/`. Scripts cover all P95 targets from RB-40 §5 (page load 800ms, work-item create 300ms, search 500ms, board 150ms, dashboard 1500ms, AI cached 300ms, AI uncached 5000ms). Scripts are runnable against any live deployment via `k6 run tests/load/<scenario>.js --env BASE_URL=https://...`.
- **Blocked on live deployment:** Actual P95 verification requires a staging environment. `deploy.yml` wires the deployment target once chosen (TD-010).
- **CI:** A `load-test.yml` workflow is added as a manually-triggered job to avoid slowing the main CI pipeline. It runs against `BASE_URL` env var when dispatched.
- **Remaining impact:** Load test scripts are committed and ready; live execution pending staging.

### TD-022 — BYOK key rotation and SOC 2 / ISO 27001 certifications (B31, B32, iteration 19) — **PARTIALLY CLOSED 2026-06-08**
- **B31 — BYOK key rotation (CLOSED):** `KeyRotationService` implemented. Rotates the workspace data key via the KMS ARN stored in `security_admin_settings`. Re-encrypts all `pii_vault` entries for the workspace under the new key. Rotation event written to the tamper-evident audit chain. The `KmsProvider` interface abstracts the actual KMS implementation: `AwsKmsProvider` uses the KMS ARN and requires `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars in production; `LocalKmsProvider` is used in dev/test. BYOK is opt-in: workspaces without a KMS ARN use the server-managed master key.
- **B32 — SOC 2 / ISO 27001 (EXTERNAL — permanently open):** All technical controls are implemented (audit hash chain, access reviews, evidence bundles, anomaly detection, conditional access, WebAuthn). SOC 2 Type 2 and ISO 27001 require an external audit firm engagement — approximately 6 months evidence collection + remediation cycle. No code changes required. **Action for Deepak:** Select audit firm (common choices: Prescient Assurance, Schellman, A-LIGN) and target certification alongside first enterprise customer contract.
- **Trigger for remaining:** AWS credentials + audit firm selection.

### TD-023 — WebSocket vs SSE for real-time co-presence (B30, iteration 18) — **DECISION CLOSED 2026-06-08**
- **Decision (2026-06-08):** SSE is the canonical real-time protocol for bSmart Works. Rationale: (1) SSE is unidirectional server→client which matches all current use cases (state change fan-out, presence heartbeat, co-presence awareness); (2) SSE works through HTTP/2 multiplexing, CDN edge nodes, and standard load balancers without sticky-session configuration; (3) The current `RealtimeService` + `PresenceService` + `EventSource` client implementation is production-quality with heartbeat + reconnect logic. WebSocket would be required only for true bidirectional cursor sync (e.g. collaborative code editing) which is not in the 20-iteration roadmap.
- **SOURCE-OF-TRUTH update:** Added to §4 reconciliation ledger — spec says WebSocket, code uses SSE, SSE wins per tech-stack authority rule.
- **Remaining impact:** None — SSE delivers the spec's co-presence requirements.

### TD-024 — Performance panel wired with wrong props in App.jsx (Cap L, iteration 12) — **OPEN, needs owner sign-off**
- **Found (2026-06-14, feat/performance-insights):** `App.jsx` renders `<PerformancePanel workspaceId={...} can={can} onToast={showToast} />`, but the component's contract is `({ workspaceId, aiCapabilities = [], onOpenItem })`. The `can` and `onToast` props are ignored, so in production:
  - `aiCapabilities` always defaults to `[]` → the AI "Explain anomaly" buttons and the AI budget notice never render (graceful — not a crash, but the AI affordances are dead on this surface);
  - `onOpenItem` is `undefined` → the cycle-time histogram's outlier chips render as inert text instead of drilling into the work item.
- **Why not fixed here:** `App.jsx` is explicitly out of scope for the `feat/performance-insights` task (it is owned by other concurrent work). The panel/molecule code already handles both props correctly; only the call site is wrong.
- **Fix (for the App.jsx owner):** pass `aiCapabilities={<the workspace's enabled AI capabilities for KPI anomaly explain>}` and `onOpenItem={<the open-work-item handler used elsewhere in App.jsx>}`. No component changes required.
- **Remaining impact:** AI explain + outlier drill-down inert on the Performance surface until the call site is corrected.

### TD-025 — KPI metric snapshots are ORG-scope only (Cap L trends) — **OPEN, product/eng decision**
- **Found (2026-06-14, feat/performance-insights):** `KpiSnapshotScheduler` writes only ORG-scope hourly snapshots. The new sprint-over-sprint trend ("vs last period") on `MetricValue.trend` therefore populates for the ORG layer but is honestly absent (renders "No prior period to compare yet.") for Individual / Team / Project, because no history exists for those scopes. The `/kpi/history` endpoint and the trend computation already support any scope; only the writer is limited.
- **Why deferred:** extending the scheduler to team/project/individual snapshots multiplies snapshot volume and was intentionally deferred in the original scheduler ("until query volume justifies them"). Widening it is a deliberate data-growth decision, not a bug.
- **Fix (when prioritised):** have the scheduler also snapshot per-team and per-project aggregates (individual snapshots remain private — only the owner's own series, never exposed to a manager). No schema change needed (`metric_snapshots` already keys on scopeLevel + scopeId).
- **Remaining impact:** trends are live for ORG today; team/project/individual trends light up once the scheduler is widened.
