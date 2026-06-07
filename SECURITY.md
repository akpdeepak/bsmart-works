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

## Security posture (what is enforced)

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
- **Authorization:** `RbacService` enforced in the service layer; tier hierarchy
  VIEWER < MEMBER < LEAD < ADMIN < OWNER, permission-gated.
- **Multi-tenant isolation (RB-40 §1):** every row is workspace-owned; every repository query is
  workspace-scoped; no endpoint returns rows across tenants. This is the single catastrophic risk
  for a multi-DISCOM product and is tested per feature.
- **AI data boundary (RB-40 §2):** AI calls originate server-side only; prompts are PII-redacted at
  the boundary; every invocation is audited (who, when, capability, tier, tokens, cost, policy
  state); a per-workspace budget degrades then disables AI rather than overspending.
- **Transport & storage targets (RB-40 §4):** TLS 1.3 minimum in transit, AES-256 at rest, BYOK via
  KMS for tenants that require it; HTTP security headers and a strict CORS allow-list; rate limiting
  on auth and write endpoints.
- **Auditability:** state changes are event-sourced to an append-only `events` store; personal data
  is tokenized into a PII vault and crypto-shredded on erasure, so the audit trail stays immutable
  while DPDP/GDPR erasure is honoured (RB-40 §3).

## Certification roadmap

SOC 2 Type 2 and ISO 27001 are targeted at **iteration 19** (RB-40 §4). An annual third-party
penetration test plus the standing bug bounty form the external assurance layer.
