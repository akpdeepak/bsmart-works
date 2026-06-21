# EPIC P1 — Distributed Rate-Limiting & JWT Revocation

> Phase 1 (Governance & security closure), W1 Tranche-1 item 3. Sibling of #243 (central tenant
> filter) and Field-Level Security. **Lane: Large/risky** (data model · security · auth hot path).
> Migrations start at **V115**.

---

## 1. Problem (verified 2026-06-21)

- **JWTs are unrevocable.** `JwtUtil` mints stateless HS256 tokens with a 7-day expiry and **no
  server-side check beyond signature + exp** (`SecurityConfig.jwtAuthFilter`). A GDPR erasure
  (`DataPrivacyService.erase`), password change (`AuthController.changePassword`), or password reset
  (`PasswordResetService.performReset`) leaves **every previously-issued token valid for up to 7 days**
  — a real compliance + account-takeover gap. Customer-portal tokens (`generateCustomer` →
  `CustomerContext`) have the same gap.
- **Rate limiting is per-instance.** `RateLimiter` is an in-memory `ConcurrentHashMap`, so limits are
  not enforced across horizontally-scaled instances.

**Decision (Deepak, 2026-06-21):** implement revocation as a **token-version column**
(`users.tokens_valid_after`) + a **DB-backed** distributed rate-limit store; **Redis/ElastiCache is
deferred** to the AWS infra EPIC. Slicing: **PR1 = token-version revocation** (this block), PR2 =
logout + `jti` blocklist, PR3 = DB `rate_limit_windows` store, PR4 = extend limiting to writes.

---

# PR1 — as-built (2026-06-21) · token-version JWT revocation

> Per-item execution block (RB-05 / task-execution loop). Doubles as the PR description.

## P1.0 Scope
A per-subject "valid-after" cutoff so a token is rejected when its issued-at (`iat`) predates the
subject's `tokens_valid_after`. Bumped on erase / password change / password reset (and customer-portal
password change, for parity). Distributed by construction — the cutoff lives in the shared DB, so a
bump invalidates tokens across **all** instances immediately (the property the in-memory limiter lacks).

## P1.1 Analysis — verified (own read + a 4-agent adversarial discovery workflow)
- The JWT **already carries an `iat`** claim (`JwtUtil.generate`/`generateCustomer` both call
  `.issuedAt(...)`) — no token-format change, only a server-side check is missing.
- The internal enforcement point is `SecurityConfig.jwtAuthFilter` (after `extractUserId`, before the
  `SecurityContext` is set); the customer enforcement point is `CustomerContext.current()` (the portal
  choke point that re-validates `isCustomerToken`). The single internal filter also processes customer
  tokens, but a customer token on an internal path is denied by RBAC anyway (subject isn't a member).
- Bump sites verified: `DataPrivacyService.erase` (:104), `AuthController.changePassword` (:224),
  `PasswordResetService.performReset` (:94); customer: `CustomerAccountController.updateUser` password
  change (:177). **RBAC role changes are deliberately NOT a bump site** — the JWT carries no per-
  workspace role; RBAC re-checks server-side per request, so a role change needs no revocation.

## P1.2 Design decisions (stated; conservative + reversible — Orchestrator §5)
- **Nullable cutoff, NULL = "never revoked" → non-disruptive rollout.** V115 adds the column nullable
  with no backfill, so deploying the change invalidates **no** existing session (no mass logout); only
  a real revocation event sets a cutoff. (Chosen over `NOT NULL DEFAULT now()`, which would log every
  user out on deploy.)
- **Per-request DB lookup at the auth boundary** (a single indexed PK read). Revocation inherently
  requires server state, so this trades a sliver of the "stateless auth, no DB hit" property (RB-10 §2)
  for the revocation guarantee — the classic, accepted JWT-revocation cost. A shared-cache (Redis)
  optimization is the deferred follow-up. The lookup **fails OPEN** on a transient DB error (logged
  WARN) so a DB blip cannot lock every user out (the request would fail at the data layer regardless);
  an unusable token (missing subject/`iat`) **fails CLOSED**.
- **Second granularity.** `iat` is a whole-second NumericDate; the cutoff is stored truncated to the
  second and compared `iatSec < cutoffSec`, so a token minted later in the same second as a bump is
  never falsely revoked (≤1s residual window for a same-second pre-bump token — the standard trade-off).

## P1.3 Files
- `V115__token_version_revocation.sql` — nullable `tokens_valid_after TIMESTAMPTZ` on `users` +
  `customer_users`. **High-water now V115.**
- `TokenRevocationService.java` (new) — the one owner: `revokeUserTokens`/`revokeCustomerTokens` (bump)
  + `isUserTokenRevoked`/`isCustomerTokenRevoked` (check), JdbcTemplate, fail-open/closed contract.
  (The column is accessed only here via JDBC — intentionally unmapped on the entities; `ddl-auto=
  validate` allows extra columns.)
- `JwtUtil.java` — `extractIssuedAt(token): Instant`.
- `SecurityConfig.java` — inject `TokenRevocationService`; filter parses claims once + internal
  revocation check (`scope != customer`).
- `CustomerContext.java` — inject + customer revocation check (parity).
- Bump wiring: `DataPrivacyService`, `AuthController`, `PasswordResetService`, `CustomerAccountController`.
- Tests: `TokenRevocationServiceTest` (unit, 11), `TokenRevocationIT` (integration, 3),
  `SecurityConfigJwtFilterTest` (+ revoked→401), `PasswordResetServiceTest` (ctor).

## P1.4 Acceptance criteria
- A token issued before a bump is rejected with 401; a token issued at/after the bump is accepted;
  NULL cutoff revokes nothing. ✔ (IT + unit)
- Erase / password change / password reset bump the internal cutoff; portal password change bumps the
  customer cutoff. ✔ (wired; covered by the service IT + filter unit test)
- No migration disruption (nullable, no backfill); `ddl-auto=validate` green with the unmapped column;
  no auth regression. ✔ (FlywayMigrationIntegrationTest 2/2, SecurityAuditIntegrationTest 4/4)

## P1.5 Validation (local, 2026-06-21)
- Unit: `-Dgroups=unit clean verify` → **1418/0**, checkstyle clean, coverage met.
- Guardrails: blocking rules pass.
- Integration: `TokenRevocationIT` 3/3 (internal + customer parity + unknown-subject) ·
  `FlywayMigrationIntegrationTest` 2/2 (V1→V115 boot + validate) · `SecurityAuditIntegrationTest` 4/4.

## P1.6 Follow-on (this EPIC)
- **PR2:** `/auth/logout` + a `jti` claim + a `revoked_tokens` blocklist (individual-token revocation,
  beyond the coarse per-subject cutoff); portal logout parity.
- **PR3:** pluggable distributed `RateLimiter` store — **DB `rate_limit_windows` table first** (no new
  dependency) behind the unchanged `allow()/reset()` API; cross-instance IT.
- **PR4:** extend rate limiting to write endpoints; fix RB-10 §8 doc drift.
- **Deferred:** Redis/ElastiCache as the shared store + a cached revocation lookup — AWS infra EPIC.
- **Considered, out of scope for PR1:** revoking on customer-user **deactivation** (`active=false`) and
  on account disable — sensible future bump sites, kept out to hold PR1 to the erase/password set.
