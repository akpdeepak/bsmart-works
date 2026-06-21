# bSmart Works — Security & Governance Control Matrix (control → code → test)

> **The evidence artifact for SOC 2 (Trust Services / Common Criteria) and ISO 27001 (Annex A).**
> Each control maps to the **implementing code** and the **automated test/guardrail** that proves it.
> Verified against `main` (W1 Phase-1 governance & security closure). Code is canonical — where the
> older `SOC2-CONTROLS.md` / `ISO27001-CONTROLS.md` (2026-06-08) disagree, this matrix wins.
>
> Owner: Deepak Pandey · Last verified: 2026-06-21 · Scope: backend `com.bcits.works`.
> Status legend: **Enforced** = built + machine-proven; **Enforced (flag-gated)** = built + tested,
> activation is a per-environment operator flip (canary-first rollout); **Partial** = functional but a
> hardening upgrade is planned.

---

## Coverage summary

| # | Control | SOC2 (CC) | ISO 27001 (A) | Status |
|---|---------|-----------|---------------|--------|
| 1 | Multi-tenant isolation | CC6.1 / CC6.3 | A.5.15, A.8.3 | Enforced (+ central filter binding flag-gated) |
| 2 | PII vault + crypto-shredding | CC6.7 / C1.2 | A.8.10, A.8.11 | Enforced |
| 3 | Append-only audit chain | CC7.2 / CC7.3 | A.8.15, A.12.4 | Enforced |
| 4 | RBAC (least privilege) | CC6.1 / CC6.3 | A.5.15, A.5.18 | Enforced |
| 5 | Field-level security | CC6.1 | A.8.3 | Enforced |
| 6 | MFA (TOTP) + WebAuthn | CC6.1 | A.5.17, A.8.5 | Enforced (TOTP) / Partial (real WebAuthn pending) |
| 7 | Rate limiting | CC6.6 | A.8.20 | Enforced (auth) + Enforced (flag-gated: distributed + writes) |
| 8 | JWT revocation | CC6.1 / CC6.2 | A.5.17, A.8.5 | Enforced |
| 9 | Right-to-be-forgotten / erasure | P4 / C1.2 | A.8.10 | Enforced |
| 10 | Encryption at rest / BYOK / KMS | CC6.7 | A.8.24 | Enforced |
| 11 | Secrets management / prod-config safety | CC6.1 / CC7.1 | A.8.24, A.5.23 | Enforced |
| 12 | Dependency & secret scanning | CC7.1 / CC8.1 | A.8.8, A.8.28 | Enforced (CI) |
| 13 | HTTP security headers / CORS / TLS | CC6.6 / CC6.7 | A.8.20, A.8.24 | Enforced |

---

## 1 — Multi-tenant isolation (the catastrophic-risk control, RB-40 §1)
**Code:** the single `@FilterDef(workspaceFilter)` in `package-info.java`; `WorkspaceFilterActivator`
(enable/disable on the Hibernate `Session`); `TenantContext` (ThreadLocal, `isFilterActive()`);
`CurrentWorkspace.bind()` (the one bind entry point); `RbacService.getUserTier()` binds the filter at
the authorization choke point behind `tenant.filter.binding.enabled` (default off — Slice A);
`TenantScope.systemUnscoped/runAsSystem` (audited escape hatch); `TenantFilterInterceptor` +
`TenantContextCleanupFilter`. **`@Filter` on 136 entities** — 114 direct (`workspace_id = :workspaceId`)
+ 22 transitive (subquery on the parent FK — Slices B+C, incl. `work_items`); 10 `GLOBAL_BY_DESIGN`.
findById/PK-load gaps closed by per-controller ownership re-checks (Slice D).
**Tests/guardrails:** `CrossTenantFilterIsolationIT` (filter-alone isolation across domains incl.
transitive 1-hop/2-hop/OR-nullable), `WorkspaceTenantIsolationIT` (per-query predicates),
`TenantFilterCoverageTest` (structural: **every `@Entity` filtered-or-global**; transitive ⇒ subquery),
`RbacBindingTenantFilterIT`, `CrossTenantPkLoadAccessTest` (findById gaps); `guardrails.sh`
workspace-scope `@Query` BLOCK + raw-SQL tripwire.

