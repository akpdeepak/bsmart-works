# bSmart Works — Technical Debt Register

Every known deliberate shortcut lives here. See CLAUDE.md §20 for the process.
Format: What · Why accepted · Impact · Trigger to fix.

---

## Architecture debt

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

### TD-016 — Live LLM provider not wired (B17, iterations 10/11)
- **What:** `AiProvider` seam is fully built and tested with a deterministic offline stub. No real model calls are made. The seam accepts an `AiProviderClient` implementation; swapping in the Anthropic SDK is a one-class change.
- **Decision needed:** (1) Approve outbound HTTPS egress from the backend to the Anthropic API. (2) Choose the data-residency region (India / EU / US) — this determines which Claude API endpoint is used and must be stated in the workspace's data-residency config before keys are loaded. (3) Confirm which Claude model tiers map to Haiku (cheap/fast) and Sonnet (capable) in the current pricing tier.
- **Impact until resolved:** Every AI feature uses deterministic fallbacks; no real AI responses.
- **Trigger:** Decision from Deepak on egress + region → engineer wires `AnthropicAiProviderClient` in one PR.

### TD-017 — Live OAuth for Slack / GitHub / GitLab not wired (B23, iteration 13)
- **What:** Integration connectors (Slack, GitHub, GitLab, email, calendar) have pluggable seams and their integration types are registered in `IntegrationCatalog`. The OAuth dance, token storage, and live API calls are stubs.
- **Decision needed:** Register OAuth apps with each provider (Slack API, GitHub OAuth App, GitLab Application) and supply `clientId` / `clientSecret` via Secrets Manager / environment variables. Confirm which scopes are required (least-privilege) for each connector.
- **Impact until resolved:** Integrations tab shows connectors but cannot complete the OAuth flow.
- **Trigger:** OAuth app credentials provided → engineer wires live `OAuthClient` per provider.

### TD-018 — Custom domain / DNS white-labeling for customer portal (B14, iteration 9)
- **What:** The customer portal runs at `/portal` on the main domain. The spec calls for branded custom domains (e.g. `support.bcits.in`) per workspace.
- **Decision needed:** (1) Choose DNS provider for CNAME/A record automation (Cloudflare, Route 53, etc.). (2) Choose SSL certificate strategy: Let's Encrypt ACME (automated, free) vs. wildcard cert on the hosting layer. (3) Confirm whether custom domains are a paid-tier feature or available to all workspaces.
- **Impact until resolved:** All customers use the shared domain for the portal.
- **Trigger:** Decision on DNS provider + SSL strategy → engineer implements `CustomDomainService` + ACME integration.

### TD-019 — Visual portal form designer (B15, iteration 9)
- **What:** Customer portal request forms are JSON-schema driven (functional, admin-configurable). The spec calls for a drag-and-drop visual form designer. Forms work today; the designer is the UX surface.
- **Decision needed:** Prioritize for a specific iteration or explicitly accept JSON-schema as the long-term approach. If visual designer is in scope, confirm whether to build it in-house (significant frontend effort) or embed a third-party form builder.
- **Impact until resolved:** Admins configure forms by editing JSON schema; functional but developer-unfriendly.
- **Trigger:** Explicit iteration assignment from Deepak.

### TD-020 — Native iOS (Swift) and Android (Kotlin) apps (B28, iteration 18)
- **What:** The spec lists native iOS and Android apps. The codebase delivers a PWA (progressive web app) with offline support, service worker, and biometric auth — covering all common workflows. Native apps are explicitly out of scope for this repo.
- **Decision needed:** (1) Confirm PWA-only is acceptable long-term, OR (2) Authorize a separate native-app platform team/repo. Native apps require distinct engineering capacity, App Store/Play Store accounts, and their own CI/CD.
- **Impact until resolved:** Mobile users access Works via browser PWA — install-to-home-screen works; push via Web Push API works; biometric via WebAuthn works. The gap is native-specific APIs (deep links, system share sheets, Siri/Google Assistant integration).
- **Trigger:** Platform decision from Deepak.

### TD-021 — P95 / 10× load test not executed (B29, B34, iteration 18 / 20)
- **What:** `PerformanceMonitor` measures P50/P95/P99 at runtime and the `PERFORMANCE.md` documents the load-test plan against RB-40 §5 targets. No live load test has been executed because there is no live deployment to test against.
- **Decision needed:** Confirm hosting target and provision a staging environment (`deploy.yml` TODO stubs). Once staging exists, run k6 / Gatling against the P95 budget (page load <800 ms, work-item create <300 ms, search <500 ms, etc.).
- **Impact until resolved:** Performance compliance is asserted via code review and the in-process PerformanceMonitor; actual P95 figures under realistic load are unknown.
- **Trigger:** Staging deployment confirmed → run load test scripts in `PERFORMANCE.md`.

### TD-022 — BYOK key rotation design and SOC 2 / ISO 27001 certifications (B31, B32, iteration 19)
- **What:** BYOK references (per-workspace KMS ARN / key-id) are stored and the right-to-be-forgotten / crypto-shred architecture is implemented per RB-40 §3. The detailed key-rotation, backup-expiry, and replica-propagation mechanics need legal/DPO sign-off. SOC 2 Type 2 and ISO 27001 require an external audit engagement (audit firm, evidence collection period, remediation).
- **Decision needed:** (1) Legal/DPO review of the crypto-shred design and backup-retention windows. (2) Select an audit firm and timeline for SOC 2 Type 2 + ISO 27001. (3) Confirm whether BYOK is opt-in (per workspace) or mandatory.
- **Impact until resolved:** Enterprise security posture is architecturally correct but uncertified. BYOK is a stored reference only; actual KMS integration requires AWS credentials and key-management policy.
- **Trigger:** Legal/DPO availability + audit firm selection from Deepak.

### TD-023 — WebSocket vs SSE for real-time co-presence (B30, iteration 18)
- **What:** The spec calls for WebSocket-based co-presence. The implementation uses Server-Sent Events (SSE) with a heartbeat + `PresenceService`. SSE is simpler, unidirectional, and works through standard HTTP/2 proxies. WebSocket requires a persistent TCP upgrade and additional proxy configuration.
- **Decision needed:** Confirm whether SSE is accepted as the long-term protocol, or whether WebSocket is required (e.g. for bidirectional cursor sync or collaborative editing in a future iteration). Switching to WebSocket is an architectural change touching `RealtimeService`, the SSE endpoint, and the frontend `EventSource` client.
- **Impact until resolved:** Co-presence works correctly via SSE; the only gap is the spec says "WebSocket."
- **Trigger:** Explicit decision from Deepak — "SSE is fine" closes this; "need WebSocket" opens a planned migration task.
