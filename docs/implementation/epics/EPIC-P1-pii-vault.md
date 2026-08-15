# EPIC P1 — PII Vault & Crypto-Shredding (RB-40 §3 detailed design)

> Phase 1 (Governance & security closure) of the Master Completion Roadmap, sibling to
> `EPIC-P1-243-central-tenant-filter.md` and `EPIC-P1-field-level-security.md`.
> **Lane: Large/risky** (data model · security · tenant isolation · *auth identity*) → requires a
> Stage-2 checkpoint **and** legal/DPO sign-off before any code (Orchestrator §5, RB-05, RB-40 §3).
> **This document is that checkpoint.** It is the iterations-7–9 detailed design that RB-40 §3
> explicitly defers: the PII field inventory + data-residency map (rule 4), the key-management /
> rotation design, retention/backup-expiry mechanics, and the read/write path changes that make the
> three binding rules hold.
>
> **DESIGN ONLY.** No production code or schema is changed by this workflow; this `.md` is the only
> file written. Every schema/code change below is a *proposal* gated on the sign-offs in §11.

---

## 1. Problem — the decision exists, the implementation does not

RB-40 §3 (2026-06-04, Deepak) resolved the audit-vs-erasure conflict with **crypto-shredding + PII
vault tokenization**: the append-only event log stays immutable; raw PII never lives in
events/projections/indexes/logs; PII lives in a separate mutable vault keyed by an opaque
per-subject token, each record encrypted under a **per-subject** data key (envelope-encrypted via
KMS); "forget" = destroy the per-subject key + purge the vault record.

The decision is sound. **The codebase does not implement it.** Verified 2026-06-20 on
`feat/p1-pii-vault`:

- **PII is plaintext on the live row.** `User.email` / `User.fullName` (and `mfaSecret`,
  `verificationToken`) are plain columns on `users`. The same is true across the system
  (`stakeholder`, `customer_users`, denormalized `comments.author_name`, etc. — full inventory §7).
- **The vault is orphaned.** `PiiVaultEntry` / `pii_vault_entries` (V67), `PiiVaultRepository`,
  `KeyRotationService`, `EncryptionService` all exist, but `grep "new PiiVaultEntry"` over `src/main`
  returns **zero hits** — nothing ever writes user PII into the vault. The table is empty in
  production. `PiiVaultRepository.findByWorkspaceIdAndSubjectId` (the forget finder) has **zero
  callers**.
