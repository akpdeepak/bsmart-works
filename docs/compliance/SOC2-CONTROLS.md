# bSmart Works — SOC 2 Type 2 Control Mapping

> Maps the AICPA Trust Services Criteria (TSC) to existing code evidence in this repository.
> Use this document as the starting brief for an audit engagement.
> Last verified: 2026-06-08 · Owner: Deepak Pandey

---

## How to read this table

| Column | Meaning |
|--------|---------|
| **TSC ref** | AICPA Trust Services Criteria identifier |
| **Control statement** | What the control requires |
| **Evidence** | Code artifact, test, or config that demonstrates the control |
| **Status** | ✅ In place · 🟡 Partial · ⚪ Requires policy doc |

---

## CC1 — Control Environment

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC1.1 | Board/management oversight of security | SECURITY.md — disclosure policy + bug bounty | ⚪ Policy doc required |
| CC1.2 | Organizational structure + accountability | CLAUDE.md RBAC rules; `RbacService.java` | ✅ |
| CC1.3 | Authority and responsibility | `RbacService.java` permission hierarchy; per-workspace roles | ✅ |
| CC1.4 | Human resources practices | ⚪ HR policy doc | ⚪ Policy doc required |
| CC1.5 | Accountability for controls | `SecurityAuditLogService` + SHA-256 hash chain (`AuditHashChain`) | ✅ |

---

## CC2 — Communication and Information

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC2.1 | Relevant information identified and used | `AuditLogController`; `AuditLogEntry` entity; tamper-evident chain | ✅ |
| CC2.2 | Internal communication | In-product notification system (`NotificationController`, `NotificationBatchService`) | ✅ |
| CC2.3 | External communication (incidents) | SECURITY.md disclosure policy; bug bounty process | ⚪ Process doc required |

---

## CC3 — Risk Assessment

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC3.1 | Risk identification | `AnomalyDetector` + `AnomalyDetectionService`: new-geo, mass-export, privilege-escalation, impossible-travel, off-hours heuristics | ✅ |
| CC3.2 | Risk analysis | `AnomalyDetectorTest`; scoring confirmed via test | ✅ |
| CC3.3 | Risk mitigation | Conditional access policies (`ConditionalAccessEvaluator`); IP/geo/device/time controls | ✅ |
| CC3.4 | Change management | Flyway-only schema changes; CI gates; PR template DoD; `ConfigVersionRepository` for config changes | ✅ |

---

## CC4 — Monitoring Activities

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC4.1 | Continuous monitoring | `GET /api/v1/observability/performance`; `PerformanceMonitor` ring-buffer; `StatusPage` component | ✅ |
| CC4.2 | Evaluation of control deficiencies | `SecurityAuditIntegrationTest.seededAuditChainVerifies()` — DB-level immutability + chain verification | ✅ |

---

## CC5 — Control Activities

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC5.1 | Controls over technology | Guardrails CI gate (`scripts/guardrails.sh`); ESLint; Checkstyle; JaCoCo coverage gate | ✅ |
| CC5.2 | Physical controls | ⚪ Cloud infra controls (AWS — target per RB-40 §5; not yet deployed) | 🟡 |
| CC5.3 | Policies and procedures | CLAUDE.md; rulebooks 05/10/20/30/40; SECURITY.md; ACCESSIBILITY.md; PERFORMANCE.md | ✅ |

---

## CC6 — Logical and Physical Access Controls

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC6.1 | Access restrictions | `RbacService`; workspace-scoped JWT; `AuthController` | ✅ |
| CC6.2 | User registration and de-provisioning | `UserLifecycleService`; `AccessReviewController`; bulk deactivation | ✅ |
| CC6.3 | Role-based access control | `RoleDef`, `RolePermission`, `PermissionScheme`; field-level security (`FieldVisibility`) | ✅ |
| CC6.4 | Access review | `GET /api/v1/access-reviews`; `AccessReviewController`; `ITERATION-16-COMPLETE.md` | ✅ |
| CC6.5 | Logical access removed upon termination | `UserLifecycleService.deactivate()` + JWT invalidation via token blacklist | ✅ |
| CC6.6 | Logical access restrictions from outside | CORS allow-list; rate limiting (`RateLimiter`); JWT stateless auth | ✅ |
| CC6.7 | Transmission of data | TLS 1.3 minimum (enforced in deployment; target AWS ALB config) | 🟡 Deploy config required |
| CC6.8 | Prevention of unauthorized access | `ConditionalAccessEvaluator` (IP/geo/device/time); `WebAuthnController` passkeys; MFA TOTP | ✅ |

