# Iteration 19 — Enterprise Security + Compliance Certifications (Cap T) (completion)

Iteration 19 makes bSmart Works **sellable to security-conscious utilities, regulated industries,
and government customers**: SOC 2 Type 2 / ISO 27001 readiness, phishing-resistant auth, conditional
access, a forensic-grade tamper-evident audit log, data residency + customer-managed keys, AI
anomaly detection, and GDPR / DPDP data rights. It layers on the existing identity, event-store, and
AI-Control-Plane foundations and **does not disturb the iterations beneath it** (RB-20 §2).

> **Spec authority.** Iteration 19 is the security/compliance iteration in the roadmap
> (`06 §ITER 19`) and is the iteration RB-40 §4 names for SOC 2 Type 2 + ISO 27001. Everything here
> is spec-authoritative governance content (RB-40), built to the code as it actually exists
> (CLAUDE.md stack — Spring Boot 4, JPA, React/Vite). Orchestrator §6 is updated: active iteration
> **19 (complete)**, Flyway high-water **V52**, next **V53**.

> **No live model in this build.** AI anomaly detection routes through a deterministic heuristic
> (`AnomalyDetector`) that is the always-available fallback (RB-40 §2); an AI tier can later re-rank
> and enrich the same findings without changing the contract.

## 1. What shipped (Cap T)

| Sub-feature | What shipped | Key endpoint(s) |
|---|---|---|
| Passkeys / WebAuthn | Phishing-resistant, passwordless sign-in: register/authenticate ceremonies with single-use server challenges, ES256/RS256 public-key verification; password + TOTP MFA remain as fallback | `/api/v1/auth/passkeys/**`, `/api/v1/auth/passkey/authenticate/**` |
| Conditional access policies | IP allow-list (CIDR), geo, device-trust, time-of-day windows; per workspace & role; most-restrictive-wins; server-enforced | `/api/v1/security/conditional-access` |
| Tamper-evident audit log | Append-only, SHA-256 hash-chained security trail; DB-enforced immutability; browse/filter/export; chain verification | `/api/v1/security/audit-log` (+ `/verify`, `/export`) |
| Audit log streaming | Stream to external SIEM — Splunk / Datadog / ELK / webhook, JSON or ArcSight CEF | `/api/v1/security/streams` (+ `/drain`) |
| Data residency + BYOK | Per-workspace residency region; customer-managed-key *references* (KMS ARN / key id, never key material); AES-256 at rest | `/api/v1/security/settings` |
| Anomaly detection on access | New-geo, mass-export, privilege-escalation, impossible-travel, off-hours heuristics; admin resolve/dismiss | `/api/v1/security/anomalies` (+ `/analyze`, `/{id}/resolve`) |
| Data export (GDPR / DPDP) | Per-subject portable data export | `/api/v1/security/data-requests/export` |
| Right to be forgotten | Per-subject erasure via crypto-shred / tokenization; immutable audit trail preserved (RB-40 §3) | `/api/v1/security/data-requests/erase` |
| Pen-test program | Pen-test / red-team / bug-bounty register with severity counts and NDA-held report refs | `/api/v1/security/pentests` |
| Compliance certifications | One-click SOC 2 Type 2 / ISO 27001 evidence bundles snapshotting live control coverage | `/api/v1/security/evidence` (+ `/generate`, `/{id}/download`) |

## 2. The tamper-evident audit log (the architectural centrepiece)

A dedicated, admin-facing security audit log (`audit_log_entries`), **separate from the domain
event store** (`events`):

- **Hash chain.** Each entry's `entry_hash = SHA-256(prev_hash : workspace_id : seq : actor :
  action : target : epoch : detail)` (`AuditHashChain`). Any insert, edit, reorder or delete breaks
  the chain from that point; `verify` pinpoints the first broken link.
- **Append-only at the database.** A `BEFORE UPDATE OR DELETE` trigger blocks all mutation — the log
  is immutable even to a DBA (mirrors the V40 event-store guarantee).
- **Per-workspace sequence.** `(workspace_id, seq)` is unique and monotonic; the seed chain is
  computed in SQL with the **same** SHA-256 the application uses (pgcrypto), so it verifies on boot —
  the seed is genuinely tamper-evident, not faked.
- Every security action (settings change, policy CRUD, passkey registration, anomaly resolution,
  evidence generation, data export/erasure) appends one entry, so the log is the single forensic
  source the SIEM stream and the evidence bundles both read.

## 3. Architecture & rule-book conformance

- **Tenant isolation (RB-40 §1).** Every security table carries `workspace_id` and every repository
  finder is workspace-scoped; cross-tenant ids resolve to 404, never another tenant's data. Each
  controller has an **unauthorized / cross-tenant** access test.
- **RBAC in the service boundary (RB-10 §2).** Reads require `view_audit_log`, writes require
  `manage_security` (both ADMIN-tier, tier 4), enforced via `RbacService` in the controllers — never
  in annotations or the UI. Passkey self-service is intrinsically scoped to the JWT subject.
- **AI fallback contract (RB-40 §2).** Anomaly detection ships its deterministic detector as the
  fallback; nothing silently stops when AI is off or over budget.
- **Crypto-shred reconciliation (RB-40 §3).** Erasure tokenizes the subject's PII and retains only an
  opaque id, so the append-only audit/event history stays intact and re-derivable.
- **Design system (RB-30).** The Security Center uses tokens only, the five interactive states, and
  WCAG-AA semantics (tabs with `role="tab"`, `role="switch"` toggles, labelled controls).

## 4. Files

**Backend** — pure security logic (unit-tested, counted in coverage): `AuditHashChain`,
`ConditionalAccessEvaluator`, `AnomalyDetector`, `WebAuthnCrypto`. Entities/repositories/services for
passkeys, conditional access, audit log + streaming, security settings, anomalies, data-subject
requests, evidence bundles, and the pen-test register. Controllers: `WebAuthnController`,
`SecurityAdminController`, `SecurityAuditLogController`, `CompliancePrivacyController`. Migration
`V52__iteration19_enterprise_security.sql`.

**Frontend** — `components/works/organisms/security-center.jsx` (the admin surface), `lib/security.js`
(API client), `lib/passkey.js` (WebCrypto software authenticator), wired into `App.jsx` + `routes.js`.

## 5. Verification

- Backend unit tests (`@Tag("unit")`): `AuditHashChainTest`, `ConditionalAccessEvaluatorTest`,
  `AnomalyDetectorTest`, `WebAuthnCryptoTest` (real EC P-256 sign/verify), and the three controller
  **access** tests — all green; JaCoCo coverage gate met.
- Backend integration test (`SecurityAuditIntegrationTest`, Testcontainers + Flyway): the seeded
  chain verifies under the app's SHA-256, the log is append-only at the DB, appending via the service
  keeps the chain intact, and all security tables/permissions migrated. Migration also validated
  end-to-end against a real Postgres.
- Frontend: `security-center.test.jsx` (posture, chain-verified badge, anomaly resolve, read-only
  gating) + full suite green; lint + build clean; guardrails + AI-rules-sync + DoD-sync green.
