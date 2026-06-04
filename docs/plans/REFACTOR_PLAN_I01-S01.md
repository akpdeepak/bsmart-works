# Refactor Plan — I01-S01 · Cap A · Authentication & identity

> Iteration 1 (Release 1.0) — Foundation, The Works MVP
> Spec (guide Part 7): *"Email + password signup with email verification, MFA via TOTP, password reset, session management."*
> Branch: `refactor/iter-01/s01-authentication-identity` · Pipeline: `docs/REFACTOR_MASTER_PROMPT.md`
> Status: **awaiting GATED sign-off** (Phase 2). No code written yet.

---

## Classification: **Partial** (refactor + complete to spec)

Auth is ~80% built and largely sound. What works today: email+password signup, email verification,
JWT stateless sessions (HS256, 32-byte secret, 7-day expiry), TOTP MFA (RFC 6238, ±30s drift),
login with MFA challenge, BCrypt hashing with legacy-SHA-256 auto-migration, event-sourced auth
events, secure headers + CORS + stateless CSRF-off. Three gaps keep it from being a faithful
expression of the spec, plus two security smells.

### Phase-1 findings by lens
- **Architect:** `password_reset_tokens` table (V4) exists but is **dead code** — never written or
  read. `EmailService` exists with `JavaMailSender` wired (MailHog) but auth flows bypass it and
  `log.info("[EMAIL]…")` instead. No second parallel implementation of a unification layer; auth
  is single-sourced. Good.
- **System designer:** auth events recorded to the event store (`USER_SIGNED_UP`, `EMAIL_VERIFIED`,
  `USER_LOGGED_IN`, `PASSWORD_RESET`) — event-sourcing honored. Email send already fails-soft
  (graceful degradation). Password-reset token lifecycle is incomplete (no issue/consume/expire).
- **Product manager:** the spec's "password reset" is **not deliverable today** — `forgot-password`
  only logs; the only working reset path (`/reset-password`) requires the user to already be logged
  in and know their current password, which is useless for a locked-out user. This is the core gap.
- **UI/UX lead:** the "Forgot password" screen collects an email and dead-ends — there is **no
  screen to set a new password from a reset link**. Auth UI lives inside the 2500-line `App.jsx`
  monolith. Need to confirm token usage (brand-navy/orange), single orange primary action, five
  states, and WCAG 2.2 AA keyboard-only operability on every auth screen.
- **Developer:** **no migration required** (table + columns already present at V4). Behavioral +
  additive changes only → cleanly revertable. MFA endpoints trust an `X-User-Id` **request header**
  instead of the authenticated JWT principal — a real account-lockout/takeover vector.

---

## In-scope changes (numbered)

### 1. Complete the password-reset flow (token-based, unauthenticated) — *PM + Architect*
Split the conflated endpoint into the correct two:
- `POST /api/v1/auth/forgot-password` (public): look up user; if found, issue a single-use,
  time-boxed token into `password_reset_tokens`; email the reset link via `EmailService`. **Always**
  return the same neutral 200 message (no user enumeration). Record a `PASSWORD_RESET_REQUESTED` event.
- `POST /api/v1/auth/reset-password` (public, **refactored**): accept `{ token, newPassword }`;
  validate token exists, `used = false`, `expires_at > now`; update hash; mark token `used = true`;
  record `PASSWORD_RESET` event.
- `POST /api/v1/auth/change-password` (**new, authenticated**): the current `currentPassword + newPassword`
  logic moves here — this is "change password while logged in", a distinct concern.

