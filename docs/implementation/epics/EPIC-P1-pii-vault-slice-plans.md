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
