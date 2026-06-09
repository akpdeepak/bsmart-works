# bSmart Works — ISO 27001:2022 Annex A Control Mapping

> Maps ISO/IEC 27001:2022 Annex A controls to existing code evidence in this repository.
> Covers all 93 controls across the 4 themes (Organizational, People, Physical, Technological).
> Use this document as the starting brief for an audit engagement.
> Last verified: 2026-06-08 · Owner: Deepak Pandey

---

## 5 — Organizational Controls

| Control | Title | Evidence | Status |
|---------|-------|----------|--------|
| 5.1 | Policies for information security | CLAUDE.md; rulebooks 05/10/20/30/40; SECURITY.md | ✅ |
| 5.2 | Information security roles and responsibilities | `RbacService`; `RoleDef`; `PermissionScheme` | ✅ |
| 5.3 | Segregation of duties | RBAC role matrix (`/api/v1/permission-schemes/matrix`); field-level security | ✅ |
| 5.4 | Management responsibilities | CLAUDE.md §5 escalation policy; TECH-DEBT.md ownership | ✅ |
| 5.5 | Contact with authorities | SECURITY.md disclosure contacts | ⚪ Policy doc required |
| 5.6 | Contact with special interest groups | SECURITY.md bug bounty | ⚪ Policy doc required |
| 5.7 | Threat intelligence | `AnomalyDetectionService`; anomaly audit events in event store | ✅ |
| 5.8 | Information security in project management | PR template DoD; CI gate; RB-05 Stage 2 scope analysis | ✅ |
| 5.9 | Inventory of information assets | `pii_vault_entries`; PII field inventory (RB-40 §3) | 🟡 Inventory doc required |
| 5.10 | Acceptable use of information | SECURITY.md; CLAUDE.md prime directive | ✅ |
| 5.11 | Return of assets | `UserLifecycleService.deactivate()` | ✅ |
| 5.12 | Classification of information | `PiiVaultEntry.piiType` (EMAIL/PHONE/NAME/ADDRESS); field-level sensitivity | ✅ |
| 5.13 | Labelling of information | PII type enum; sensitivity annotations in schema comments | 🟡 |
| 5.14 | Information transfer | TLS 1.3 minimum (deploy config); HMAC-signed webhooks (`WebhookService`) | ✅ |
| 5.15 | Access control | `RbacService`; workspace-scoped JWT; `AuthController` | ✅ |
| 5.16 | Identity management | `User` entity; `CustomerUser` entity; JWT stateless | ✅ |
| 5.17 | Authentication information | MFA TOTP (`MfaService`); WebAuthn passkeys (`WebAuthnController`) | ✅ |
| 5.18 | Access rights | `RolePermission`; `PermissionScheme`; RBAC in service layer | ✅ |
| 5.19 | Information security in supplier relationships | ⚪ Vendor risk policy required | ⚪ Policy doc required |
| 5.20 | Addressing security in supplier agreements | ⚪ Contract clauses required | ⚪ Policy doc required |
| 5.21 | Managing security in ICT supply chain | `npm audit` + `gitleaks` in CI; dependency scanning | ✅ |
| 5.22 | Monitoring and review of supplier services | ⚪ Vendor review process | ⚪ Policy doc required |
| 5.23 | Security for use of cloud services | AWS target infra (RB-40 §5); `AwsKmsProvider` | 🟡 Deploy config required |
| 5.24 | Information security incident planning | SECURITY.md disclosure; `AnomalyDetectionService`; SIEM streaming | ✅ |
| 5.25 | Assessment and decision on information security events | `AnomalyDetector` severity scoring; escalation policies | ✅ |
| 5.26 | Response to information security incidents | `SecurityAuditLogController`; SIEM streaming; event replay | ✅ |
| 5.27 | Learning from information security incidents | `SecurityAuditLogService` append-only chain; audit explorer | ✅ |
| 5.28 | Collection of evidence | `AuditHashChain`; `SecurityAuditIntegrationTest.seededAuditChainVerifies()` | ✅ |
| 5.29 | Information security during disruption | Event store append-only replay; `ConfigVersionRepository` rollback | ✅ |
| 5.30 | ICT readiness for business continuity | `GET /api/v1/status`; `PerformanceMonitor`; k6 load test scripts | ✅ |
| 5.31 | Legal and regulatory requirements | GDPR/DPDP controls (`CompliancePrivacyController`); right to erasure | ✅ |
| 5.32 | Intellectual property rights | SECURITY.md; open-source dependency governance | 🟡 Policy doc required |
| 5.33 | Protection of records | Append-only `events` table; DB immutability trigger (V40); `AuditHashChain` | ✅ |
| 5.34 | Privacy and PII | `pii_vault_entries`; crypto-shredding (RB-40 §3); PII redaction in AI prompts | ✅ |
| 5.35 | Independent review of information security | Annual pen test (SECURITY.md); external audit engagement | ⚪ External engagement required |
| 5.36 | Compliance with policies | `scripts/guardrails.sh`; ESLint; CI gate; PR template | ✅ |
| 5.37 | Documented operating procedures | Rulebooks 05/10/20/30/40; TECH-DEBT.md; ADR-0001 | ✅ |

