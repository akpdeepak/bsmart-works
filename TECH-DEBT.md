# bSmart Works — Technical Debt Register

Every known deliberate shortcut lives here. See CLAUDE.md §20 for the process.
Format: What · Why accepted · Impact · Trigger to fix.

---

## Architecture debt

### TD-001 — Flat package structure (`com.example.demo`)
- **What:** All Java classes are in a single flat package instead of `com.bcits.works.<feature>`
- **Why accepted:** Renaming is a large mechanical change that touches every file; deferred to avoid noise during early iterations
- **Impact:** Hard to navigate as the codebase grows; no package-level access control
- **Trigger:** Before inviting external contributors, or when the class count exceeds ~200

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

### TD-005 — Checkstyle in reporting mode (`failOnViolation=false`)
- **What:** Checkstyle violations are logged but do not block the build
- **Why accepted:** The current baseline may have violations; flipping it without a clean baseline would immediately break CI
- **Impact:** Style violations accumulate silently
- **Trigger:** Run `./mvnw checkstyle:check` locally; once it is clean, flip `failOnViolation=true` in `pom.xml`

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

### TD-016 — Nav-surface tier catalog is duplicated client + server
- **What:** Nav visibility is now **server-authoritative**: `/rbac/me` returns a `surfaces` list derived from `NavSurfaces` (backend), and the front-end renders the rail / sub-rail / ⌘K from it. The client's `SURFACE_TIER` map (`works-frontend/src/lib/nav-model.js`) is kept only as a **fallback** for older servers / offline. So the surface→min-tier catalog exists in two places (`NavSurfaces.java` and `nav-model.js`) that must be kept in sync by hand.
- **Why accepted:** Shipping the server endpoint closed the "client decides access" gap (the real win). Eliminating the second copy entirely would mean the front-end never has a fallback, or generating one file from the other — neither worth blocking on now. Neither map is a security boundary; `RbacService` still authorises every query/action (RB-10 §2, RB-40 §1).
- **Impact:** If the two catalogs drift, an old-server/offline fallback could mis-declutter the menu (show/hide a surface the live server would decide differently). Cosmetic, never a breach — the live path uses the server list.
- **Trigger:** Generate the client fallback from the server catalog (or a shared JSON), or drop the client map once every deployed server returns `surfaces`. Do this when the catalog starts changing often or before external tenants self-serve roles.
