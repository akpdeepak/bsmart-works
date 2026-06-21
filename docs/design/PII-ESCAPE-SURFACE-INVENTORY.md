# PII Escape-Surface Inventory — RB-40 §3 Rule 1 ("no raw PII outside the vault")

> **Status:** DESIGN ONLY. No production code or schema changed by this document.
> **Scope:** the detailed design that RB-40 §3 defers to iterations 7–9 — the PII field inventory
> plus the enumeration of every surface where raw personal data could *escape* the PII vault.
> **Decision being satisfied:** crypto-shredding + PII-vault tokenization (RB-40 §3, 2026-06-04).
> Rule 1: *"No raw PII outside the vault — not in event payloads, projections, search indexes,
> logs, or metrics; only tokens/ciphertext."*
> **Branch:** `feat/p1-pii-vault`. **Owner:** Deepak / DPO sign-off required before build.

---

## 0. How to read this

The vault scaffold (`PiiVaultEntry`, `PiiVaultRepository`, `KeyRotationService`,
`EncryptionService`) is in place but **nothing writes to it yet**. Raw PII today lives in plain
columns on `users` (`email`, `full_name`), `stakeholder` (`name`, `email`, `organization`,
`notes`), `customer_user`, and denormalized copies on `comments.author_name` /
`article_comments.author_name`. The vault is the *intended* home; this document maps every place a
raw personal value **currently flows out of** (or could flow out of) the system *instead of* being
tokenized.

Each surface is rated:

- **CARRIES RAW PII TODAY** — verified raw personal data on this surface in the current code.
- **STRUCTURALLY SAFE (today)** — the surface stores only ids/tokens/counts today, but the field
  inventory must keep it that way once the vault is wired in.
- **AT RISK** — safe by accident, not by design; one careless change leaks it; needs a guardrail.

The "PII" set for this inventory: **email, full name, phone, postal address, IP address,
free-text that routinely contains the above (comment bodies, stakeholder notes, digest bodies).**

---

## 1. PII field inventory (the source artifact — RB-40 §3 rule 4)

| Entity / table | Field | Class of PII | Vault target? |
|----------------|-------|--------------|---------------|
| `users` | `email` | email | YES — tokenize |
| `users` | `full_name` | name | YES — tokenize |
| `users` | `verification_token`, `mfa_secret`, `password_hash` | secret (not PII but sensitive) | encrypt at rest (RB-40 §4) |
| `stakeholder` | `name`, `email`, `organization`, `notes` | name / email / free-text | YES — tokenize (entirely outside any vault today) |
| `customer_user` | name / email (CustomerAuthController) | name / email | YES — tokenize |
| `comments` | `author_name` (denormalized copy of `users.full_name`) | name | derive from vault at read time; do not persist |
| `article_comments` | `author_name` | name | derive from vault at read time; do not persist |
| `notifications` | `message` (contains actor full name + comment text) | name / free-text | tokenize actor; render at read time |
| comment / article-comment bodies | free text + `@mention` text | free-text PII | classify; out-of-scope to tokenize, but never egress to AI/index raw |

This table is the single artifact the access-audit and residency map both read from (rule 4). It is
**incomplete until** `customer_user`'s exact columns and any RDSS/AMI subject fields are confirmed.

---

## 2. Escape surfaces (the §3-rule-1 enumeration)

### 2.1 Event payloads — `AppEvent` / `events` table
**Verdict: STRUCTURALLY SAFE today, AT RISK by design.**

- `AppEvent` columns: `payload` (TEXT), `oldValue`, `newValue`, `fieldName`, `actorId`,
  `aggregateId`, `workspaceId`. `actorId`/`aggregateId` are ids (tokens) — good.
- `EventService.recordInWorkspace(...)` / `record(...)` serialize whatever `Map` the caller passes.
  Callers checked (e.g. `CommentService` line 86) pass **only ids** today (`commentId`,
  `workspaceId`) — safe.
- **The risk:** `recordDiff(aggregateId, type, actor, fieldName, oldValue, newValue)` writes
  `oldValue`/`newValue` **verbatim** into the append-only, never-deleted `events` table. The moment
  any caller diffs a PII field (e.g. a user changing their email/full name, or a stakeholder edit),
  raw PII lands permanently in the immutable log — the exact thing crypto-shredding exists to
  prevent. **No code stops this today; there is no `no-PII-in-events` guardrail yet** (RB-40 §3
  rule 1 says it is added "once the PII field inventory exists" — this doc is that trigger).

**Design requirement:** field-diffs on inventoried PII fields must store the **vault token**, not
the value; `recordDiff` (or a PII-aware wrapper) must reject/redact inventoried fields. Add the
`guardrails.sh` `no-PII-in-events` tripwire keyed off §1's inventory.

### 2.2 Read-model projections / DTOs
**Verdict: CARRIES RAW PII TODAY (multiple).**

