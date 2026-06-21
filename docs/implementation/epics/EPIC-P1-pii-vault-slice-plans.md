# EPIC P1 — PII Vault — Per-slice execution plans (RB-05 Stage 2/3 + task-execution loop)

> Companion to `EPIC-P1-pii-vault.md` (signed-off design) and `EPIC-P1-pii-vault-completion.md`
> (what shipped). One **per-item plan block** per remaining slice — *scope · analysis · files ·
> acceptance criteria · validation* — written **before** the code, and reused as the PR description
> (Deepak's required per-task loop). Decisions (Deepak): 2026-06-20 dual-write + defer CONTRACT, full
> scope incl. free-text, upgraded local KMS now; 2026-06-21 complete the Phase-1 PII-vault scope &
> merge to main, auto-merge each slice on green CI, choose product-best rules-aligned options; Slice 5
> = full non-prod validation with all prod/non-prod config centralised + documented (Deepak does the
> real AWS prod config at launch).

---

## Slice 3 — other subjects + denorm copies (this PR)

**Scope.** Extend the per-subject crypto-shred vault from the internal `User` identity (Slices 1–2)
to the two remaining PII subject populations and remove the two *persisted* denormalised PII copies,
all behind the **existing default-off flags** so the merge changes no runtime behaviour:

1. **CustomerUser** (external customer-portal identity — a *separate* login from `users`): tokenize
   `email` + `display_name` into the vault; add an `email_hmac` blind index so portal login keeps an
   O(1) lookup once the raw email is tokenized (**auth-critical — mirrors the approved Slice 2
   pattern**, gated by the same `pii.vault.login-via-blind-index` switch).
2. **Stakeholder** (often a non-user — regulator/exec; no login, lower risk): tokenize
   `name` + `email` + `organization` + `notes` (free-text) into the vault.
3. **Denorm copies** (survive a crypto-shred today → break RB-40 §3 rule 3): replace the persisted
   `chat_conversations.customer_name` and `customer_feedback_items.customer` with a
   `customer_subject_token` + render-time resolution. (`comment.author_name` is already `@Transient`
   — out of scope, already safe.)

**Analysis (multidimensional — RB-05 Stage 2).**
- *Product (RB-20):* iteration 9/15/20 surfaces (customer portal, stakeholder register, support
  inbox, feedback). No feature removed; identity rendering is preserved via render-time resolution.
- *Engineering (RB-10):* expand-only Flyway migration **V112** (next after V111); per-subject glue
  services mirroring `UserPiiService`; reuse the single `PiiVaultService` seam (workspace-scoped
  `put/resolve/forget` for workspace-owned subjects, with the entity's own `workspaceId`). No new
  query syntax; no controller business logic.
- *Governance (RB-40):* §1 — vault rows are workspace-scoped (the entity carries its own
  `workspace_id`; every vault finder is explicit-workspace). §3 — raw PII only in the vault; the two
  denorm copies become tokens that resolve to `[erased]` after a shred (rule 3 holds). Cross-tenant +
  unauthorized tests mandatory.
- *Design (RB-30):* none — response shapes are unchanged (resolution mutates the rendered value in
  place, exactly like the existing `scrub()` precedent), so no frontend change.
- *Holistic / second-order:* the blind-index switch is shared with internal-user login → flipping it
  routes **both** internal and portal login via the blind index, so the backfill must populate
  `email_hmac` for `users` **and** `customer_users` first (documented in the rollout note). Backfill
  extended to the new subjects + denorm tokens, idempotent (`subject_token IS NULL` guard).

**Files.**
- `db/migration/V112__pii_vault_slice3_customer_stakeholder_denorm.sql` (new, expand-only).
- Entities: `CustomerUser` (+`subjectToken`,`emailHmac`,`@PrePersist`), `Stakeholder`
  (+`subjectToken`,`@PrePersist`), `ChatConversation` (+`customerSubjectToken`), `CustomerFeedback`
  (+`customerSubjectToken`).
- New glue services: `CustomerUserPiiService`, `StakeholderPiiService`.
- New pii_type constants on `PiiVaultService` (`TYPE_ORG`, `TYPE_NOTES`).
- Repos: `CustomerUserRepository` (+`findByEmailHmac`,`existsByEmailHmac`,`findBySubjectTokenIsNull`);
  `StakeholderRepository` (+`findBySubjectTokenIsNull`); `ChatConversationRepository`,
  `CustomerFeedbackRepository` (+ `customer_subject_token IS NULL` backfill finders).
- Wiring: `CustomerAccountController` (dual-write + blind-index existence + render),
  `CustomerAuthController` (blind-index login + render), `StakeholderController` (dual-write + render),
  `SupportChatService` + `SupportChatPortalController` (set token) + `SupportChatAgentController`
  (render), `CustomerFeedbackService` + `CustomerFeedbackController` (dual-write + render).
- Backfill: `PiiVaultBackfillService` (+ new subject methods), `PiiVaultBackfillRunner` (call them).
- Tests: `CustomerUserPiiServiceTest`, `StakeholderPiiServiceTest`, `PiiVaultSlice3IT`,
  `PiiVaultBackfillServiceTest` (extended).

**Acceptance criteria.**
- A CustomerUser / Stakeholder's PII is dual-written to the vault on create/update; with
  `read-from-vault=true` the portal/admin/agent surfaces render the vault value (and `[erased]` after
  a shred), and with it off they render the legacy column (zero behaviour change on merge).
- With `login-via-blind-index=true`, portal login + the duplicate-email check resolve via
  `customer_users.email_hmac`; off → legacy `findByEmailIgnoreCase` (default).
- `chat_conversations.customer_name` / `customer_feedback_items.customer` are dual-written to the
  vault under a `customer_subject_token`; agent inbox + feedback list resolve the name from the token
  when reads are switched on; a crypto-shred renders `[erased]`.
- Cross-tenant: workspace B cannot resolve workspace A's customer/stakeholder tokens.
- Full backend gate green (unit + JaCoCo + Checkstyle) + integration on real Postgres + fresh-DB
  boot (`ddl-auto=validate`) confirms the V112 schema matches the entities.

**Validation.**
- `mvn clean test` (unit + Checkstyle + JaCoCo) — must be green from a clean target (stale-target
  gotcha).
- Integration suite incl. the new `PiiVaultSlice3IT` against Testcontainers Postgres.
- Fresh-DB boot with `ddl-auto=validate`.
- Push → PR → CI green → squash-merge → confirm on `origin/main` (auto-merge authorised).

---

## Slice 4 — split into focused sub-PRs (rest of Slice 4)

Slice 4 spans four distinct concerns; each ships as its own auto-merging PR in dependency order, with
the guardrail/ArchUnit **BLOCK** last (only after the leak sweep is clean): **4a** assignee event leak →
**4b** `field_def.pii` routing → **4c** free-text / notifications PII → **4d** guardrails + ArchUnit BLOCK.

### Slice 4a — assignee full-name leak in the immutable events log (no schema)

**Scope.** The highest-severity *stored* PII leak: `WorkItemCommandService.recordFieldDiffs` wrote the
assignee's **full name** (`User::getFullName`) into the append-only `events.old_value/new_value` on every
reassignment — PII that **crypto-shred cannot reach** (RB-40 §3 rule 1). Record the assignee **user id**
instead (a surrogate, non-PII — consistent with the AI / automation / bulk assign paths, which already
record ids), and resolve ids → display names **at render** via the PII vault.

**Analysis.** Engineering (RB-10): event producer + activity read path. Governance (RB-40 §3): no raw PII
in the immutable log; render-time resolution through the vault. Holistic: `assignee` is a history-tracked
BQL alias (`BqlCompiler.HISTORY_FIELDS`) matching `old/new_value` — recording ids makes assignee-history
**consistent** across all four producers (it was mixed id/name before, a latent bug). The activity feed
ignored `ASSIGNED` (fell back to "Updated (assigned)"), so there is **no display regression**; adding the
sentence is a strict improvement. `ActivityController` previously rendered the actor via a raw
`users.full_name` join — replaced with vault resolution so the feed follows the vault on flip and renders
`[erased]` after a shred.

**Files.** `WorkItemCommandService` (record id), `UserPiiService` (+`displayNameById`), `ActivityController`
(resolve actor + assignee ids → names at render, drop the raw join), `works-frontend/src/lib/activity-feed.js`
(+`ASSIGNED` sentence). Tests: `ActivityControllerAccessTest` (SQL + resolution), `activity-feed.test.js`.

**Acceptance.** No assignee full name is written to `events`; the activity feed shows "Assigned to / Reassigned
from … to … / Unassigned"; actor + assignee names resolve via the vault (`[erased]` after a shred); BQL
assignee-history unaffected (now id-consistent). Full unit gate + frontend tests + context boot green.

**Validation.** Backend unit gate (1391 + new resolution test, 0 Checkstyle, coverage met); frontend
`activity-feed.test.js` (28); context-booting IT confirms DI. No migration. Push → PR → CI green →
squash-merge → confirm on `origin/main`.

### Slice 4b — tenant-declared PII custom fields (field_def.pii → vault)

**Scope.** Static inventory can't cover tenant-*defined* field semantics, so a workspace can flag a
custom field as PII (`field_def.pii`); the field's **text** values are tokenized into the per-subject
crypto-shred vault instead of living in plaintext on `work_item_field_value` (RB-40 §3, EPIC §9 / §5.2 #11).

**Analysis.** Engineering (RB-10): expand-only Flyway **V113** (`field_def.pii` default false +
`work_item_field_value.subject_token`); reuse the generic per-record free-text tokenizer
(`CustomerAttributionPiiService`, shared with the chat/feedback denorm copies — no duplication, no
churn to merged code). Governance (RB-40 §3): value tokenized under a per-value token addressed by the
field's `workspaceId`; resolved at the controller boundary; `[erased]` after a shred. Dual-write: legacy
`value_text` stays authoritative until the deferred CONTRACT. Default-off read switch → no behaviour
change on merge. The `pii` flag is per-field config, editable via the existing field-def update.

**Files.** `V113__pii_vault_field_def_pii_flag.sql`; `FieldDef` (+`pii`), `WorkItemFieldValue`
(+`subjectToken`); `FieldDefController` (vault on `setValue`, resolve on `getValues`, propagate `pii`
on update); `FieldDefRepository` (+`findByPiiTrue`), `WorkItemFieldValueRepository`
(+`findByFieldDefIdAndSubjectTokenIsNull`); `PiiVaultBackfillService` (+`backfillFieldValues`). Tests:
`FieldDefControllerPiiTest`, updated `FieldDefControllerAccessTest` + `PiiVaultBackfillServiceTest`.

**Acceptance.** Setting a PII-flagged field's value tokenizes it (subject_token set, ciphertext at rest);
`getValues` resolves it from the vault when reads are on (`[erased]` after a shred), legacy column when
off; non-PII fields unchanged; backfill tokenizes existing PII values idempotently. ai-rules §6 → V113.

**Validation.** Unit gate (1394, 0 Checkstyle, coverage met) incl. `FieldDefControllerPiiTest`;
`FlywayMigrationIntegrationTest` (V113 applies) + context boot (`ddl-auto=validate`) confirm schema↔entity;
guardrails + ai-rules `--check` green. Push → PR → CI green → squash-merge → confirm on `origin/main`.

### Slice 4d — machine-enforce "no raw PII in the immutable event log / audit chain" (BLOCK)

**Scope.** Lock in the invariant that 4a + Slices 1/2 established: raw identity PII (`getFullName()` /
`getEmail()`) must never be written into the append-only `events` log or the immutable audit chain
(RB-40 §3 rule 1) — crypto-shred cannot reach those, so the only safe content is ids/tokens. Make it
machine-enforced so it can't regress.

**Analysis.** The events + audit sweep is already clean (verified: no `getFullName`/`getEmail` flows
into any `EventService.record*`/`recordDiff`/`recordInWorkspace` or `SecurityAuditLogService.record`
call after 4a). This slice adds the enforcement the EPIC defers "once the inventory exists": a
`guardrails.sh` **BLOCK** tripwire (same-line grep for a `getFullName()/getEmail()` argument to a
record call) + an **ArchUnit** structural rule (`EventService` / `AppEvent` / `SecurityAuditLogService`
must not depend on the `User` / `CustomerUser` / `Stakeholder` entities). The notifications-message
leak (#7) and free-text content (#12) are a **separate, mutable, erasure-reachable** surface — *not*
the events/audit chain — so they are out of this guardrail's scope and tracked as Slice 4c.

**Files.** `scripts/guardrails.sh` (+BLOCK check), `works-backend/.../ArchitectureTest.java` (+rule).
No production code, no migration.

**Acceptance.** The new BLOCK check is green on a clean tree and **fails** on an injected
`record(... .getFullName())` line (verified with a negative test); the ArchUnit rule passes today and
fails if the event/audit layer ever imports a PII entity; full unit gate green.

**Validation.** `bash scripts/guardrails.sh` (new check ✓), negative-regex test confirms the tripwire
catches a leak; unit gate (1395, 0 Checkstyle, coverage met) incl. the new ArchUnit rule. Push → PR →
CI green → squash-merge → confirm on `origin/main`.

> **Remaining after 4d:** Slice 4c (notifications.message actor-name → render-time resolution like 4a;
> free-text customer-content redaction at the AI boundary — mutable/erasure-reachable, lower severity)
> and Slice 5 (real AWS KMS / BYOK — non-prod-validatable, all prod/non-prod config centralised +
> documented). CONTRACT (dropping the legacy plaintext columns) stays deferred per EPIC §3/§12.
