# EPIC P1 — PII Vault & Crypto-Shredding — Completion Note

> Build companion to `EPIC-P1-pii-vault.md` (the signed-off design). Branch `feat/p1-pii-vault`.
> Decisions (Deepak): 2026-06-20 — dual-write + DEFER the irreversible CONTRACT drop; full scope
> incl. free-text; upgraded local KMS now (real AWS KMS/BYOK = the next Phase-1 item). 2026-06-21 —
> complete the Phase-1 PII-vault scope end-to-end and merge to main; choose product-best, rules-aligned
> options. Owner: Deepak Pandey.

## What was built + validated (merged)

The orphaned vault scaffold is now a working, end-to-end crypto-shred loop on the **User identity**,
plus **email-identity tokenization**, all behind **default-off flags** so the merge changes no runtime
behaviour until an operator backfills and flips.

**Slice 1 — per-subject crypto-shred vault (User name):**
- `V110` — `users.subject_token` (opaque per-subject token, `@PrePersist`-minted) + `subject_data_keys`
  (envelope-wrapped per-subject AES-256 DEK + ACTIVE/SHREDDED state).
- `KmsProvider` gains per-subject DEK wrap/unwrap + KEK rotate; `LocalKmsProvider` derives the
  workspace KEK from the master secret (HMAC) so crypto-shred genuinely works locally and is
  AWS-KMS-swappable; `AwsKmsProvider` stubs the new ops. `EncryptionService.encryptWith/decryptWith`.
- `PiiVaultService` — the single seam: `mint/put/resolve/forget`; global User identity is PLATFORM-
  scoped via the `TenantScope` system escape hatch.
- `KeyRotationService` — rotation = re-wrap each subject DEK under the new KEK (fixes the
  shared-per-workspace-key flaw; shredded subjects skipped).
- `UserPiiService` + dual-write at signup/SCIM + flag-gated read; `DataPrivacyService.erase()` =
  crypto-shred `forget()`; `export()` resolves-but-never-persists; **raw email removed from the
  immutable audit chain + `result_summary` + `subject_email`** (the live leak, fixed).
- Idempotent backfill job + flag-gated runner.

**Slice 2 — email tokenization + blind index:**
- `V111` — `users.email_hmac` (+ unique index). `BlindIndexService` — keyed `HMAC-SHA256(normalize(email))`.
- `UserPiiService.resolveByEmail` routes login/signup/SCIM through the blind index when
  `pii.vault.login-via-blind-index` is on (default off → legacy `findByEmail`); `syncIdentity`
  dual-writes name **and** email into the vault; `displayEmail` mirrors `displayName`.

**Slice 4 (partial) — no-PII-in-events:** removed raw email from `USER_SIGNED_UP`, `EMAIL_VERIFIED`,
and `CUSTOMER_USER_CREATED` event payloads (verified no consumer parses `events.payload.email`).

**Validation:** full backend unit gate (incl. JaCoCo + Checkstyle); the integration suite
(`CrossTenantFilterIsolationIT`, `FieldLevelSecurityIT`, `FlywayMigrationIntegrationTest`,
`PiiVaultCryptoShredIT`) against real Postgres; fresh-DB boot (`ddl-auto=validate`) confirms the V110/
V111 schema matches the entities. New tests: `PiiVaultServiceTest` (the three binding rules),
`KeyRotationServiceTest` (per-subject rewrap), `PiiVaultBackfillServiceTest`, `BlindIndexServiceTest`,
`UserPiiServiceTest`, `PiiVaultCryptoShredIT`.

## Flags (all default-off / safe-on-merge)
- `pii.vault.enabled` (default **true**) — dual-write PII into the vault on writes/backfill.
- `pii.vault.read-from-vault` (default **false**) — resolve display PII from the vault vs the legacy column.
- `pii.vault.login-via-blind-index` (default **false**) — resolve users by `email_hmac` vs raw email.
- `pii.vault.backfill-on-start` (default **false**) — one-shot idempotent backfill at boot.
- `BLIND_INDEX_KEY`, `ENCRYPTION_KEY` — production must set (dev defaults are insecure + logged).

**Rollout order:** deploy → set `PII_VAULT_BACKFILL_ON_START=true` for one boot (populates
subject_token + email_hmac + vault for existing users) → unset → flip `read-from-vault` then
`login-via-blind-index` per-environment once verified.

## Deliberately deferred (the remaining Phase-1 PII-vault scope)
Scoped out tonight to avoid rushing security-critical / display-coupled / speculative work; each is a
clean follow-up PR:
- **Slice 3** — extend the vault to **CustomerUser** + **Stakeholder** subjects; drop the *persisted*
  denorm PII copies `chat_conversations.customer_name` and `customer_feedback_items.customer` (→ token
  + render-time resolution). (Comment `author_name` is already `@Transient` — safe.)
- **Slice 4 (rest)** — `field_def.pii` flag + route PII-flagged `work_item_field_value` to the vault;
  free-text PII scan/redact for customer-authored content (service_requests, chat_messages, feedback);
  the **`WorkItemCommandService` assignee-fullName** event leak (needs the activity feed to resolve
  assignee names at render, a coordinated backend+frontend change); then add the `guardrails.sh`
  no-PII-in-events / no-PII-in-audit checks + the ArchUnit rule as **BLOCK** once the sweep is clean.
- **Slice 5** — real **AWS KMS / BYOK** (the explicit next Phase-1 item): land the AWS SDK,
  region-pinned KEKs, key-retention ≤ backup-retention, scheduled-deletion windows (legal/DPO sign-off).
- **CONTRACT** — the irreversible drop of the plaintext `users.email`/`full_name`/`mfa_secret`/
  `verification_token` columns, gated on the vault being the proven prod source of truth + a full
  backup cycle (EPIC §3/§12).

## Notes
- Migration high-water is now **V111** (CLAUDE.md §6 / ai-rules still say V109 — regenerate in a doc pass).
- The field-level-security branch also numbered a migration **V110**; whichever merges second renumbers.
- Always `mvn clean` before trusting integration/boot results on the shared worktree — a stale compiled
  `V110__field_visibility_by_system_role_tier.sql` (from the FLS branch, not in src) caused phantom
  `field_visibility.role_def_id` failures + a duplicate-V110 boot error this session.