- `comments.author_name` and `article_comments.author_name` are **persisted projections** of
  `users.full_name` (`CommentService` lines 56/84; `CommentController` lines 65/98;
  `ArticleCommentController` lines 75/91/110). These are stored copies of a PII field living
  *outside* the vault, and they would survive crypto-shred of the user's vault key — violating
  rule 3 (projections must be re-derivable from tokenized events alone) and rule 1.
- `Notification.message` persists actor full name + comment text (`CommentController` line 123,
  `CommentService` line 120: `actorName + " mentioned you…"`; watcher messages line 137). Stored
  PII in a long-lived table.
- `Stakeholder` is a full PII projection surface in its own right (name/email/org/notes) with no
  vault involvement at all.

**Design requirement:** denormalized name columns become **render-time joins/tokens**; rebuild a
projection after erasure must yield `[erased]`, never the old name. `Notification.message` should
store a template + token refs, resolved at read time.

### 2.3 Log lines
**Verdict: CARRIES RAW PII TODAY (email addresses).**

- `EmailService` logs the recipient address: `log.info("[EMAIL] Sent '{}' to {}", subject, toEmail)`
  and the warn path (lines 145/148).
- `DailyDigestScheduler` logs the address (lines 78/80) and builds a digest **body** that embeds
  `fullName` + every notification message (lines 62–66) — names + free text in plaintext email and
  potentially in logs if the body is ever logged.
- `ArticleEmailService` logs the destination `to` (lines 39/41).
- RB-10 §9 already says "no secrets or PII in logs" — these `to`-address log lines violate it.
  (`EncryptionService`/`KeyRotationService` correctly keep key material out of logs.)

**Design requirement:** log the **user id / token**, never the address; if an address must be
correlated, log a hash. This is a review gate until a log-scrubbing appender exists.

### 2.4 Search indexes
**Verdict: AT RISK (today: limited).**

- `ArticleSearchResult` (the article search projection) carries only `title`/`excerpt`/ids — article
  *content* excerpts (`ts_headline`) could contain PII a human typed into an article, but no
  structured user PII is indexed.
- **The gap:** there is no full-text index over users/stakeholders today, but any future
  "search people / mentions / assignees" feature would index `full_name`/`email` directly. The
  Postgres `ts_vector` / `ts_headline` path bypasses the vault entirely.

**Design requirement:** never build a search index over inventoried PII columns; index tokens +
a per-workspace display map that is itself erasable, or exclude PII from the index.

### 2.5 AI prompts — AI Control Plane redaction (`AiControlPlaneService`)
**Verdict: AT RISK — redaction is incomplete and bypassable.**

- `AiControlPlaneService.redact()` exists and strips email + phone **regexes** — but:
  1. It is applied **only to `call.prompt()`** (line 207). It is **not** applied to `call.draft()`
     (the deterministic candidate) nor to the **cached `response`** stored in `ai_cache_entries`.
  2. `AiAssistService.triage()` puts an **assignee full name** into the `draft`
     (lines 125–132: `", assignee " + assigneeName`) and `route()` puts **team names** into the
     draft/response — full names are **not** caught by the email/phone regexes, so name-PII reaches
     the provider and the cache unredacted.
  3. The cache (`AiCacheEntry.response`, TEXT) persists model output that can contain the names
     above, in a workspace-scoped but **un-shredded** table that survives erasure (violates rule 3).
- Good: `AiInvocation` audit row stores only `promptChars` (a count), not the prompt — that audit
  surface is clean. `AiAgentStep.resultSummary` and `DeterministicAiProvider` (offline, no egress)
  should still be confirmed against the inventory.

**Design requirement:** (a) redact `draft` and any text destined for the provider, not just
`prompt`; (b) name-aware redaction (tokenize known subject names before egress), since regexes miss
names; (c) do **not** cache responses that contain PII, or key the cache so erasure purges them;
(d) the redaction seam must be the single choke point for *every* provider call.

### 2.6 Exports / reports
**Verdict: CARRIES RAW PII TODAY (by design, but two leaks).**

- `DataPrivacyService.export()` is *supposed* to emit PII (it is the GDPR/DPDP portability export) —
  email + full name in the payload is legitimate **in the response**. **But** it also **persists**
  that payload: `r.setResultSummary(toJson(data))` (line 60) writes email + full name into the
  stored `DataSubjectRequest` row — a durable copy of PII outside the vault, created by the very
  feature meant to honour erasure. After the subject is erased, this stored export still holds their
  raw PII (violates rules 1 and 3).
- Work-item / SLA reports (`ReportService`, `ExportService`, `ReportDeliveryScheduler`) embed
  assignee/owner **names** when rendering — those names are PII read from `users.full_name`. Exports
  are files that leave the trust boundary; once a subject is erased, previously generated export
  files/rows still carry their name.

