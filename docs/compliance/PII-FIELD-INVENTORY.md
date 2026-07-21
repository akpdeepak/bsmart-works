# PII Field Inventory & Data-Residency Map

> **The single artifact the erasure (right-to-be-forgotten) and data-residency requirements both
> read from** — RB-40 §3 rule 4. It enumerates every entity/column across `works-backend` that
> stores personal data, what kind of personal data it is, whether it is **currently plaintext**, and
> which vault / residency region it must move to under the crypto-shredding decision (RB-40 §3,
> DECISION 2026-06-04).
>
> **Status: DESIGN — inventory only.** This document changes no production code or schema. It is the
> input to (a) the `guardrails.sh` "no-PII-in-events" check (RB-40 §3 rule 1), (b) the vault
> tokenization migration plan, and (c) the erasure + residency designs for iterations 7–9. It must be
> validated with legal / the DPO before any tokenization is built.
>
> Owner: Deepak Pandey · branch `feat/p1-pii-vault` · last verified against code 2026-06-20.

---

## 0. How to read this

**The crypto-shredding contract (RB-40 §3):** raw personal data must live **only** in the
`pii_vault_entries` vault, encrypted under a per-subject data key; every other table/event/index/log
references the subject by an **opaque token** (the user/customer/stakeholder id is already an opaque
surrogate — `USR-…`, `CU-…`, etc., not the email), and "forget" = destroy the per-subject key + purge
the vault row. Today **none of this is wired up**: every PII column below is stored **plaintext** in
its own table, and the vault (`pii_vault_entries`, `PiiVaultEntry`, `PiiVaultRepository`,
`KeyRotationService`) plus `DataPrivacyService` are **scaffold that nothing populates**. So this
inventory is also the gap list.

**Column legend**
- **Plaintext today?** — `YES` = stored as readable text in the column; `Tokenized` = already an
  opaque surrogate id (FK), not raw PII; `Encrypted` = AES-256-GCM ciphertext at rest;
  `Hash` = one-way hash (irreversible, not recoverable PII but may still identify); `Free-text` =
  user-authored text that *may* contain arbitrary PII the schema can't predict.
- **PII class** — DIRECT (identifies a person on its own: name, email, phone), INDIRECT
  (identifies in combination: ip, user-agent, device endpoint), CONTENT (free-text that may embed
  PII), CREDENTIAL (auth secret — security-sensitive, treat as PII-adjacent), REFERENCE (an opaque id
  pointing at a subject — token-safe, listed so erasure knows the FK fan-out).
- **Vault target** — where the raw value must move under tokenization, or why it stays put.

**Scope note:** "every column that stores personal data" includes the indirect identifiers (IP,
user-agent, push endpoint) and the free-text bodies, because DPDP/GDPR "personal data" is broader than
name+email. Pure REFERENCE columns (FKs to a subject) are tokens and stay — but they are the map the
erasure job walks, so they are inventoried.

---

## 1. PRIMARY IDENTITIES — the subjects (highest priority)

These three tables are the **data subjects**. Their direct-PII columns are the first thing the vault
must absorb; everything else in the system references them by id.

### 1.1 `users` — internal users (entity `User`, `User.java`)

| Column | Field | Personal data | PII class | Plaintext today? | Vault target |
|---|---|---|---|---|---|
| `email` | `email` | Work email (login id) | DIRECT | **YES** | Vault `EMAIL`; table keeps token, login lookup via blind index / hash |
| `full_name` | `fullName` | Person's name | DIRECT | **YES** | Vault `NAME`; table keeps token |
| `password_hash` | `passwordHash` | Auth secret (bcrypt) | CREDENTIAL | Hash | Stays (one-way); destroyed on erasure |
| `mfa_secret` | `mfaSecret` | TOTP shared secret | CREDENTIAL | **YES (plaintext)** | Should be encrypted at rest; destroyed on erasure |
| `verification_token` | `verificationToken` | Email-verify nonce | CREDENTIAL | YES | Transient; destroyed on erasure |
| `locale` | `locale` | UI language pref | INDIRECT (weak) | YES | Low-sensitivity; stays |
| `id` | `id` | Surrogate user id | REFERENCE | Tokenized | Stays — the opaque subject token everything else points at |