## 2 — PII vault + crypto-shredding (RB-40 §3)
**Code:** `PiiVaultService` (`put`/`resolve`/`forget`/`isShredded`; per-subject envelope-wrapped DEK,
DEK zeroized in `finally`; `forget` = destroy key + purge rows ⇒ cryptographically unrecoverable);
`BlindIndexService` (keyed HMAC-SHA256 blind index for O(1) email lookup post-tokenization); domain
seams `UserPiiService`/`CustomerUserPiiService`/`StakeholderPiiService`/`CustomerAttributionPiiService`;
migrations V110–V114. **Tests:** `PiiVaultServiceTest`, `PiiVaultCryptoShredIT` (shreds at the DB),
`BlindIndexServiceTest`, `PiiVaultSlice3IT`, domain PII service tests. Inventory: `PII-FIELD-INVENTORY.md`.

## 3 — Append-only audit chain + no-PII-in-events (RB-20 §5, RB-40 §3)
**Code:** `AppEvent`(`events`) + `EventService` (workspace-stamped, safe-JSON payload);
`AuditHashChain` (tamper-evident SHA-256 chain, `verify()`); `audit_log_entries` with
`(workspace_id, seq)` + prev/entry hash; DB triggers `events_append_only` (V40) +
`trg_audit_log_no_update` (V52) reject UPDATE/DELETE. **No-PII guards:** `guardrails.sh` BLOCK on
`record*(…getFullName()/getEmail())` + ArchUnit `eventAndAuditLayerDoNotDependOnPiiEntities`.
**Tests:** `AuditHashChainTest`, `SecurityAuditIntegrationTest` (chain verifies + append-only trigger),
`EventServiceTest`.

## 4 — RBAC / least privilege (RB-10 §2, RB-40 §1)
**Code:** `RbacService` — tier hierarchy VIEWER(1)<MEMBER(2)<LEAD(3)<ADMIN(4)<OWNER(5);
`require()`→403, `canDo`, `getUserTier`, `workspaceForProject/WorkItem`; permission vocabulary in
`permissions(min_tier)` + `workspace_members`/`roles`. RBAC lives in services, never controllers/UI.
**Tests:** `RbacServiceTest`, plus per-controller `*AccessTest` (unauthorized + cross-tenant paths),
e.g. `PermissionSchemeControllerAccessTest`, `FieldDefControllerAccessTest`, `CrossTenantPkLoadAccessTest`.

## 5 — Field-level security (RB-40 §1, spec 06 §5.5)
**Code:** `FieldVisibilityService` (single resolver; HIDDEN>READ_ONLY>EDITABLE; fail-closed write /
degrade-to-redact-nothing read on DB error); read redaction in `WorkItemReadService` +
`FieldDefController`; write guards reject HIDDEN/READ_ONLY (403); BQL HIDDEN-field exclusion in
`BqlContextFactory.forUser` (inference-oracle + schema-enumeration closed); rule mutators on
`PermissionSchemeController` gated on `manage_permissions` (Slice 3); FK index V116.
**Tests:** `FieldLevelSecurityIT` (read/write/BQL/cross-tenant/batch), `FieldVisibilityServiceTest`,
`PermissionSchemeControllerAccessTest`, `KpiFieldSecurityTest`.

## 6 — MFA (TOTP) + WebAuthn (RB-40 §4)
**Code:** `MfaService` (RFC 6238 TOTP, ±1 step) + `MfaController` (enroll/confirm/disable/verify);
`WebAuthnCrypto`/`WebAuthnService`/`WebAuthnController` (challenge–response passkey; challenges in
`webauthn_challenges`, credentials in `webauthn_credentials`). **Tests:** `MfaServiceTest`,
`WebAuthnCryptoTest`. **Partial:** the current passkey ceremony is a dependency-free signed-nonce
implementation with password+TOTP fallback (no open leak); upgrading to real FIDO2 attestation/assertion
(webauthn4j) is a planned hardening EPIC — see `W1-PHASE1-COMPLETION-PLAN.md` WebAuthn slices.