---

## CC7 — System Operations

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC7.1 | Vulnerability detection | `npm audit --audit-level=high` in CI; `gitleaks` secrets scan in CI | ✅ |
| CC7.2 | Environmental threats | `AnomalyDetectionService`; anomaly audit events | ✅ |
| CC7.3 | Incident response | `SecurityAuditLogController` + SIEM streaming (Splunk/Datadog/ELK/CEF) | ✅ |
| CC7.4 | Incident response — classification | Severity tiers in `AnomalyDetector`; escalation policies (`ComplianceEscalationScheduler`) | ✅ |
| CC7.5 | Incident response — recovery | Event store provides full audit replay; `ConfigVersionRepository` enables config rollback | ✅ |

---

## CC8 — Change Management

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC8.1 | Infrastructure/software changes | Flyway forward-only migrations; branch protection on `main`; squash-merge only; CI gate | ✅ |

---

## CC9 — Risk Mitigation

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| CC9.1 | Risk identification + mitigation | TECH-DEBT.md; `AnomalyDetectionService`; `ConditionalAccessEvaluator` | ✅ |
| CC9.2 | Vendor risk management | ⚪ Vendor assessment process doc required | ⚪ Policy doc required |

---

## Availability (A1)

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| A1.1 | Availability commitments | `GET /api/v1/status`; `StatusPage` component; `PerformanceMonitor` | ✅ |
| A1.2 | Performance monitoring | `PerformanceMonitor` P50/P95/P99 ring buffer; k6 load test scripts in `tests/load/` | ✅ |
| A1.3 | Disaster recovery | Event store append-only (replay); `ConfigVersionRepository` (rollback); Flyway (schema recovery) | ✅ |

---

## Confidentiality (C1)

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| C1.1 | Confidential data identified | `pii_vault_entries` table; `PiiVaultEntry.java`; RB-40 §3 crypto-shredding design | ✅ |
| C1.2 | Confidential data protected | AES-256-GCM (`EncryptionService`); BYOK seam (`KmsProvider`/`LocalKmsProvider`/`AwsKmsProvider`) | ✅ |

---

## Privacy (P-series)

| TSC ref | Control statement | Evidence | Status |
|---------|------------------|----------|--------|
| P1.1 | Privacy notice | ⚪ Legal privacy notice required | ⚪ Policy doc required |
| P2.1 | Choice and consent | `CompliancePrivacyController`; data export and erasure endpoints | ✅ |
| P3.1 | Collection | PII vault tokenization — raw PII never in events, projections, or logs | ✅ |
| P4.1 | Use, retention, disposal | `POST /api/v1/security/data-requests/erase` (crypto-shredding); key destruction propagates | ✅ |
| P5.1 | Access | `GET /api/v1/security/data-requests/export`; GDPR/DPDP data export | ✅ |
| P6.1 | Disclosure | `AuditLogController`; SIEM streaming for authorized third parties | ✅ |

---

## Remaining gaps for audit engagement

1. **Policy documents** (CC1.1, CC1.4, CC2.3, CC9.2, P1.1) — HR policy, vendor risk management, incident communication process, and privacy notice require written policies, not code artifacts.
2. **TLS 1.3 enforcement** (CC6.7) — must be configured in the AWS ALB/CloudFront deployment config; not a code artifact.
3. **Physical controls** (CC5.2) — AWS data centre certifications; covered by AWS BAA / SOC 2 Type 2 inherited controls.
4. **Annual penetration test** — engage a qualified penetration testing firm; evidence = report.
5. **Observation period** — SOC 2 Type 2 requires a minimum 6-month observation window during which controls operate continuously.