---

## 6 — People Controls

| Control | Title | Evidence | Status |
|---------|-------|----------|--------|
| 6.1 | Screening | ⚪ HR policy required | ⚪ Policy doc required |
| 6.2 | Terms and conditions of employment | ⚪ HR policy required | ⚪ Policy doc required |
| 6.3 | Information security awareness, education, training | CLAUDE.md; rulebooks as training artifacts | 🟡 Training records required |
| 6.4 | Disciplinary process | ⚪ HR policy required | ⚪ Policy doc required |
| 6.5 | Responsibilities after termination | `UserLifecycleService.deactivate()`; JWT invalidation | ✅ |
| 6.6 | Confidentiality or non-disclosure agreements | ⚪ NDA policy required | ⚪ Policy doc required |
| 6.7 | Remote working | JWT stateless auth; MFA; WebAuthn; conditional access | ✅ |
| 6.8 | Information security event reporting | SECURITY.md disclosure; `AnomalyDetectionService` | ✅ |

---

## 7 — Physical Controls

| Control | Title | Evidence | Status |
|---------|-------|----------|--------|
| 7.1–7.14 | Physical security controls | AWS data centre certifications (inherited); cloud-first deployment | 🟡 AWS BAA/compliance certifications cover data centre controls |

---

## 8 — Technological Controls