## 7 — Rate limiting (RB-10 §8)
**Code:** `RateLimiter` (fixed-window; in-process default, **distributed DB store**
`DbRateLimitStore`/`rate_limit_windows` V118 behind `app.rate-limit.distributed`); callers
`AuthController`/`CustomerAuthController` (per-email/IP) + `AiControlPlaneService` (per-user);
`WriteRateLimitInterceptor` caps write methods per user behind `app.rate-limit.writes-per-minute` (PR4).
**Tests:** `RateLimiterTest`, `DistributedRateLimitIT` (shared budget across instances),
`WriteRateLimitInterceptorTest`.

## 8 — JWT revocation (RB-40 §4)
**Code:** `TokenRevocationService` — per-subject token-version cutoff `tokens_valid_after` (V115; bumped
on erase/password-change/reset, internal + customer parity) + per-token `jti` blocklist
`revoked_tokens` (V117; `/auth/logout` + portal logout). Enforced in `SecurityConfig.jwtAuthFilter`
(internal) + `CustomerContext` (portal). **Tests:** `TokenRevocationServiceTest`, `TokenRevocationIT`
(cutoff + blocklist round-trip + prune), `SecurityConfigJwtFilterTest`.

## 9 — Right-to-be-forgotten / erasure (RB-40 §3, DPDP/GDPR)
**Code:** `DataPrivacyService.erase()` (crypto-shred via `userPii.forgetIdentity`, clear legacy
plaintext during dual-write, revoke JWTs, DSR + audit by surrogate id only — never raw PII; self-erase
guarded); `export()` (transient, never persisted); `CompliancePrivacyController` data-request endpoints.
**Tests:** data-privacy service/controller tests; audit references surrogate id only.

## 10 — Encryption at rest / BYOK / KMS (RB-40 §4)
**Code:** envelope encryption in the PII vault (per-subject DEK wrapped by a KEK); `AwsKmsProvider`
(real AWS KMS / BYOK, activates when `cloud.aws.credentials.*` set; LocalStack-validated) with
`LocalKmsProvider` (master-key-derived) as the default; AES-256. Config recipe:
`PII-VAULT-KMS-CONFIG.md`. **Tests:** KMS provider tests + the vault crypto-shred IT.

## 11 — Secrets management / prod-config safety (RB-10 §8, EPIC-02)
**Code:** startup secret validation (prod/staging fail-closed on missing/weak secrets — JWT secret ≥32
bytes enforced in `JwtUtil`); dev-token exposure default-hardened; env templates; public health probes.
**Tests/guardrails:** EPIC-02 config-validation + Compose smoke (CI `Deployment smoke (compose config)`).

## 12 — Dependency & secret scanning (RB-10 §9)
**Code/CI:** `.github/workflows/ci.yml` — gitleaks (hardened install, PR #428), Dependabot (Maven + npm),
frontend `npm audit`/security audit, JaCoCo coverage gate, guardrails, checkstyle. **Proof:** every
W1 PR this session merged with the full ~14-check CI suite green.

## 13 — HTTP security headers / CORS / TLS (RB-10 §8, RB-40 §4)
**Code:** `SecurityConfig` — stateless JWT (no server sessions), CSP `frame-ancestors`, strict CORS
allow-list (`app.cors.allowed-origins`), security headers; TLS 1.3 min is the deployment/infra posture.
**Tests:** `SecurityConfigJwtFilterTest` + the per-controller access tests exercise the filter chain.

---

## Notes / open items
- **WebAuthn** real-FIDO2 attestation (control 6) is the one planned hardening upgrade — functional
  signed-nonce ceremony + MFA/password fallback today, so no open leak.
- **Flag-gated activations** (canary-first, default-off on merge): central tenant-filter binding
  (`tenant.filter.binding.enabled`), distributed rate limiting (`app.rate-limit.distributed`),
  write-endpoint limiting (`app.rate-limit.writes-per-minute`), PII vault read-from-vault /
  login-via-blind-index. Each is built + tested; flip per environment.
- **Deferred to the AWS-infra EPIC:** Redis/ElastiCache as the shared rate-limit store + a cached
  JWT-revocation lookup (the per-request DB hits).
- SOC 2 Type 2 / ISO 27001 certification is targeted at iteration 19; this matrix is the control-evidence
  baseline the audit reads from.