Add a lightweight `PasswordResetToken` access path (JdbcTemplate, mirroring `EmailService`, or a
small entity+repo — implementer's choice; no schema change either way).
**Acceptance:** forgot→email→reset works end-to-end; invalid/expired/used tokens rejected with the
one error shape `{code,message,field?}`; no user enumeration; events recorded; authenticated
change-password still works.

### 2. Wire real email for verification + password reset — *PM + System designer*
Add `sendVerificationEmail(...)` and `sendPasswordResetEmail(...)` to `EmailService`; call them from
`AuthController.signup` and `forgot-password`, replacing the `log.info("[EMAIL]…")` stubs. Preserve
graceful degradation (SMTP failure logs, never throws) and keep `app.auth.expose-dev-verification-token`
for local UAT.
**Acceptance:** signup + forgot-password deliver mail to MailHog in dev; an SMTP outage does not
break the request (verified by test with mail sender stubbed to throw).

### 3. Fix MFA endpoints to use the JWT principal, not `X-User-Id` — *Security (fail-closed)*
`/mfa/enroll`, `/mfa/confirm`, `/mfa/disable` derive the user from the authenticated principal
(reuse `AuthenticatedUser`), **ignoring** any `X-User-Id` header. `/mfa/verify` stays
body-`userId` (it runs pre-auth during the login challenge) but is unchanged otherwise. Update the
frontend MFA calls to drop the header.
**Acceptance:** a logged-in user can only enroll/confirm/disable MFA for **themselves**; a forged
`X-User-Id` is ignored; **unauthorized test** added proving the header is not trusted.

### 4. Rate-limit the auth endpoints — *Security (RB-10 §8; flagged gap in V11 notes)*
In-memory per-IP + per-email fixed-window limiter on `login`, `forgot-password`, `reset-password`,
`verify` (in-process is correct for the modular monolith today; a shared store is an extraction-time
concern). Exceed → `429` in the standard error shape.
**Acceptance:** N rapid attempts → 429; legitimate use under threshold unaffected; covered by test.

### 5. Tests — *Definition of Done* 
- **Backend (JUnit 5 + Testcontainers, real Postgres):** signup→verify→login happy path; password
  reset (happy / expired / used / invalid token); change-password (authenticated); MFA
  enroll→confirm→verify→disable via JWT; rate-limit trip; **unauthorized** test for the MFA
  header-trust fix.
- **Frontend (Vitest + RTL):** login, signup, verify, MFA challenge, forgot-password, and the new
  reset-password screen — behavior, validation, error/empty states.
- **Cross-tenant:** documented **N/A for this spec** — identity is global/pre-workspace; tenant
  scoping enters with Workspaces (parked to I01-S02). Recorded explicitly rather than skipped.

### 6. UI/UX: add the reset-password screen + tokenize/extract the auth surface — *UI/UX lead*
- Add the missing **set-new-password** screen (consumes the reset token from the link).
- Audit all auth screens against Part 4 non-negotiables: one orange primary action, ≤2-nav,
  skeleton not spinner, five interactive states, WCAG 2.2 AA keyboard-only, color-not-sole-indicator;
  replace any literal hex/px with design tokens (guide brand: navy `#0B2F5C`, orange `#E94E1B`).
- **Bounded extraction**: lift only the auth screens out of `App.jsx` into dedicated components
  (`works-frontend/src/features/auth/…`). The broader `App.jsx` decomposition is **parked** (§ below).
**Acceptance:** reset flow works in the browser; axe/keyboard pass on auth screens; no token-lint
violations; before/after screenshots captured at Phase 5.

---

## Out-of-scope — parked (see `docs/PARKED.md`)
| Item | Target spec |
|------|-------------|
| RBAC checks living in `WorkspaceController` (should be in service) | I01-S02 Workspaces / Iteration 3 permissions |
| Multi-workspace selection + tenant context in JWT at login | I01-S02 Workspaces (governance-sensitive) |
| Full `App.jsx` (2500-line) decomposition beyond auth | Tech-debt (cross-cutting; `TECH-DEBT.md`) |
| Refresh tokens / JWT revocation/blacklist | Iteration 19 — Enterprise Security |
| Remove legacy SHA-256 path once all users migrated | Iteration 19 / chore (needs migration audit) |
| Enforce-MFA workspace policy | Iteration 19 |

---

## Test & validation plan (summary)
Functional (per acceptance criterion) · edge/negative (expired/used/invalid token, wrong TOTP,
unverified login) · regression on the auth filter chain + existing `JwtUtilTest` · UI/UX vs Part 4 +
tokens · accessibility (keyboard-only + contrast) · performance smoke: work-item-create ≤300ms isn't
relevant; **login P95 ≤ 800ms** page-load gate checked on the live build. Full suite must stay green.

## Risk & rollback
- **No schema change** → revert = revert the branch; nothing to un-migrate.
- **MFA header→JWT change is breaking** for any current caller using `X-User-Id`; the frontend is
  updated in the same PR; the `/mfa/verify` login path is unaffected.
- **Email wiring** is fail-soft; worst case dev sees no mail (MailHog down) — flagged, not fatal.
- **Rate limiter** false-positives → generous thresholds + per-email+IP keys; in-memory only.

## Depth
Restructure (not a rewrite): endpoint split + new public reset path, email wiring, a security fix,
a rate limiter, an auth-UI extraction, and the test suite the feature never had.