- **Erase overwrites columns in place — it is not crypto-shredding.**
  `DataPrivacyService.erase()` loads the `users` row and mutates it
  (`setEmail(token+"@erased.invalid")`, `setFullName("[erased]")`, …) then `users.save()`. It never
  references the vault, never destroys a per-subject key (none exists), and has no vault/KMS
  dependency injected at all. Its own Javadoc admits the production design ("destroy the per-subject
  key") is aspirational.
- **The one service that touches the vault uses the wrong key model.**
  `KeyRotationService.rotate()` rotates a single **per-workspace** key (`WorkspaceSecuritySettings.
  byokKeyRef`) and stamps every entry with the same `key_version`. **Crypto-shred-by-destroying-one-
  subject's-key is impossible when all subjects in a workspace share one key.** Under
  `LocalKmsProvider`, `reEncrypt()` is a literal no-op, so rotation does nothing in dev/test.
- **There is no glue between the cipher and the vault.** `EncryptionService` (real AES-256-GCM) is
  wired only to `OAuthCallbackController` (integration tokens). Nothing encrypts
  `PiiVaultEntry.encrypted_value`.
- **No `no-PII-in-events` guardrail exists** (`grep` of `scripts/guardrails.sh` for
  `PII|pii_vault|getEmail|getFullName` → no matches). RB-40 §3 rule 1 says this check is added "once
  the PII field inventory exists" — §7 below is that inventory, so this design also triggers the
  guardrail work.

**Net:** the architecture was decided; this EPIC is the design that makes it real, end to end, and
flags the decisions that need Deepak before a single line is built.

---

## 2. Approach (the target model)

PII is stored **only** in the mutable vault, addressed by an opaque per-subject token; every other
table, every event payload, every projection, every index, and every log line references the
**token**, never the raw value.

```
  users.id (surrogate, stays)  ──┐
                                 │   subject_token (opaque, new)
                                 ▼
        users.subject_token  ───────────►  pii_vault_entries
                                            (workspace_id, subject_id=token,
                                             pii_type, encrypted_value, key_version)
                                                      ▲
                            per-subject data key  ────┘   (DEK, envelope-encrypted by a KMS KEK)
```

- **One vault row per (workspace, subject, pii_type)** — the existing
  `UNIQUE(workspace_id, subject_id, pii_type)` from V67 is exactly right.
- **Per-subject data key (DEK).** Each subject has its own AES-256 data key. The DEK encrypts that
  subject's vault rows (AES-256-GCM, the format `EncryptionService` already produces). The DEK
  itself is stored **wrapped** (envelope-encrypted) under a workspace/tenant KEK held in the KMS
  (BYOK where a tenant requires it). This is the structural fix for the §1 key-model flaw: the unit
  of destruction is *one subject's DEK*, not the shared workspace key.
- **`subject_token`** is a random opaque id (e.g. `subj-<uuid>`), minted once per subject, stored on
  the owning row (`users.subject_token`) and used as `pii_vault_entries.subject_id`. It is **not**
  derived from the email (no rainbow-table risk) and is stable across the subject's lifetime so the
  token in historical events still resolves — until the key is shredded, at which point it resolves
  to "[erased]".
- **"Forget" = destroy the subject's DEK + delete the subject's vault rows.** The per-subject DEK is
  deleted from the KMS/key store; the `pii_vault_entries` rows for that `subject_id` are
  hard-deleted; the surrogate `users.id` and the `subject_token` stay (so FKs and event history
  remain intact and re-derivable). The data becomes cryptographically unrecoverable even from any
  ciphertext that lingers in a backup (rule 2).

Where a subject is **not** a `User` (stakeholders, customer-portal users — see §7), the same model
applies: a `subject_token` on the owning row + vault rows keyed by that token. The vault is
subject-type-agnostic; `pii_type` carries the semantic.

---

## 3. Migration plan — expand → migrate → contract (forward-only)

Next migration is **V110+** (Orchestrator §6; current high-water mark V109). All migrations are
forward-only (RB-10 §3); to undo, write a new forward migration. This is a multi-slice expand →
backfill → switch → contract sequence so the app is never broken between deploys (RB-10 §3
zero-downtime).

**EXPAND (additive, nothing breaks):**

- `V110__pii_vault_subject_tokens.sql` — add `users.subject_token` (nullable), unique index;
  add the same column to the other subject-owning tables in scope for the slice (see §10). Add a
  `subject_data_keys` table *or* a `wrapped_dek` column on a per-subject key record (decision §11.b)
  to hold each subject's envelope-encrypted DEK + key state (`ACTIVE` / `SHREDDED`). **No data moves
  yet.** Old plaintext columns stay and remain authoritative.
- (If chosen in §11.b) `V111__pii_vault_key_columns.sql` — `pii_vault_entries.dek_id` /
  align `key_version` semantics to *per-subject* keys rather than the per-workspace `byok_key_ref`.

**MIGRATE / BACKFILL (data-only, idempotent):**

- `V112__backfill_pii_into_vault.sql` (or a guarded one-shot service job — decision §11.d, since
  encryption in pure SQL is undesirable): for every existing subject, mint a `subject_token`,
  generate a per-subject DEK, encrypt each plaintext PII field into a `pii_vault_entries` row,
  populate the wrapped DEK. Idempotent via a `NOT EXISTS` / marker guard (the V87 backfill is the
  pattern to copy). Tenant-scoped via the workspace join. After this step, **both** the plaintext
  column and the vault hold the value (dual-write window).

**SWITCH (reads then writes route through the vault):**

- Application change (no schema): reads of `User.email`/`fullName` etc. go through a
  `PiiVaultService.resolve(subjectToken, type)`; writes go through
  `PiiVaultService.put(subjectToken, type, value)` which encrypts under the subject DEK. During this
  window the service **dual-writes** (vault + legacy column) so a rollback is safe. A feature flag
  (`pii.vault.read-from-vault`) flips reads from column → vault per environment.

**CONTRACT (remove plaintext — only after switch is proven in prod):**

- `V11x__drop_plaintext_pii_columns.sql` — drop `users.email`/`users.full_name`/`mfa_secret`/etc.
  (and the equivalent columns on the other in-scope tables), drop the denormalized
  `comments.author_name` copies, drop `data_subject_requests.subject_email` /
  `result_summary`-PII (see §4). **This is the irreversible step** — it only runs once the vault is
  the proven source of truth and after a full backup-retention cycle has rolled (rule 2). Login
  email becomes a special case — see §11.e.

> **Auth caveat that shapes the order:** `email` is the login identifier and `verification_token` /
> `mfa_secret` are credentials. Tokenizing them touches authentication (§4, §11.e). The plan keeps
> `email` reachable for login throughout EXPAND/SWITCH; the CONTRACT step for `email` is gated
> separately and may use a **blind-indexed** lookup (HMAC of normalized email) rather than dropping
> the ability to find a user by email. **This is a Deepak decision (§11.e), not assumed here.**

---

## 4. Concrete read/write path changes & how the three binding rules hold

### Where PII is read/written today, and the new route

| Surface (file) | Today | After |
|---|---|---|
| `User.getEmail/getFullName` (entity) | plain column | `PiiVaultService.resolve(user.subjectToken, EMAIL/NAME)`; entity exposes the token, a resolver hydrates display values at the boundary only |
| `DataPrivacyService.export()` | reads `user.getEmail()` plaintext; **persists** email+fullName into `data_subject_requests.result_summary`; writes raw email into the immutable audit chain | resolve PII from the vault at response time; **return but never persist** it (`result_summary` holds metadata only); audit logs the `subject_token`/id, never the email |
| `DataPrivacyService.erase()` | overwrites `users` columns in place | call `PiiVaultService.forget(workspaceId, subjectToken)` → destroy subject DEK + delete vault rows; leave `users.id`/token intact |
| `KeyRotationService.rotate()` | rotates one workspace key, stamps all entries same version | rotate **per-subject DEKs** (rewrap each subject's DEK under the new KEK; `reEncrypt` stays a KEK-level op); shred = delete one DEK |
| `CommentService` / `CommentController` | persists `comments.author_name` (= `users.full_name`) | store `author_subject_token`; resolve display name at render via the vault; CONTRACT drops `author_name` |
| `EventService.recordDiff()` | writes `old_value`/`new_value` verbatim into immutable `events` | for inventoried PII fields, write the **token** (or a redaction marker), never the raw value; enforced by the new guardrail |
| `EmailService` / `DailyDigestScheduler` | logs the To: address; bodies built from `full_name` | resolve recipient + display name from the vault at send time; **never log the address/body**; skip send when the key is shredded (no resolvable address) |
| `ExportService` / `ReportService` | render `full_name` into files that leave the trust boundary | resolve names at render time from the vault; an erased subject renders as "[erased]"; previously generated files are out of scope (retention policy, §11.c) |
| `AiControlPlaneService.redact()` | regex strips email/phone only, on the prompt only | redaction reads the **inventory** (§7); names resolved from tokens are never sent; `ai_cache_entries.response` must not contain raw PII (rule 3) |

### Binding rule 1 — no raw PII outside the vault

Enforced structurally (token columns + resolve-at-boundary) **and** by a new
`scripts/guardrails.sh` check, now unblocked because the inventory (§7) exists:

- **No-PII-in-events:** flag any `EventService.record*`/`recordDiff` call whose value map keys match
  an inventoried PII field; flag direct `getEmail()`/`getFullName()` into an event payload.
- **No-PII-in-audit-chain:** a variant for `SecurityAuditLogService.record(...)` (the immutable,
  UPDATE/DELETE-blocked `audit_log_entries`) — this is the **highest-severity live leak today**
  (`export()` writes raw email into a chain crypto-shred cannot reach). The guardrail + the
  read-path fix in the table above close it.
- An **ArchUnit / unit test** asserting inventoried PII getters are not referenced by serializers
  feeding events/projections/indexes/logs.

### Binding rule 2 — backups honour erasure

- The per-subject DEK lives in the KMS/key store, **not** in the row backup. Destroying the DEK
  makes any `encrypted_value` in any backup (DB snapshot, replica, cache) cryptographically
  unrecoverable — no need to reach into backups to satisfy erasure.
- **Key retention ≤ backup retention** (RB-40 §3 rule 2): the key store's deleted-key tombstone must
  outlive the longest backup, and the DEK must never be resurrectable from a key-store backup. KMS
  scheduled-deletion windows and key-store backup policy are part of §11.c.

### Binding rule 3 — projections re-derivable from tokenized events alone

- Events already carry the surrogate id; with token-only payloads, a read-model rebuild after
  erasure needs only tokens → it resolves erased subjects to "[erased]" and never needs the purged
  PII. The denormalized `author_name`/`customer_name`/`subject_email` copies (which today survive a
  shred and break this rule) are removed in CONTRACT and replaced by render-time resolution.

---

## 5. PII field inventory + data-residency map (RB-40 §3 rule 4)

The authoritative artifact. Verdicts: **RAW (carries raw PII today)** / **SAFE (token/count/no
PII)** / **AT RISK (safe now, structurally exposed)**. Residency = which vault / which region the
value must live in; all PII columns inherit the **workspace's** residency (resolved via parent for
tables lacking `workspace_id` — noted).

### 5.1 Subject populations (three distinct identities)

| Subject | Owning table | PII fields | Verdict |
|---|---|---|---|
| Platform user | `users` (`User.java`) | `email`, `full_name` (DIRECT); `mfa_secret`, `verification_token` (CREDENTIAL); `password_hash` (hashed — not vault PII) | RAW |
| Customer-portal user | `customer_users` (`CustomerUser`) | `email`, `display_name` — *separate login from `users`* | RAW |
| Stakeholder (often a non-user, e.g. regulator) | `stakeholder` (`Stakeholder`) | `name`, `email`, `organization`, `notes` (free-text) | RAW |

### 5.2 Inventory by domain

| # | Table.column | Type | Verdict | Residency | §3-rule-1 requirement |
|---|---|---|---|---|---|
| 1 | `users.email`, `users.full_name` | direct | **RAW** | workspace | tokenize → vault; email needs blind-index for login (§11.e) |
| 2 | `users.mfa_secret`, `users.verification_token` | credential | **RAW** | workspace | vault or dedicated secret store; never in events/logs |
| 3 | `customer_users.email`, `display_name` | direct | **RAW** | workspace | tokenize → vault (separate subject) |
| 4 | `stakeholder.name/email/organization/notes` | direct + free-text | **RAW** | workspace | tokenize structured fields; treat `notes` as free-text PII |
| 5 | `comments.author_name`, `article_comments.author_name` | denorm projection | **RAW** | parent→workspace | drop denorm; resolve via token. (`comment.authorName` `@Transient` is fine — not persisted) |
| 6 | `chat_conversations.customer_name` | denorm projection | **RAW** | workspace | replace with token |
| 7 | `notifications.message` | free-text (embeds names) | **RAW** | parent→workspace | build from tokens; resolve at render; lacks `workspace_id` (resolve via parent) |
| 8 | `data_subject_requests.subject_email`, `result_summary` | direct + free-text | **RAW** | workspace | the *erasure feature itself* leaks: don't persist exported PII; store metadata only |
| 9 | `audit_log_entries.detail`, `ip_address`, `user_agent` | free-text + indirect | **RAW (un-erasable)** | workspace | **highest severity** — immutable chain; never write raw PII; IP is PII under GDPR/DPDP |
| 10 | `events.old_value/new_value/payload` | free-text | **AT RISK** | workspace-stamped | `recordDiff` on a PII field = permanent leak; token-only payloads + guardrail |
| 11 | `work_item_field_value.value` + `field_def` (V80); legacy `custom_field_definitions`, `work_items.custom_fields` JSONB | tenant-defined | **AT RISK** | workspace | add a `pii` flag on `field_def`; PII-flagged fields route to vault |
| 12 | `service_requests` subject/description/form_data; `chat_messages.body`; `customer_feedback_items.content` | customer free-text | **AT RISK** | workspace | likeliest unexpected PII (meter ids, addresses, phone); redact/scan, treat as free-text PII |
| 13 | `push_subscriptions.endpoint/p256dh/auth/user_agent` | device identifier | **RAW** | workspace | encrypt at rest; device id is PII |
| 14 | `webauthn_credentials.credential_id/public_key/transports` | credential | **AT RISK** | workspace | keep in credential store; out of events/logs |
| 15 | `integration_credentials.access/refresh token` | credential | **SAFE (already AES-256-GCM)** | workspace | the pattern to extend to the vault |
| 16 | `ai_memories.mem_value` | AI-remembered context | **AT RISK** | workspace | may embed user PII; scope to tokens |
| 17 | `access_anomalies.summary/evidence` | indirect (IP/geo/device) | **RAW** | workspace | indirect PII about a subject |
| 18 | `work_items` free-text (esp. `stakeholder_update`; HR/IT requests on behalf of a named employee) | free-text | **AT RISK** | workspace | free-text PII scanning |
| 19 | `ai_invocations.prompt_chars` | count, not content | **SAFE** | workspace | good pattern — store counts not content |
| 20 | `ai_cache_entries.response` | model output | **AT RISK** | workspace | may cache names; must not hold raw PII (rule 3) |
| 21 | Reference/FK columns (`assignee_id`, `created_by`, `reporter_id`, `actor_id`, `requested_for_id`, `workspace_members.*`) | opaque surrogate ids | **SAFE** | n/a | stay as-is; they form the erasure FK fan-out map (§6), not PII |

### 5.3 Data-residency notes

- All PII inherits its **workspace's** declared residency region; the vault row's `workspace_id`
  carries it, and the KMS KEK is region-pinned for BYOK tenants.
- Tables **without** `workspace_id` (`comments`, `article_comments`, `notifications`,
  `standup_entries`, `worklogs`, …) must resolve workspace via their parent for the residency join —
  same gap noted in `EPIC-P1-243-central-tenant-filter.md`.
- `workspace_members` is a raw-SQL table with no JPA entity — include it in the FK fan-out map (§6)
  but it carries no PII itself.

---

## 6. Erasure FK fan-out (what "forget" must reach)

Reference columns are opaque surrogate ids and **stay** (rule 3 needs them) — but erasure must
ensure none of them is paired with a denormalized PII copy. The fan-out the `forget()` path
validates: `assignee_id`, `created_by`, `reporter_id`, `actor_id`, `requested_for_id`, watcher rows,
`workspace_members`, comment/notification authorship. After CONTRACT, none of these has an adjacent
plaintext name/email column, so destroying the subject DEK is sufficient — the ids resolve to
"[erased]" through the vault.

---

## 7. DECISIONS FOR DEEPAK (sign-off before build)

This EPIC does not proceed past Stage 2 without these. Each is on the data-model / security / auth
"stop and ask" list (Orchestrator §5, RB-40 §3 "validate with legal/DPO").

**a. Scope of this slice — User core PII only, or all surfaces?**
Recommendation: **Slice 1 = `users.email` + `users.full_name` only** (the highest-volume, most-cited
PII), proving the full vault→token→shred loop end to end on one subject type. Stakeholders,
customer-portal users, denormalized copies, custom-field PII, and free-text scanning follow in later
slices (§10). *Decision needed:* accept the narrow first slice, or mandate a wider slice.

**b. Key-management model — confirm per-subject DEK + envelope under a KMS KEK.**
This replaces the current **per-workspace** key in `KeyRotationService` (the §1 flaw). *Decision
needed:* (i) confirm per-subject DEKs; (ii) where the wrapped DEK lives — new `subject_data_keys`
table vs a column; (iii) **which KMS** for build now: `LocalKmsProvider` is in-memory and its
`reEncrypt` is a no-op (keys lost on restart, no cross-instance decrypt — unfit for real PII);
`AwsKmsProvider` is a **throwing stub** (AWS SDK not on classpath, TD-022, "obtain legal/DPO sign-off
before enabling" per RB-40 §3). **Real crypto-shred needs a real KMS.** Recommendation: build the
vault + DEK plumbing now against an *upgraded* Local provider that actually persists wrapped keys and
supports delete, and gate production enablement on AwsKms (BYOK) landing — but this is Deepak's call.

**c. Backup / retention mechanics (rule 2).** Key-store backup policy, KMS scheduled-deletion
window, the rule "key retention ≤ backup retention," and what happens to **already-generated export
files / reports** that contain a now-erased subject's name (re-render? purge? accept as a documented
retention exception?). *Decision needed:* the retention windows and the stance on pre-existing files.

**d. Backfill mechanism.** Encrypting in pure SQL is undesirable; recommend a guarded one-shot
service job (idempotent, V87-style marker) rather than a SQL `UPDATE`. *Decision needed:* approve the
service-job approach.

**e. Login / auth interaction (the sharp edge).** `email` is the **authentication identifier**;
`verification_token` and `mfa_secret` are credentials. Tokenizing `email` means login can no longer
`SELECT … WHERE email = ?`. Options: (i) keep a **blind index** — `email_hmac` (HMAC-SHA256 of
normalized email under a separate key) for O(1) login lookup while the address itself lives in the
vault; (ii) keep `email` plaintext on `users` as an explicit, documented exception and tokenize only
`full_name` in slice 1. Recommendation: **(ii) for slice 1** (de-risk auth), **(i) as the slice that
tokenizes email**. *Decision needed — this changes the auth path and must not be guessed.*

---

## 8. How the three binding rules are tested (Stage 3)

- **Rule 1 (no raw PII outside vault):** unit test the new `guardrails.sh` checks (no-PII-in-events,
  no-PII-in-audit-chain); ArchUnit test that inventoried PII getters don't reach event/projection/
  index/log serializers; integration test that a PII field edit produces a **token-only** `events`
  row.
- **Rule 2 (backups honour erasure):** test that after `forget()`, the subject DEK is gone and any
  retained `encrypted_value` is undecryptable (decrypt throws); key-retention-≤-backup-retention
  asserted against the configured windows.
- **Rule 3 (re-derivable projections):** seed a subject, build a read-model, `forget()`, rebuild the
  read-model **from events alone** → it renders "[erased]" with no error and never reads purged PII.
- **Cross-tenant + unauthorized** (RB-40 §1, mandatory): vault reads are workspace-filtered (the
  `@Filter` is already on `PiiVaultEntry`); workspace B cannot resolve workspace A's tokens; non-
  `manage_security` actor cannot erase/export.
- **Regression:** login, signup, email verification, MFA still work through the new read path;
  full gate green (unit + integration + smoke-boot, RB-40 CI-no-DB-boot caveat — validate against a
  fresh DB).

---

## 9. Read/write glue to build (the missing wiring)

- **`PiiVaultService`** (new) — the single seam: `resolve(token, type)`, `put(token, type, value)`,
  `forget(workspaceId, token)`, `mintSubject(...)`. Wraps `EncryptionService` (AES-256-GCM) for
  value encryption and the KMS for DEK wrap/unwrap/delete. **This is the glue that today does not
  exist** between `EncryptionService` (can encrypt) and `PiiVaultEntry` (needs encrypted values).
- **`DataPrivacyService`** — inject `PiiVaultService`; `erase()` calls `forget()`; `export()`
  resolves-but-does-not-persist.
- **`KeyRotationService`** — change from per-workspace key to per-subject DEK rewrap; `findBy
  WorkspaceIdAndSubjectId` (currently zero callers) becomes the forget/rotate-by-subject finder.
- **`field_def`** — add a `pii` boolean so tenant-defined custom fields can be declared PII and
  routed to the vault (the only way static inventory can ever cover tenant-defined semantics).

---

## 10. Slicing (reviewable PRs, de-risked auth)

- **Slice 1 — vault loop on User name only.** `PiiVaultService` + per-subject DEK + upgraded Local
  KMS (persisted, deletable) + `users.subject_token` + backfill `full_name` + dual-write + flag-
  flipped read + `erase()`→`forget()` + the two guardrails + tests. `email` stays plaintext
  (documented exception per §7.e.ii). Proves the end-to-end shred.
- **Slice 2 — email + blind index.** `email_hmac` login lookup, tokenize `email`, switch auth path,
  CONTRACT-drop `users.email`. (Gated on §11.e decision.)
- **Slice 3 — other subjects + denorm copies.** `customer_users`, `stakeholder`; drop
  `comments.author_name` / `chat_conversations.customer_name`; render-time resolution.
- **Slice 4 — free-text + custom fields + immutable-log hardening.** `field_def.pii` routing;
  free-text PII scanning for customer-authored content; fix `events.recordDiff` and the
  `audit_log_entries` / `data_subject_requests` leaks.
- **Slice 5 — AWS KMS / BYOK enablement.** Land `AwsKmsProvider`, region-pinned KEKs, retention/
  backup-expiry wiring (gated on §11.c + legal/DPO).

---

## 11. Acceptance criteria

- A subject's PII is resolvable only through `PiiVaultService`; no in-scope plaintext PII column
  remains after that slice's CONTRACT step (ArchUnit/guardrail enforced).
- `erase()` destroys the per-subject DEK and the vault rows; the `users.id`/token + event history
  survive; a post-erase projection rebuild from events alone renders "[erased]".
- The three binding rules each have a passing test (§8).
- No raw PII in events, audit chain, projections, indexes, or logs — enforced by `guardrails.sh` +
  ArchUnit, not vigilance.
- Login / signup / verification / MFA unaffected; full gate green on a fresh DB.
- Every Deepak decision in §7 recorded (decision + date) before the corresponding slice merges.

---

## 12. Rollback

EXPAND and BACKFILL are additive + idempotent — reversible by removing the added columns/keys and
ignoring the vault. During SWITCH the service **dual-writes**, so flipping
`pii.vault.read-from-vault` back to column-reads restores exact current behavior with zero data loss.
**CONTRACT (dropping plaintext) is the one irreversible point** and runs only after the vault is the
proven prod source of truth and a full backup cycle has rolled — by design there is no rollback past
it, which is the whole point of crypto-shredding (RB-40 §3 rule 2).

---

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

## Slice 3 — customer/stakeholder subjects + denorm tokenization (SHIPPED, 2026-06-21)
Extends the vault from the internal `User` identity to the two remaining subject populations and
tokenizes the two persisted denorm PII copies, all behind the same default-off flags (no runtime
behaviour change on merge). Migration high-water → **V112**.
- **CustomerUser** — `customer_users.subject_token` + `email_hmac` (V112); `@PrePersist` mint;
  `CustomerUserPiiService` (dual-write email + display name, blind-index portal login, flag-gated
  display, crypto-shred); wired into `CustomerAccountController` (create/update dual-write +
  duplicate-email via blind index + render) and `CustomerAuthController` (login via blind index +
  render). The `pii.vault.login-via-blind-index` switch now governs **both** internal and portal
  login — backfill `users` *and* `customer_users` before flipping it.
- **Stakeholder** — `stakeholder.subject_token` (V112); `@PrePersist` mint; `StakeholderPiiService`
  (dual-write name/email/org/notes, flag-gated display, crypto-shred); wired into
  `StakeholderController`.
- **Denorm copies** — `chat_conversations.customer_subject_token` +
  `customer_feedback_items.customer_subject_token` (V112); `CustomerAttributionPiiService` tokenizes
  the free-text value under a per-record token, resolved at the controller boundary (agent inbox /
  feedback list), `[erased]` after a shred. Legacy columns stay until CONTRACT.
- **Backfill** extended to all new subjects + denorm tokens (`PiiVaultBackfillService.backfillAll()`,
  idempotent; the runner now backfills every subject population).
- **Validation:** full unit gate green (1391 tests, 0 Checkstyle, coverage met); integration on real
  Postgres — new `PiiVaultSlice3IT` (4/4: customer/stakeholder/denorm round-trip + shred + workspace
  isolation + blind-index DB round-trip) + `PiiVaultCryptoShredIT` + `FlywayMigrationIntegrationTest`
  (V112 applies clean) + `CrossTenantFilterIsolationIT`; fresh-DB boot via `ddl-auto=validate`.

## Slices 4 & 5 — SHIPPED (2026-06-21)
The full per-slice plans + validation are in `EPIC-P1-pii-vault-slice-plans.md`; in brief:
- **Slice 4a** (#420) — assignee full-name leak in the immutable `events` log → store the assignee
  **id**, resolve names at render via the vault (`ActivityController` + `UserPiiService.displayNameById`).
- **Slice 4b** (#421, V113) — `field_def.pii` flag → PII-flagged `work_item_field_value` text routed
  to the vault (per-value token), resolved at render.
- **Slice 4c** (#423, V114) — watcher/@mention `notifications.message` stored **name-free** + an
  `actor_id`; actor name resolved at render. Free-text AI-boundary redaction already central
  (`AiControlPlaneService.redact`).
- **Slice 4d** (#422) — **machine-enforced** no-raw-PII-in-events/audit: `guardrails.sh` BLOCK +
  ArchUnit (event/audit layer ⊥ PII entities).
- **Slice 5** — real **AWS KMS / BYOK**: `AwsKmsProvider` on AWS SDK v2 (wrap/unwrap/generateDataKey/
  reEncrypt/rotate), region-pinned (per-workspace key ARN), BYOK-per-workspace + platform default key,
  validated **non-prod against LocalStack** (`PiiVaultKmsLocalStackIT`). All prod/non-prod config is
  centralized (`KmsProperties` + `application.properties` §14) and documented in
  `docs/compliance/PII-VAULT-KMS-CONFIG.md`. Real AWS account provisioning (keys/IAM/retention) is the
  operator step at prod launch (Deepak); `LocalKmsProvider` stays the dev/test default.

## Still deferred
- **CONTRACT** — the irreversible drop of the plaintext `users.email`/`full_name`/`mfa_secret`/
  `verification_token` (and the other slices' legacy columns), gated on the vault being the proven prod
  source of truth + a full backup cycle (EPIC §3/§12).

## Notes
- Migration high-water is now **V114** (Slice 4c). ai-rules §6 + the generated tool files are kept in
  sync each slice (the earlier V109 staleness is resolved). Slice 5 added no migration.
- The field-level-security branch also numbered a migration **V110**; whichever merges second renumbers.
- Always `mvn clean` before trusting integration/boot results on the shared worktree — a stale compiled
  `V110__field_visibility_by_system_role_tier.sql` (from the FLS branch, not in src) caused phantom
  `field_visibility.role_def_id` failures + a duplicate-V110 boot error this session.