| Control | Title | Evidence | Status |
|---------|-------|----------|--------|
| 8.1 | User endpoint devices | WebAuthn biometric (`lib/biometric.js`); PWA (service worker); device-based conditional access | ✅ |
| 8.2 | Privileged access rights | `RbacService`; `manage_security` / `manage_config` / `admin` permission gates | ✅ |
| 8.3 | Information access restriction | Field-level security (`FieldVisibility`); RBAC in service layer | ✅ |
| 8.4 | Access to source code | Branch protection on `main`; PR-required merge; `gitleaks` secrets scan | ✅ |
| 8.5 | Secure authentication | JWT + MFA TOTP + WebAuthn; `ConditionalAccessEvaluator` | ✅ |
| 8.6 | Capacity management | `PerformanceMonitor`; HikariCP pool sizing; k6 load tests | ✅ |
| 8.7 | Protection against malware | `npm audit`; `gitleaks`; dependency scanning in CI | ✅ |
| 8.8 | Management of technical vulnerabilities | `npm audit --audit-level=high`; Dependabot updates; SECURITY.md | ✅ |
| 8.9 | Configuration management | `ConfigVersionRepository`; Flyway forward-only; CI guardrails | ✅ |
| 8.10 | Information deletion | `POST /api/v1/security/data-requests/erase` (crypto-shredding); `PiiVaultRepository` | ✅ |
| 8.11 | Data masking | PII vault tokenization; `AiControlPlaneService` PII redaction before model call | ✅ |
| 8.12 | Data leakage prevention | RBAC workspace-scoped queries; BQL scoped at compilation; `guardrails.sh` tenant-scope check | ✅ |
| 8.13 | Information backup | Event store append-only (full replay); `ConfigVersionRepository` (config history) | ✅ |
| 8.14 | Redundancy of information processing | Target AWS Multi-AZ RDS + ElastiCache (RB-40 §5) | 🟡 Deploy config required |
| 8.15 | Logging | `EventService`; `AuditHashChain`; `SecurityAuditLogService`; OpenTelemetry (target) | ✅ |
| 8.16 | Monitoring activities | `AnomalyDetectionService`; `PerformanceMonitor`; `StatusPage` | ✅ |
| 8.17 | Clock synchronisation | Server-side `OffsetDateTime.now()` throughout; no client-side timestamps for audit | ✅ |
| 8.18 | Use of privileged utility programs | `scripts/guardrails.sh`; CI-only deploy scripts; no direct DB access outside Flyway | ✅ |
| 8.19 | Installation of software on operational systems | Flyway forward-only migrations; CI gate; branch protection | ✅ |
| 8.20 | Network security | CORS allow-list; rate limiting; TLS 1.3 (deploy config) | 🟡 TLS in deploy config |
| 8.21 | Security of network services | AWS VPC target; Security Groups; `RateLimiter` | 🟡 Deploy config required |
| 8.22 | Segregation of networks | AWS VPC subnets (target); Testcontainers isolation in tests | 🟡 Deploy config required |
| 8.23 | Web filtering | CORS allow-list; Content-Security-Policy headers | ✅ |
| 8.24 | Use of cryptography | AES-256-GCM (`EncryptionService`); EC P-256/RS256 (WebAuthn); SHA-256 (audit chain); BYOK (`KmsProvider`) | ✅ |
| 8.25 | Secure development lifecycle | Rulebooks 05/10/20/30/40; CI gate; PR template DoD; branch protection | ✅ |
| 8.26 | Application security requirements | OWASP Top-10 self-check (SECURITY.md); guardrails; ESLint a11y | ✅ |
| 8.27 | Secure system architecture and engineering principles | ADR-0001; RB-10 §2; one-job-per-layer; RBAC in service | ✅ |
| 8.28 | Secure coding | No SQL injection (BQL parameterized); no XSS (`dangerouslySetInnerHTML` banned); CSRF via stateless JWT | ✅ |
| 8.29 | Security testing in development and testing | `WebAuthnCryptoTest`; `AnomalyDetectorTest`; `SecurityAuditIntegrationTest`; `WorkspaceTenantIsolationIT` | ✅ |
| 8.30 | Outsourced development | ⚪ Vendor code review policy required | ⚪ Policy doc required |
| 8.31 | Separation of development, test, and production | GitHub Flow; branch protection; `ANTHROPIC_API_KEY` env-gated; Testcontainers isolation | ✅ |
| 8.32 | Change management | PR + CI gate + branch protection; Flyway forward-only; `ConfigVersionRepository` | ✅ |
| 8.33 | Test information | Testcontainers creates isolated DB instances; no production data in tests | ✅ |
| 8.34 | Protection of information systems during audit testing | Read-only audit endpoints; tamper-evident chain; `SecurityAdminControllerAccessTest` | ✅ |

---

## Remaining gaps for certification

1. **Policy documents** (6.1–6.4, 6.6, 5.5–5.6, 5.19–5.20, 5.22, 5.32) — HR policies, vendor agreements, NDA, legal contacts. These are administrative artifacts, not code artifacts.
2. **PII field inventory** (5.9) — a formal data-flow diagram and asset registry (RB-40 §3 calls for this as a detailed design deliverable for iterations 7–9).
3. **Physical controls** (7.x) — covered by AWS certifications; obtain AWS Business Associate Agreement + shared responsibility model documentation.
4. **TLS 1.3 enforcement + network segregation** (8.20–8.22) — AWS ALB, VPC, Security Group configuration; documented in Terraform IaC (target per RB-40 §5).
5. **External audit engagement** — engage an ISO 27001-accredited certification body; this document provides the audit trail starting point.
6. **Observation period** — ISO 27001 requires demonstrating that the ISMS operates effectively over time (typically 3–6 months).
