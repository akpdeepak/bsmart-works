# W1 — Phase-1 Governance & Security Closure — Completion Plan

> **Resume artifact** for completing Phase 1 (workstream W1). Produced by a 5-agent discovery
> workflow (2026-06-21) that read the actual code, then a synthesis pass. **Code is canonical; the
> roadmap status numbers were badly stale** — corrected below. The PII-vault EPIC (the other big W1
> item) is already COMPLETE on `main` (PRs #418–#424; see `EPIC-P1-pii-vault-*`), except the deferred
> CONTRACT. This doc covers the **5 remaining W1 items**.
>
> Owner: Deepak Pandey. Execution model: one item at a time, gated per RB-05, each slice its own
> CI-green PR, auto-merge authorized. Migrations start at **V115** (V114 is high-water; `mvn clean`
> first to avoid stale-target phantom failures).

---

## 0. Two corrections to the roadmap (verify-before-recommend)

1. **CI is operational — CF-1 is already fixed.** `MASTER-COMPLETION-ROADMAP.md` CF-1 says the entire
   `.github/` CI set was deleted and "merge-green is non-operational." That was the *pre–Phase-0*
   state. Phase 0 (PR #407) restored `.github`/CI, and this session merged **6 PRs (#419–#424) each
   with all ~18 CI checks green**. So CI gating works; the discovery synthesis's "restore CI first"
   prerequisite is **already satisfied**. (Still worth a doc fix in MASTER §CF-1.)
2. **W1 is far more complete than the roadmap claims.** Verified-from-code completion vs the stale
   `MASTER §4` / `ROADMAP-STATE` numbers:

| W1 item | Roadmap says | Actual (code-verified) |
|---|---|---|
| #243 central tenant filter | 🟠 ~10% (Project only) | **~70%** — infra built, **115/146 entities @Filter'd**, cross-tenant IT green; gaps = runtime binding + transitive entities |
| Field-level security | 🟠 ~20% (defined, not applied) | **~70%** — Slice 1 merged (PR #416); gaps = BQL inference leak, tests, seed, core-column design |
| WebAuthn attestation + origin binding | 🟠 partial | **~30%** — hand-rolled signed-nonce; real WebAuthn not built |
| Distributed rate-limit + JWT revocation | 🟠 per-instance | **~10%** — in-memory limiter; **zero** JWT revocation |
| SOC2/ISO control-evidence | 🟠 docs-only | discovery agent failed — **re-map next session** |

> **Action for next session:** reconcile the stale status in `MASTER-COMPLETION-ROADMAP §4`,
> `ROADMAP-STATE.md`, `EPIC-P1-243-central-tenant-filter.md`, and the `guardrails.sh`/`CLAUDE.md §4`
> comments to the code reality (this is #243 "Slice F" + general doc drift). Low-risk chore.

---

## 1. Recommended order (risk-first) + the acute-risk tranche

Catastrophic→least: cross-tenant leakage > silent field exposure > broken auth survivability.

**TRANCHE 1 — "stop the bleeding" (do first, strictly sequenced, ~3 PRs):**
1. **#243 Slice A — activate tenant-filter binding app-wide.** THE single most dangerous gap: the
   `@Filter` annotations are **dormant** on every non-`Project` read path (binding is wired only into
   `ProjectService`), so isolation today rests entirely on 88 hand-written predicates with **no central
   backstop**. One missing predicate = a live cross-tenant leak.
2. **FLS Slice 2 — close the BQL HIDDEN-field inference leak.** A *live, unguarded* exfil channel:
   `BqlCompiler` wraps custom-field predicates in `EXISTS(...)` with no HIDDEN check, so a low-tier user
   can binary-search a HIDDEN value (e.g. `salary>X`). Small, contained, active leak.
3. **Rate-limit/JWT PR1 — token-version revocation.** Erasure / password-reset / GDPR-erase currently
   leave JWTs valid up to 7 days. No new infra; small; high compliance value.

**TRANCHE 2 — coverage + hardening (can parallelize after tranche 1 is green, ~14 PRs):**
4. #243 Slices B–F, FLS Slices 3–4, rate-limit PR2–4.
5. **WebAuthn (last)** — ~30%/L, new dependency + schema, but the existing ceremony is *functional*
   with MFA/password fallback, so it's a hardening upgrade, not an open leak.
6. **SOC2/ISO evidence** — re-map, then author the control→code/test matrix (likely one docs PR).

---

## 2. Per-item slicing (PR-sized)

### #243 — Central Hibernate tenant filter (XL) — flag-gate binding behind `tenant.filter.binding.enabled`
- **A (CRITICAL, flag-gated, default-off, canary-first):** one central bind point (HandlerInterceptor /
  base-service / arg-resolver) that resolves+authorizes the request workspace and calls
  `CurrentWorkspace.bind()`, replacing `ProjectService`-only binding. Ship an end-to-end IT proving a
  real WorkItem-list read is filter-isolated **with per-query predicates removed in the test path**.
  **Smoke-test the full ~50-site escape-hatch inventory** (login/signup/reset, customer portal,
  public article/dashboard, SCIM, MFA, OAuth callback, 6 schedulers, PII services) before enabling.
- **B:** transitive `@Filter` (subquery condition) for knowledge+collab domain
  (Article/ArticleComment/ArticleVersion/Comment/MeetingNote/DashboardWidget); extend
  `TenantFilterCoverageTest` to detect+enforce transitive scoping.
- **C:** transitive `@Filter` for delivery domain (WorkItem/WorkItemFieldValue/WorkItemLink/WorkLog/
  Sprint/Release/Workflow*/StandupEntry/RetroNote/Dod*/CrossProjectDependency/PullRequestReviewer/
  ReportSchedule/FieldVisibility) via `project_id`/`sprint_id` parent subqueries. **Perf-test the
  correlated subquery on `work_items` vs RB-40 §5 NFR budgets.**
- **D:** close the **findById/PK-load gap** — `@Filter` does NOT apply to `em.find()`/`findById()`
  (explicitly proven in `CrossTenantFilterIsolationIT:259-271`). Audit findById on tenant repos, route
  through filtered queries / ownership re-checks, add an ArchUnit guard. Small, security-critical.
- **E (CONTRACT, gated on A–D green + soak):** remove the 88 repos' redundant per-query predicates
  **predicate-by-predicate**, only where the filter fully covers the read; KEEP on
  findById/native-SQL/JdbcTemplate/BQL paths (Hibernate never sees those). Largest diff;
  irreversible-by-leak if misjudged.
- **F (chore):** doc reconciliation (see §0).

### Field-level security (M)
- **2 (S/M):** exclude HIDDEN field_defs at BQL compile (`BqlCompiler.wrap` + `BqlContextFactory`
  plumbing) + IT proving filter-inference on a HIDDEN field is blocked.
- **3 (S):** `FieldVisibilityServiceTest` (Mockito: most-restrictive-wins, fail-closed-on-write) +
  `rbac.require(manage_permissions)` on `PermissionSchemeController.setFieldVisibility` (currently
  unguarded) + index `field_visibility(field_def_id)` (forward migration).
- **4 (S):** seed demo `role_def` + `field_visibility` rows (forward-only) so enforcement is testable
  in a running app (currently empty → enforcement is a runtime no-op) — OR build the admin rule UI.
- **5 (L, design-first, ONLY if approved):** core-column FLS for sensitive built-in fields
  (assignee/severity/risk_score) — a NEW data-model mechanism (current model is field_def-only).

### Distributed rate-limit + JWT revocation (L)
- **PR1 (S):** `users.tokens_valid_after` (forward migration) + `JwtUtil` iat-check; wire bumps into
  `erase` / `changePassword` / `performReset`. **Must include CustomerUser parity** or portal tokens
  stay unrevocable.
- **PR2 (S):** `/auth/logout` + `jti` claim + `revoked_tokens` blocklist; portal logout parity.
- **PR3 (M):** pluggable distributed `RateLimiter` store — **DB `rate_limit_windows` table first (no new
  dep)** behind the unchanged `allow()/reset()` API (4 callers untouched); cross-instance IT.
- **PR4 (S):** extend rate limiting to write endpoints; fix RB-10 §8 doc drift.

### WebAuthn attestation + origin binding (L)
- **1 (M):** add WebAuthn library (yubico `webauthn-server-core` vs `webauthn4j`) + config (rpId,
  per-workspace/custom-domain origin allowlist). No behavior change.
- **2 (L):** registration ceremony — accept attestationObject/clientDataJSON; verify attestation +
  clientData(type/origin/challenge) + authData(rpIdHash/flags); store COSE key/aaguid/fmt/signCount;
  migration V-next.
- **3 (L):** assertion ceremony — verify origin + rpIdHash + flags + signature over
  `authData||SHA256(clientData)` (NOT today's raw-challenge-string) + counter-regression clone
  detection.
- **4 (M):** frontend — swap `passkey.js` from localStorage WebCrypto to `navigator.credentials.
  create/get`; send real attestation/assertion.
- **5 (M):** tamper/replay/origin/rpIdHash/counter + cross-tenant + attestation-format tests; rewrite
  `WebAuthnCryptoTest`.

### SOC2/ISO control-evidence (re-map first, then ~1 docs PR)
- Author a control matrix (SOC2 CC / ISO Annex A) mapping each control → implementing code → the
  test/guardrail that proves it (tenant isolation, vault/crypto-shred, audit chain, RBAC, FLS,
  MFA/WebAuthn, rate-limit, PII erasure, etc.).

---

## 3. OPEN DECISIONS

**MUST ASK Deepak before building:**
- **#243 Slice A sign-off** — activating central binding changes the live behavior of *every* read
  path; can over-filter (legitimate cross-tenant paths → empty/404). Epic flags this Stage-2 / Large-risky.
- **#243 Slice E (CONTRACT)** approval + the per-predicate verification bar (removing defense-in-depth).
- **Rate-limit/revocation infra:** Redis/ElastiCache vs DB-backed store vs token-version column.
  *Recommendation:* token-version column for revocation + DB `rate_limit_windows` now; Redis deferred to
  the AWS/ElastiCache infra EPIC. Redis = new dep + ops surface + SOURCE-OF-TRUTH ledger update.
- **WebAuthn library** choice (new dependency, RB-10 §12) + attestation policy (formats, AAGUID/MDS,
  origin source — interacts with V60 custom domains).
- **Core-column FLS (FLS Slice 5)** — redacting built-in columns is a new data-model/security mechanism.
- **Revocation granularity** (coarse token-version vs jti blocklist vs both); **rate-limiter behavior
  under remote-store outage** (fail-closed vs fail-open).
- Any new migration (V115+) touching the data model → Orchestrator §5 sign-off.

**REASONABLE DEFAULT — proceed, flag in PR:**
- #243 transitive entities → subquery-condition `@Filter` + extended `TenantFilterCoverageTest`.
- #243 findById → mandate filtered-query/ownership re-check + ArchUnit guard.
- FLS → add `rbac.require(manage_permissions)` to `setFieldVisibility`; add the index; accept the
  documented read-path fail-open on DB error (EPIC §3.4) as standing.
- All risky slices ship behind **feature flags**, independently mergeable + reversible.

---

## 4. Biggest risk + de-risk

**The #243 binding gap is a latent, live cross-tenant hole — and its fix (Slice A) is the change most
likely to over-filter and break legitimate flows.** De-risk: (1) ship Slice A behind
`tenant.filter.binding.enabled`, default-off, canary first; (2) smoke-test the full ~50-site escape-hatch
inventory before enabling; (3) end-to-end IT with predicates removed so the *filter* is what enforces
isolation; (4) do NOT touch Slice E until A–D are green and binding has soaked, then predicate-by-predicate.

---

## 5. Size

#243 **XL** (~6 slices) · rate-limit/JWT **L** (4 PRs) · WebAuthn **L** (5 slices) · FLS **M** (3 small +
1 optional L) · SOC2 **S–M** · doc reconciliation **S**. Aggregate ≈ **~17–18 PRs**. The acute-risk
tranche (#243-A + FLS-2 + rate-limit-PR1) is ~3 fast PRs that eliminate the live exposure; the rest is
coverage-completion + hardening that can parallelize.

---

## 6. Reference — full discovery maps

The complete per-item discovery (whatExists with file:line, blastRadius counts, risks) is preserved in
the workflow result; the key entity/file facts are inlined above. Notable verified facts:
- Tenant-filter infra (9 files): `WorkspaceFilterActivator`, `TenantContext`, `TenantScope`,
  `TenantScopeBootstrap`, `TenantFilterInterceptor`, `TenantFilterConfig`, `TenantContextCleanupFilter`,
  `CurrentWorkspace`, `package-info.java` (the single `@FilterDef`). 115/146 entities `@Filter`'d;
  10 GLOBAL_BY_DESIGN (User/Workspace/Notification/…); ~22 transitive (no workspace_id).
- FLS read choke point = `WorkItemReadService.redactHiddenFieldValues` (covers 7 read endpoints);
  write guard = `FieldDefController.requireFieldWritable`; resolver = `FieldVisibilityService`. The
  BQL leak is `BqlCompiler` EXISTS-wrap without a HIDDEN check.
- WebAuthn crypto is `WebAuthnCrypto.verify` signing the **raw challenge string** (not
  `authData||SHA256(clientDataJSON)`); no library in `pom.xml`.
- Rate limiting = `RateLimiter` in-memory `ConcurrentHashMap` (4 callers); JWT = `JwtUtil` HS256,
  7-day, no jti/revocation; no Redis in `pom.xml` or docker-compose.
