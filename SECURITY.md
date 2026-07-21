# Security Policy — bSmart Works

> Iteration 20, Cap T (final security hardening). This is the public security-disclosure policy and
> a summary of the platform's security posture. It is governed by **RB-40 §4 (security depth)** and
> **RB-10 §8 (engineering-surface hardening)**; precedence is `SOURCE-OF-TRUTH.md`.

## Reporting a vulnerability

If you believe you have found a security vulnerability in bSmart Works, report it privately — **do
not open a public issue or PR**, and do not disclose it publicly until we have remediated it.

- **Email:** security@bcits.in (PGP key on request).
- **What to include:** affected component/endpoint, a reproduction (steps, request/response, or a
  minimal PoC), the impact you observed, and any suggested remediation.
- **Scope:** the application backend (`works-backend`), the web app (`works-frontend`), the customer
  portal, and the public API. Social-engineering, physical attacks, and volumetric DoS are out of
  scope.

### Our commitment (coordinated disclosure)

| Stage | Target |
|-------|--------|
| Acknowledge receipt | within **2 business days** |
| Triage + severity (CVSS) | within **5 business days** |
| Fix or mitigation for Critical/High | as fast as possible; **≤ 30 days** target |
| Public disclosure / advisory | coordinated with the reporter after the fix ships |

We operate a **bug bounty** for in-scope, previously-unknown vulnerabilities (Cap T). Good-faith
research that respects this policy will not be pursued legally; we credit reporters in the advisory
unless anonymity is requested.

## Supported versions

bSmart Works ships from `main` as tagged releases (RB-10 §9). Security fixes land on `main` and are
released as a PATCH; only the latest release is supported.

## Security posture

> This section distinguishes **what is enforced today** from **what is in progress**. Items marked
> *in progress* are target commitments (RB-40) that are partially built — see
> `docs/implementation/MASTER-COMPLETION-ROADMAP.md` §4 for verified status. Do **not** represent an
> in-progress control as enforced in customer, sales, or audit materials until its note is removed.

> **CI is operational.** The `.github/` directory — including `ci.yml` — was restored in Phase 0 and the
> full gate (~14 checks) blocks merge on every push & PR. (The earlier "⚠️ CI absent" caveat is
> resolved.) Verified control-evidence mapping: `docs/compliance/CONTROL-MATRIX.md`.

**In CI on every push & PR (the gate that blocks merge — `.github/workflows/ci.yml`):**

- **Secret scanning** — gitleaks over the full branch history (`.gitleaks.toml`).
- **Dependency vulnerability scanning** — `npm audit --audit-level=high` (frontend); fails on
  HIGH/CRITICAL. Backend dependencies are managed via Maven with Dependabot updates.
- **Static architecture/security guardrails** — `scripts/guardrails.sh`: RBAC must live in the
  service layer (never controllers/UI), no string-concatenated SQL/JPQL (bind parameters only), no
  `System.out` logging, server-side-only AI calls, Flyway-only schema changes.
- **A11y/XSS lint** — ESLint (`eslint-plugin-jsx-a11y`, `no-restricted-imports` for a single
  `apiClient`); the app escapes on render and sanitizes any HTML (`DOMPurify`).
- **Behaviour tests** — every feature ships an **unauthorized** and a **cross-tenant** test
  (RB-40 §1); JUnit + Testcontainers run all Flyway migrations end-to-end.

**Application controls:**

- **Authentication:** Spring Security with stateless JWT; MFA (TOTP) for sensitive accounts.
- **Production secret guard:** staging/production startup fails if `BSMART_JWT_SECRET` is missing,
  too short, still uses the dev value, or if development verification-token exposure is enabled.
- **Authorization:** `RbacService` enforced in the service layer; tier hierarchy
  VIEWER < MEMBER < LEAD < ADMIN < OWNER, permission-gated.
