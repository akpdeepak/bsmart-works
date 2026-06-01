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