> `email` + `full_name` are the canonical pair the whole product joins against for display. Moving
> them to the vault is the hard part: every "assignee name", "author name", "actor" display resolves
> through `users`. The design must add a **blind/searchable index** for email (login + uniqueness)
> without storing plaintext.

### 1.2 `customer_users` — external customer-portal users (entity `CustomerUser`)

| Column | Field | Personal data | PII class | Plaintext today? | Vault target |
|---|---|---|---|---|---|
| `email` | `email` | Customer login email | DIRECT | **YES** | Vault `EMAIL` (customer scope) |
| `display_name` | `displayName` | Customer person name | DIRECT | **YES** | Vault `NAME` |
| `password_hash` | `passwordHash` | Auth secret | CREDENTIAL | Hash | Stays/destroyed on erasure |
| `id` | `id` | Surrogate id | REFERENCE | Tokenized | Stays |

> **Separate identity from `users`** — a distinct subject population with its own login. Erasure +
> residency must treat customer subjects independently (a DISCOM's customers may have stricter
> residency than the DISCOM's staff).

### 1.3 `stakeholder` — project stakeholders (entity `Stakeholder`)

| Column | Field | Personal data | PII class | Plaintext today? | Vault target |
|---|---|---|---|---|---|
| `name` | `name` | Stakeholder name | DIRECT | **YES** | Vault `NAME` |
| `email` | `email` | Stakeholder email | DIRECT | **YES** | Vault `EMAIL` |
| `organization` | `organization` | Employer/org | INDIRECT | YES | Vault `ORG` (or low-sens, decide w/ DPO) |
| `role` | `role` | Job title | INDIRECT | YES | Low-sensitivity; likely stays |
| `notes` | `notes` (TEXT) | Free notes about the person | CONTENT | **Free-text** | Must be PII-scrubbed or vaulted; can embed anything |
| `last_contacted_at` | `lastContactedAt` | Contact behavior | INDIRECT | YES | Stays |
| `created_by` | `createdBy` | Actor id | REFERENCE | Tokenized | Stays |

> Stakeholders are a **third subject type** — often the personal data of people who are *not* users of
> the system at all (e.g. a regulator contact). High-value for erasure requests from non-users.

---

## 2. COMMUNICATIONS & CONTACT DATA

### 2.1 `customer_accounts` (entity `CustomerAccount`)
`name` (org name — INDIRECT, plaintext), `subdomain`, `primary_color`, `logo_url` — org branding,
generally not personal data; `created_by` REFERENCE. **Low priority**, but `name` can be a sole
proprietor's personal name — flag for DPO.

### 2.2 `chat_conversations` (entity `ChatConversation`)

| Column | Personal data | PII class | Plaintext today? | Vault target |
|---|---|---|---|---|
| `customer_name` | Name of customer in the chat | DIRECT | **YES** | Vault `NAME` (denormalized snapshot — worst kind) |
| `subject` | Chat subject line | CONTENT | Free-text | Scrub/vault |
| `assigned_agent_id` | Internal agent | REFERENCE | Tokenized | Stays |
| `account_id` | Customer account | REFERENCE | Tokenized | Stays |

> `customer_name` is a **denormalized copy** of the subject's name — exactly the pattern crypto-shred
> forbids (a copy outside the vault that survives key destruction). Must become a token reference.

### 2.3 `chat_messages` (entity `ChatMessage`)

| Column | Personal data | PII class | Plaintext today? | Vault target |
|---|---|---|---|---|
| `body` | Message text (append-only) | CONTENT | **Free-text, append-only** | Cannot be vaulted per-row; needs scrub-on-write or message-body vault |
| `sender_id` | Sender (customer/agent) | REFERENCE | Tokenized | Stays |
| `ai_meta` | Policy/model state | — | — | Not PII |

> Append-only message history is a direct collision with erasure (same shape as the events problem).
> Design choice for iter 7–9: either (a) tokenize/vault message bodies, or (b) treat chat as a vaulted
> store keyed by conversation and crypto-shred the whole conversation on subject erasure.

### 2.4 `stakeholder_communications` (entity `StakeholderCommunication`)
`subject`, `body` (TEXT) — CONTENT free-text that can name/quote people; `stakeholder_ids` (jsonb) —
REFERENCE list; `created_by` REFERENCE. Free-text bodies need scrub/vault.

### 2.5 `customer_feedback_items` (entity `CustomerFeedback`)
`customer` (DIRECT — customer name/identifier, plaintext **YES**), `content` (TEXT — CONTENT, the raw
feedback, may quote the person). Both must be vaulted/scrubbed.

### 2.6 `csat_responses` (entity `CsatResponse`)
`comment` (CONTENT free-text), `submitted_by` (REFERENCE). Comment can embed PII.

### 2.7 `service_requests` (entity `ServiceRequest`)
`subject`, `description`, `form_data` (jsonb) — CONTENT free-text submitted by a customer; can carry
name/phone/address/account numbers. `submitted_by`, `assignee_id` REFERENCE. **High priority** —
customer-authored free text is the likeliest place for unexpected PII (meter numbers, addresses).

---

## 3. AUTHORSHIP / ACTIVITY — free-text bodies + actor references

These store an **author/actor reference** (token-safe) plus **free-text content** that may embed PII.

| Table (entity) | PII column(s) | Class | Plaintext today? | Notes |
|---|---|---|---|---|
| `comments` (`Comment`) | `body` | CONTENT | Free-text | `author_id` REFERENCE; `@mentions` may embed names. **No `workspace_id`** — see §7 |
| `article_comments` (`ArticleComment`) | `body` | CONTENT | Free-text | `author_id` REFERENCE; **no `workspace_id`** |
| `article_block_comments` (`ArticleBlockComment`) | `content` | CONTENT | Free-text | `author_id` REFERENCE |
| `articles` (`Article`) | `title`, body/blocks | CONTENT | Free-text | author/editor REFERENCEs; KB content can name people |
| `article_authors` (`ArticleAuthor`) | `user_id`, `added_by` | REFERENCE | Tokenized | Roster — walked by erasure |
| `worklogs` (`WorkLog`) | `description` | CONTENT | Free-text | `user_id` REFERENCE |
| `meeting` (`Meeting`) | `agenda`, `attendees` (jsonb), `location`, `organizer_id` | CONTENT + REFERENCE | Free-text / tokenized | `attendees` jsonb may hold names/emails — inspect at design time |
| `meeting_note` (`MeetingNote`) | `content` | CONTENT | Free-text | Minutes can quote people |
| `standup_entries` (`StandupEntry`) | `yesterday`, `today`, `blockers` | CONTENT | Free-text | `member_id` REFERENCE; **no `workspace_id`** |
| `retro_notes` (`RetroNote`) | note text | CONTENT | Free-text | confirm columns at design time |
| `decision`, `risk`, `assumption`, `dependency`, `lesson_learned`, `action_item`, `idea`, `impediment`, `pm_issue` | title/description/notes | CONTENT | Free-text | PM artifacts; `created_by`/owner REFERENCEs; free text can name people |

> **Pattern:** actor columns (`author_id`, `created_by`, `user_id`, `member_id`, `organizer_id`,
> `resolved_by`, `deleted_by`, `requested_by`, `submitted_by`, `added_by`) are **already tokens**
> (surrogate user ids) — they stay. The exposure is the **free-text bodies**. Crypto-shred can't
> per-field-vault every free-text column cheaply; the realistic design is a **PII-scrub/redaction
> pass on write** plus a content-vault for known-sensitive surfaces (chat, service requests,
> stakeholder notes/comms, customer feedback).

---

## 4. WORK ITEMS — the big free-text surface

### 4.1 `work_items` (entity `WorkItem`)
`work_items` has **no direct identity PII columns**, but a large set of **CONTENT free-text** columns,
all plaintext, any of which can embed personal data (names, emails, phone numbers, addresses, meter
ids), and many **REFERENCE** actor columns.

- **CONTENT free-text (plaintext, can embed PII):** `title`, `description`, `acceptance_criteria`,
  `steps_to_reproduce`, `expected_behavior`, `actual_behavior`, `fix_description`, `root_cause`,
  `resolution_summary`, `closure_notes`, `stakeholder_update`, `mitigation_plan`, `contingency_plan`,
  `basis_rationale`, `risk_if_wrong`, `impact_if_delayed`, `business_justification`.
  Especially **`stakeholder_update`** (likely to name/quote stakeholders) and HR/IT
  **service-request** items raised "on behalf of" a named employee.
- **REFERENCE (tokens — stay):** `assignee_id`, `created_by`, `reporter_id`, `approver_id`,
  `requested_for_id` (the employee a request is *about* — sensitive linkage), `deleted_by`.
- **Custom field values** — see §4.2; these are the structured path where PII most plausibly lands.

### 4.2 `work_item_field_value` (entity `WorkItemFieldValue`) + `field_def` (entity `FieldDef`)
Unified custom-field store (V80). A workspace can define a field of any type and put **anything** in
it — a "Customer Contact" text field, a "Phone" field, an "Email" field. `value`/`value_date`
columns are **plaintext CONTENT** and are the **most likely structured PII surface** because the field
semantics are tenant-defined.

> **Design requirement:** `field_def` should gain a **`pii: boolean` (or `pii_class`) flag** so a
> workspace can mark a custom field as PII. The vault tokenization + the no-PII-in-events guardrail
> then key off that flag for custom fields (raw PII inventory can't enumerate tenant-defined fields —
> it must be *declared*). Flag this to legal/DPO and to the field-system design.

### 4.3 Legacy/duplicate stores (EXPAND/CONTRACT debt)
`custom_field_definitions` (entity `CustomFieldDefinition`) and `work_items.custom_fields` (JSONB,
`@Transient` on the entity but present in schema) are the **pre-V80 stores left in place** for a later
contract migration. They can hold the **same PII** as §4.2. The tokenization design must cover them
until they are dropped, or the contract migration must precede tokenization.

---

## 5. SECURITY / AUDIT / AUTH — indirect identifiers & the erasure conflicts

### 5.1 `audit_log_entries` (entity `AuditLogEntry`) — **append-only, hash-chained, UPDATE/DELETE-blocked (V52 trigger)**

| Column | Personal data | PII class | Plaintext today? | Erasure impact |
|---|---|---|---|---|
| `actor_id` | Who did it | REFERENCE | Tokenized | OK — token survives erasure by design |
| `ip_address` | Source IP | INDIRECT | **YES (plaintext)** | Personal data in an **immutable** log — conflict |
| `user_agent` | Device/browser | INDIRECT | **YES (plaintext)** | Personal data in an immutable log — conflict |
| `detail` | Free-text detail | CONTENT | **Free-text** | **Confirmed leak** — see §5.2 |
| `target_id` | Affected entity | REFERENCE | Tokenized | OK |

> **This is the canonical instance of the RB-40 §3 conflict.** The log is immutable by trigger, yet
> it currently stores `ip_address`, `user_agent`, and free-text `detail`. Under crypto-shred these
> indirect identifiers must be **tokenized/vaulted at write time** (not stored raw in the immutable
> row) or the immutability guarantee defeats erasure. `ip_address`/`user_agent` are arguably needed
> for forensics — design choice: store a **per-subject reversible token** resolvable via the vault, so
> destroying the subject key renders the forensic linkage unrecoverable while keeping the chain
> intact.

### 5.2 `DataPrivacyService` — **active rule-1 violations to fix in the build phase**
`DataPrivacyService.java` (the erasure/export service) currently:
- Writes raw email into the immutable audit log: `auditLog.record(..., "GDPR/DPDP data export for " +
  user.getEmail())` (export) — line ~63. **Raw PII into the append-only chain.**
- `export(...)` assembles `email` + `fullName` into `result_summary` (stored on
  `data_subject_requests.result_summary`, TEXT) — a plaintext PII copy.
- `data_subject_requests.subject_email` (entity `DataSubjectRequest`) stores the subject's raw email
  (`setSubjectEmail(user.getEmail())` for EXPORT) — **plaintext PII column**, §5.3.
- `erase(...)` "tokenizes" by overwriting `users.email`/`full_name` with placeholders — this is the
  *interim* (pre-vault) erasure; once the vault exists, erase = destroy the per-subject key instead.

> These are noted here as inventory findings (PII locations), **not fixed by this doc**. They are
> work for the tokenization/erasure build (iter 7–9).

### 5.3 `data_subject_requests` (entity `DataSubjectRequest`)
`subject_email` (DIRECT, **plaintext**), `result_summary` (CONTENT — holds exported PII),
`notes` (CONTENT). `subject_user_id`/`requested_by` REFERENCE. The DSR table about erasure itself
holds PII — must vault/scrub.

### 5.4 `access_anomalies` (entity `AccessAnomaly`)
`summary`, `evidence` (TEXT, CONTENT) — likely embed IP/geo/device strings about a subject;
`subject_user_id`/`resolved_by` REFERENCE. Vault/scrub the evidence text.

### 5.5 `conditional_access_policies` (entity `ConditionalAccessPolicy`)
`ip_allowlist`, `geo_allowlist` (INDIRECT — admin-configured allow-lists; identify locations/networks
but are policy config, not subject data). Lower priority; confirm with DPO whether allow-listed IPs
are personal data.

### 5.6 Auth credentials & device identifiers

| Table (entity) | PII column(s) | Class | Plaintext today? | Notes |
|---|---|---|---|---|
| `webauthn_credentials` (`WebAuthnCredential`) | `public_key_pem`, `credential_id`, `sign_count`, `transports`, `label` | CREDENTIAL/INDIRECT | YES | Public key only (private key never leaves device); credential id is a device identifier → tie to subject, destroy on erasure |
| `webauthn_challenges` (`WebAuthnChallenge`) | `challenge` | CREDENTIAL | YES | Short-lived nonce; `user_id` REFERENCE |
| `push_subscriptions` (`PushSubscription`) | `endpoint`, `p256dh`, `auth`, `user_agent` | INDIRECT/CREDENTIAL | **YES (plaintext)** | Push endpoint + keys are a **device identifier for a person**; `user_agent` is INDIRECT. Destroy on erasure |
| `password_reset_tokens` (`PasswordResetToken`) | `token` | CREDENTIAL | YES | `user_id` REFERENCE; transient |
| `api_tokens` (`ApiToken`) | `token_hash`, `token_prefix`, `name` | CREDENTIAL | Hash + prefix | `created_by` REFERENCE; not subject PII but ties to a person |
| `scim_tokens` (`ScimToken`) | `token_hash`, `label` | CREDENTIAL | Hash | `created_by` REFERENCE |
| `integration_credentials` (`IntegrationCredential`) | `access_token_enc`, `refresh_token_enc` | CREDENTIAL | **Encrypted (AES-256-GCM via `EncryptionService`)** | Already encrypted — the existing pattern to extend to PII |

### 5.7 `events` (entity `AppEvent`) — **append-only event store (the core RB-40 §3 conflict)**

| Column | Personal data | PII class | Plaintext today? | Erasure impact |
|---|---|---|---|---|
| `actor_id` | Who | REFERENCE | Tokenized | OK by design |
| `payload` (TEXT) | Event snapshot | CONTENT | **Free-text/JSON** | **Can embed PII** if an event captures a PII field value (e.g. a custom PII field change, a title containing a name) |
| `old_value` / `new_value` (TEXT) | Field-change values | CONTENT | **Free-text** | **Direct conflict** — a field-edit event on a PII field stores the raw old/new PII in the immutable log |
| `field_name` | Which field changed | metadata | YES | Not PII, but identifies *that* a PII field changed |

> **This is what RB-40 §3 rule 1 + the planned "no-PII-in-events" guardrail exist for.** Today,
> `EventService` writing a `STATUS_CHANGED`/field-edit event for a PII-typed field (§4.2) would place
> raw PII into `old_value`/`new_value`/`payload`. The guardrail must block writing any value of a
> PII-flagged field into an event; events must carry the **token**, never the raw field. Note V87
> backfilled synthetic events for seed items — confirm that backfill wrote no raw PII.

---

## 6. REFERENCE-ONLY tables (tokens; the erasure FK fan-out map)

These store **no raw PII**, only opaque subject references — but the erasure job must know them so a
subject's links are handled (anonymized display, cascade, or left as dangling tokens). Non-exhaustive
on free-text, exhaustive on subject references found:

`workspace_members` (raw-SQL table, no JPA entity — referenced by `RbacService`: `user_id` + `role_id`
+ `workspace_id`; the internal membership roster), `project_team_members` (`ProjectTeamMember`:
`user_id`), `ceremony_attendees` (`CeremonyAttendee`: `user_id`), `work_item_watchers` (V89: per-user
follower rows), `article_watchers` (V105), `space_followers` (V106), `article_favorites`
(`ArticleFavorite`: user_id), `article_reactions` (`ArticleReaction`: user_id), `notifications`
(`Notification`: `user_id` REFERENCE + **`message` CONTENT free-text** that can embed a name — e.g.
"Alice assigned you…"), `notification_preferences` (`NotificationPreference`: `user_id`),
`ai_invocations` (`AiInvocation`: `user_id` REFERENCE; `prompt_chars` is a **count not content** —
good, no prompt text stored), `ai_memories` (`AiMemory`: `user_id` + **`mem_value` CONTENT** — AI
"remembers" user context; can embed PII → vault/scrub), `ai_agent_runs`/`ai_agent_steps` (user_id +
step payloads — inspect for PII at design), `bql_run_audits` (V85: `user_id`), `bql_subscriptions`
(V86: per-user), `metric_shares` / `report_schedules` (recipients — may hold emails; inspect),
`sprint_member_capacities` (V90: per-member), plus all `created_by` / `updated_by` / `actor_id` /
`resolved_by` / `deleted_by` columns across every entity in §1–§5.

> **Action for the design:** generate the complete FK-to-subject map programmatically from the schema
> (every `*_id`/`*_by` column referencing `users`/`customer_users`/`stakeholder`) so the erasure job
> is provably exhaustive. The list above is the human-readable starting set.

---

## 7. Cross-cutting findings (flag to the build phase — NOT fixed here)

1. **Vault is unused scaffold.** `pii_vault_entries` / `PiiVaultEntry` / `PiiVaultRepository` /
   `KeyRotationService` exist (V67), and the `pii_type` taxonomy is `EMAIL | PHONE | NAME | ADDRESS |
   etc.`, but **no code populates the vault** and **no PII column above is tokenized**. The entire
   inventory is "plaintext today."
2. **PII in the immutable trails.** Both append-only stores currently accept raw PII:
   `events.old_value/new_value/payload` (§5.7) and `audit_log_entries.detail/ip_address/user_agent`
   (§5.1), and `DataPrivacyService` actively writes an email into the audit chain (§5.2). These are
   the literal cases RB-40 §3 says cannot both be true — resolve via tokenize-at-write before any
   PII-bearing event/audit path is trusted.
3. **Denormalized name snapshots** (`chat_conversations.customer_name`, comment `@author_name` is
   `@Transient` so not persisted — good) defeat crypto-shred and must become token references.
4. **Tenant-defined custom fields (§4.2/§4.3) are the unknowable PII surface.** Add a `pii` flag on
   `field_def` so PII custom fields are *declared*; the no-PII-in-events check and vault then key off
   it. A static inventory cannot enumerate tenant fields.
5. **`mfa_secret` and `push` keys are plaintext** (§1.1, §5.6). Even pre-vault, these should use the
   existing `EncryptionService` (the pattern `integration_credentials` already follows).
6. **Tables missing `workspace_id`** (`comments`, `article_comments`, `notifications`,
   `standup_entries`, `worklogs`, `notification_preferences`, `webauthn_challenges`,
   `password_reset_tokens`, `push_subscriptions`): they scope through a parent (work item / article /
   user). The vault + residency map keys on `workspace_id` (the vault row carries it), so erasure of
   these must resolve workspace via the parent. Note for the residency join design.

---

## 8. Data-residency map (skeleton — RB-40 §3 rule 4 + §4 BYOK)

Per the decision, the inventory pairs with **which vault, which region** so the residency requirement
reads from the same artifact. The vault is **workspace-scoped** (`pii_vault_entries.workspace_id`) and
the per-subject key is envelope-encrypted via the KMS (BYOK per tenant). Therefore residency is
resolved **per workspace**:

| Subject population | Source tables | Vault scope | Region driver | Key custody |
|---|---|---|---|---|
| Internal users | `users` (+ all §3–§6 refs) | `pii_vault_entries` keyed by `workspace_id` + `subject_id`=user id | Workspace's configured residency region | KMS data key; BYOK if tenant requires (`workspace_security_settings.byok_key_ref`, rotated by `KeyRotationService`) |
| Customer-portal users | `customer_users`, `chat_*`, `service_requests`, `csat_responses`, `customer_feedback_items` | Same vault, `subject_id`=customer user/account id | Customer's DISCOM workspace region (may be stricter) | Same; per-subject key destroyed on customer erasure |
| Stakeholders (often non-users) | `stakeholder`, `stakeholder_communications` | Same vault, `subject_id`=stakeholder id | Workspace region | Same |

**To finalize with DPO/legal (iter 7–9):** the concrete region→infra mapping (RB-40 §5 AWS topology:
RDS region, KMS region, S3 backup region), key-retention-≤-backup-retention windows (RB-40 §3 rule 2),
and the propagation of key destruction to replicas/caches.

---

## 9. Priority for tokenization (recommended build order)

1. **P0 — Direct identities:** `users.email/full_name`, `customer_users.email/display_name`,
   `stakeholder.name/email` (§1). Blind index for email login is the gating design problem.
2. **P0 — Stop the immutable-log leaks:** events `old/new_value`+payload PII, `audit_log_entries`
   ip/user_agent/detail, `DataPrivacyService` email-into-audit (§5.1, §5.2, §5.7) — before any
   PII-flagged field can be edited through an event path.
3. **P1 — Customer-authored free text:** `service_requests`, `chat_messages`/`chat_conversations`,
   `customer_feedback_items`, `csat_responses` (§2) — likeliest place for unexpected PII.
4. **P1 — Custom-field `pii` flag** on `field_def` + tokenize flagged `work_item_field_value` (§4.2),
   covering legacy stores (§4.3) or sequencing the contract migration first.
5. **P2 — Credentials/device ids at rest:** `mfa_secret`, `push_subscriptions`, webauthn (§5.6).
6. **P2 — Internal free text:** comments, notes, standups, worklogs, PM artifacts, `ai_memories`,
   `notifications.message` (§3, §6) — scrub-on-write + content vault for known-sensitive surfaces.

---

### Provenance
Built by reading every `@Table`-annotated entity in `works-backend/src/main/java/com/bcits/works`
(≈150 entities, full table list verified), the RB-40 §3 decision, and the existing vault scaffold
(`PiiVaultEntry`, `PiiVaultRepository`, `KeyRotationService`, `EncryptionService`,
`DataPrivacyService`) + migration `V67__oauth_credentials_and_key_rotation.sql`. "Plaintext today"
reflects the current schema/entity state on branch `feat/p1-pii-vault`; no production code or schema
was changed to produce this inventory.
