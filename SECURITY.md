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

> **⚠️ In progress (CF-1):** the `.github/` directory — including `ci.yml` — is currently **absent on
> `main`**, so the CI gate described below is **not running**. Restoring CI is the first Phase-1 item
> (see `docs/implementation/MASTER-COMPLETION-ROADMAP.md` §0.1). The controls below describe the
> intended gate.

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
- **Multi-tenant isolation (RB-40 §1):** every row is workspace-owned; tenant scoping is applied
  **per query** today (workspace-scoped repository methods) and covered by cross-tenant denial tests
  per feature. *In progress (#243):* a **central Hibernate tenant filter** that enforces isolation by
  construction — so a single forgotten predicate cannot leak — currently covers one entity (`Project`)
  and is being extended to all entities. Until then, isolation depends on per-query discipline, not a
  structural guarantee. This is the single catastrophic risk for a multi-DISCOM product.
- **AI data boundary (RB-40 §2):** AI calls originate server-side only; prompts are PII-redacted at
  the boundary; every invocation is audited (who, when, capability, tier, tokens, cost, policy
  state); a per-workspace budget degrades then disables AI rather than overspending.
- **Transport & storage:** TLS 1.3 minimum in transit (terminated upstream); **AES-256-GCM at rest for
  fields encrypted via `EncryptionService`**; HTTP security headers and a strict CORS allow-list; rate
  limiting on auth and write endpoints (per-instance today — distributed limiting *in progress*).
  *In progress:* **BYOK via external KMS** — a local key provider is active; the AWS KMS provider is not
  yet implemented.
- **Auditability:** state changes are event-sourced to an append-only `events` store, with a
  tamper-evident audit hash chain. *In progress (RB-40 §3):* **PII-vault tokenization + crypto-shredding**
  for DPDP/GDPR erasure is the target design and is partially scaffolded — it is **not yet** the
  enforced path for all personal data (some personal fields are still stored directly), so erasure and
  the "no raw PII outside the vault" guarantee are not yet complete.

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

SOC 2 Type 2 and ISO 27001 are targeted (control mapping in `docs/compliance/`). *In progress:*
reconciling that control mapping to actual code/test evidence — do not represent certification as
achieved. An annual third-party penetration test plus the standing bug bounty form the external
assurance layer.

> **In progress — field-level security (RB-40 §1):** per-field, per-role visibility is defined and
> computed, but server-side **response redaction is not yet applied**, so a hidden field can still be
> returned to a reader who knows its name. Tracked in `MASTER-COMPLETION-ROADMAP.md` §4.