- **Multi-tenant isolation (RB-40 §1):** every row is workspace-owned; tenant scoping is applied both
  **per query** (workspace-scoped repository methods, cross-tenant denial test per feature) and by a
  **central Hibernate tenant filter (#243)** — one `@FilterDef` applied to **136 entities** (direct +
  transitive subquery, incl. `work_items`), enforced structurally by `TenantFilterCoverageTest` (every
  entity filtered-or-allow-listed) so a forgotten predicate cannot silently leak. Per-request filter
  binding is flag-gated (`tenant.filter.binding.enabled`, default off, canary-first); per-query
  predicates remain as defence-in-depth backstop until it soaks. findById/PK loads carry ownership
  re-checks (`@Filter` does not cover by-PK fetch). This is the single catastrophic risk for a
  multi-DISCOM product. Evidence: `docs/compliance/CONTROL-MATRIX.md` §1.
- **AI data boundary (RB-40 §2):** AI calls originate server-side only; prompts are PII-redacted at
  the boundary; every invocation is audited (who, when, capability, tier, tokens, cost, policy
  state); a per-workspace budget degrades then disables AI rather than overspending.
- **Token revocation (RB-40 §4):** stateless JWTs are revocable — a per-subject `tokens_valid_after`
  cutoff (bumped on erase / password change / reset, internal + customer parity) and a per-token `jti`
  blocklist for logout, enforced at both auth boundaries.
- **Transport & storage:** TLS 1.3 minimum in transit (terminated upstream); **AES-256 at rest** for
  vault/encrypted fields; HTTP security headers and a strict CORS allow-list; rate limiting on auth
  endpoints, plus a **distributed (DB-backed) rate-limit store** and **per-user write-endpoint limiting**
  available behind flags for multi-instance deploys. **BYOK via external KMS** is implemented — the AWS
  KMS provider activates when cloud credentials are configured (LocalStack-validated), with a local
  master-key provider as the default.
- **Auditability:** state changes are event-sourced to an append-only `events` store, with a
  tamper-evident audit hash chain. **PII-vault tokenization + crypto-shredding** (RB-40 §3) is the
  enforced erasure path: personal data lives in a per-subject encrypted vault keyed by an opaque token;
  "forget" destroys the per-subject key so the data is cryptographically unrecoverable while the audit
  chain stays intact. Guardrails (`guardrails.sh` + an ArchUnit rule) block raw PII in the event/audit
  layer. The CONTRACT migration that drops the legacy plaintext columns (post dual-write soak) is the
  one remaining vault step.

## Operational readiness

Public Actuator liveness/readiness probes expose only status and component names. Deployment health
includes database, Flyway migration, attachment storage, AI provider, and realtime transport status.

## Production-required secrets

These values must be set through a private environment file, GitHub environment secrets, or the
target runtime secret manager. Never commit filled values.

| Secret/config | Required in production | Notes |
|---------------|------------------------|-------|
| `BSMART_JWT_SECRET` | Yes | Random non-dev value, at least 32 bytes |
| `POSTGRES_PASSWORD` / `BSMART_DB_PASSWORD` | Yes | Use separate app and admin DB users where possible |
| `ENCRYPTION_KEY` | Yes for durable encrypted data | Base64 AES-256 key; rotate through the approved key process |
| `ANTHROPIC_API_KEY` | Optional | Enables live AI provider; blank uses deterministic offline provider |
| OAuth client secrets | Optional | Required only for enabled Slack/GitHub/GitLab integrations |

## Certification roadmap

SOC 2 Type 2 and ISO 27001 are targeted. The control → code → test/guardrail evidence mapping is
maintained at **`docs/compliance/CONTROL-MATRIX.md`** (verified against `main`). Certification itself is
not yet achieved — do not represent it as such — but the control baseline the audit reads from is in
place. An annual third-party penetration test plus the standing bug bounty form the external assurance
layer.

> **In progress — field-level security (RB-40 §1):** per-field, per-role visibility is defined and
> computed, but server-side **response redaction is not yet applied**, so a hidden field can still be
> returned to a reader who knows its name. Tracked in `MASTER-COMPLETION-ROADMAP.md` §4.