**Design requirement:** the portability export may *return* PII but must not **store** it (store a
token reference or a short-lived artifact with a retention window ≤ the erasure SLA); report
renderers resolve names at render time from the vault so an erased subject renders `[erased]`.

### 2.7 Email
**Verdict: CARRIES RAW PII TODAY (intrinsic + body leakage).**

- Email is intrinsically a PII egress channel (the `To:` address). Acceptable *as a channel*, but:
  - `EmailService` bodies embed `actorName`/`fullName`, comment snippets, item titles (assignment,
    comment, mention, SLA, verification, password-reset, subscription mails).
  - `DailyDigestScheduler` body embeds `fullName` + every notification message.
- The leak is not "we send email" — it's that bodies are assembled from raw `users.full_name` and
  free-text rather than from vault-resolved values, and addresses are logged (see 2.3).

**Design requirement:** resolve recipient address + display name from the vault at send time;
suppress/skip sends for erased subjects (their key is gone → no address to resolve); never log the
body or the address.

### 2.8 (Found while mapping) Immutable security audit chain — `SecurityAuditLogService` / `audit_log_entries`
**Verdict: CARRIES RAW PII TODAY — highest severity, because the table is intentionally un-erasable.**

- This hash-chained table blocks UPDATE/DELETE at the DB (V52 trigger) and is verified by
  `AuditHashChain` — by design it can **never** be erased or rewritten.
- `DataPrivacyService.export()` writes **`"GDPR/DPDP data export for " + user.getEmail()`** into the
  chain `detail` (line 63) — a **raw email permanently embedded in an un-shreddable structure.**
  This is the direct analogue of the audit/erasure conflict RB-40 §3 set out to solve, reappearing
  in the *security* audit chain rather than the domain `events` log.
- `SecurityAuditLogService.record(...)` also persists **`ipAddress`** and `userAgent` raw — an IP is
  PII under GDPR/DPDP, stored in the immutable chain.
- Good: `DataPrivacyService.erase()` is careful — it writes only the subject **id** + a generic
  message, and `base(...)` nulls `subjectEmail` for erasure requests. So the erase path is clean;
  the **export** path is the leak.

**Design requirement:** the security audit chain must reference subjects by **id/token only**
(never raw email); IP/userAgent must be tokenized or hashed (or stored in an erasable side table the
chain references by token) so that key destruction also renders them unrecoverable. Audit the chain
write-sites against the §1 inventory.

---

## 3. Summary verdict table

| # | Surface | Carries raw PII today? | Worst offender |
|---|---------|------------------------|----------------|
| 2.1 | Event payloads (`events`/`AppEvent`) | No (ids only) — **at risk via `recordDiff`** | `recordDiff` writes old/new value verbatim into immutable log |
| 2.2 | Read-model projections / DTOs | **YES** | `comments.author_name`, `Notification.message`, whole `Stakeholder` entity |
| 2.3 | Log lines | **YES** | `EmailService` / `DailyDigestScheduler` log recipient email |
| 2.4 | Search indexes | No (today) — **at risk** | future people/mention search over `full_name`/`email` |
| 2.5 | AI prompts (Control Plane redaction) | **YES (partial)** | `redact()` skips `draft` + cache; names not caught by regex |
| 2.6 | Exports / reports | **YES** | `DataPrivacyService` persists export payload; reports embed names |
| 2.7 | Email | **YES (intrinsic + body)** | bodies built from raw `full_name`; addresses logged |
| 2.8 | Security audit chain (`audit_log_entries`) | **YES (un-erasable)** | export writes raw email into hash-chained immutable table; raw IP stored |

**Cleanest surfaces today:** `AiInvocation` (counts only), the `erase()` path, `EncryptionService` /
`KeyRotationService` (no key material in logs), event payloads from current callers (ids only).

**The two findings that most directly break RB-40 §3:**
1. **§2.8** — raw email + raw IP in the intentionally-immutable security audit chain (un-shreddable).
2. **§2.5** — AI redaction covers only `prompt`, not `draft`/cache, and misses names entirely.

---

## 4. Net design implications (for the iterations 7–9 build, not this doc)

1. Wire the vault: move `users`/`stakeholder`/`customer_user` PII into `PiiVaultEntry`, leave a
   `subjectId` token on the source rows.
2. Make every surface above **token-in, render-at-read-out**: projections, notifications, emails,
   reports resolve display values from the vault at read time so erasure (key destroy) cascades.
3. Single redaction choke point in the AI path covering prompt + draft + anything cached; add
   name-aware tokenization; stop caching PII-bearing responses.
4. Stop persisting PII in the portability export row and in the security audit `detail`/`ipAddress`;
   reference by token, keep IP/UA in an erasable side table.
5. Add the `guardrails.sh` `no-PII-in-events` tripwire (and an audit-chain variant) keyed off the
   §1 inventory — the enforcement RB-40 §3 rule 1 promised once the inventory exists.
6. Validate the inventory (§1) + residency map with legal/DPO before any of the above ships.
