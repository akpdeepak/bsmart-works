# bSmart Works — Master Completion Roadmap & Coverage Ledger

> **Purpose.** This is the single, authoritative tracker for completing the **entire** scope of bSmart
> Works end to end — every transformation EPIC, every V1.6 requirement, every cross-cutting governance
> gap, every refactor, and the previously-superseded stack/infra items that are now explicitly back in
> scope. It exists so that **nothing is skipped, missed, or ignored.** If a unit of work is not a row
> in this ledger marked ✅ **Verified**, it is not done.
>
> Owner: Deepak Pandey · Created: 2026-06-20 (Phase 0) · Status source of truth for the completion program.
> Supersedes the per-EPIC "Completed" claims in `ROADMAP-STATE.md` where they disagree (see §Verified-status note).

---

## 0. Scope decision (2026-06-20)

Deepak directed **maximal scope: complete literally everything, including items previously decided
out** by `ai-rules/SOURCE-OF-TRUTH.md` §4. This **reverses** those documented decisions. The reversal
is recorded in the SOURCE-OF-TRUTH ledger as part of Phase 0. Items now back **in** scope:

- **SAML / OAuth2 login SSO** (in addition to the existing JWT + MFA + WebAuthn + SCIM).
- **Native iOS (Swift) + Android (Kotlin) apps** (in addition to the existing PWA).
- **jOOQ** as a typed-query layer alongside JPA/Hibernate.
- **Message broker** (Kafka / RabbitMQ / SQS) for the event backbone, beyond in-process events + outbox.
- **Target cloud infrastructure**: AWS (ECS/EKS, RDS Multi-AZ, ElastiCache, S3, CloudFront, Secrets
  Manager, ECR), Terraform IaC, OpenTelemetry → CloudWatch/Grafana/Prometheus.

> These are large, decision-class additions. Each gets its own EPIC plan and an explicit Deepak
> checkpoint before code (RB-05 "Large/risky" lane). They do not jump ahead of Phase 1 governance work.

---

## 0.1 Critical findings (discovered during Phase 0)

| # | Finding | Impact | Action |
|---|---------|--------|--------|
| **CF-1** | **The entire `.github/` directory was deleted on `main`** (final commit "Delete .github directory") — **all CI workflows** (`ci.yml`, `deploy.yml`, `e2e.yml`, `load-test.yml`), PR/issue templates, CODEOWNERS, dependabot, copilot instructions are gone. `git ls-tree HEAD .github` = 0 files. | **There is no CI gate.** The roadmap's "merge only when CI-green," the DoD, and every rulebook/SECURITY claim of "the CI gate that blocks merge" are currently non-operational. Branch protection without CI = no automated quality enforcement. | **Decision needed (Deepak):** was this deliberate or an accidental over-delete in the doc-cleanup sweep? If accidental → restore `.github/` from the last commit that had it. Tracked as the first item of Phase 1. |
| **CF-2** | **AI-rules generator drift:** `scripts/generate-ai-rules.mjs` still targets `.github/copilot-instructions.md` + `.github/instructions/*`, which no longer exist on `main`. Running it re-creates deleted files; `--check` would report perpetual drift. | Generator output is inconsistent with the repo; the doc-sync gate can't pass cleanly. | Either update the generator to drop `.github` targets, or restore `.github` (CF-1). Resolve together with CF-1. |

> These are pre-existing conditions in the pulled `main`, surfaced by Phase 0 — not introduced by this work.

## 1. The Definition of Done (the bar every row is held to)

A unit is ✅ **Verified** only when **all** of the following are true:

1. Acceptance criteria met; happy / edge / error / empty / **unauthorized** / **cross-tenant** scenarios covered.
2. Behavior proven by a test **and** by the running app (fresh-DB boot, not just green CI).
3. Tenant-scoped + RBAC-enforced in the service layer; field-level security applied where relevant.
4. Design tokens (no literals); all five interactive states; **WCAG 2.2 AA**; **i18n-externalized**.
5. Within the NFR budget (RB-40 §5) on hot paths, proven by a perf/load check.
6. Docs reconciled (no overclaim); completion note written; this ledger updated.
7. Merged on remote `main`, CI-green, and **adversarially re-verified** (an independent check that the
   claim matches the code — guards against the "rename/marker/draft-helper marked Completed" failure).

**Status vocabulary:** ⚪ Not started · 🟠 Partial (with %) · 🟡 In progress · 🔴 Faked/overclaimed (claimed done, code thin) · ✅ Verified.

---

## 2. Workstream coverage map (the master index)

| WS | Workstream | Scope summary | Today | Phase |
|----|-----------|----------------|------:|-------|
| **W0** | Truth & control plane | Reconcile overclaiming docs; this ledger; SOURCE-OF-TRUTH reversal | 🟡 in progress | 0 |
| **W1** | Governance & security closure | #243 central tenant filter, field-level security enforcement, PII vault + crypto-shred, BYOK/KMS, WebAuthn attestation, distributed rate-limit, JWT revocation, SOC2/ISO evidence | ✅ Verified 2026-06-21 (PRs #415–#441; deferred sub-items in §4) | 1 |
| **W2** | Architecture refactors | EPIC-3 real modularization, EPIC-4 real AppShell decomposition, god-class splits, FE code-split, AsyncBoundary adoption, token debt | ✅ Verified 2026-07-19 | 2 |
| **W3** | Finish EPICs 3–12 to full scope | Slice → full plan for each shipped EPIC | 🟡 in progress; EPICs 3–6 verified | 3 |
| **W4** | EPICs 13–27 — elevation | Premium/AI-native reframe over existing capabilities | ⚪ 0% | 5 |
| **W5** | EPICs 13–27 — net-new builds | Answer Engine, Canvas, People Graph/Skills, onboarding, analytics, DX | ⚪ 0% | 5 |
| **W6** | V1.6 overlay | Framework engine, 5 user types, operating model, team-key IDs, inline BQL, query boards, Messenger, profile, brand system, premium states, AI coach | 🟠 ~5% | 4 |
| **W7** | Quality / test / NFR bar | Coverage gate scope+floor, FE coverage, E2E, load tests, a11y breadth, i18n completion | 🟠 ~25–40% | 6 (continuous) |
| **W8** | Infra target-state | AWS + Terraform + OTel + message broker | ⚪ 0% | 7 |
| **W9** | Now-in-scope superseded items | SAML SSO, native iOS/Android, jOOQ, broker (W8 owns broker) | ⚪ 0% | 5–7 |

---

## 3. Transformation EPIC ledger (00–27) — verified status

> **Verified-status note.** The 2026-06-20 audit found EPICs 3–12 were partial first slices. The
> 2026-07-19 codebase closeout re-verified EPICs 1–5 from production source and executable gates;
> EPICs 7–12 remain partial until separately closed.

| EPIC | Title | Ledger | **Verified** | Underlying capability | DoD gap to close |
|------|-------|--------|--------------|----------------------|------------------|
| 0 | Hardening / Truth / Baseline | Completed | ✅ ~95% | n/a | residual doc drift (this phase) |
| 1 | Tenant & RBAC hardening | Completed | ✅ Verified 2026-07-19 | built | — |
| 2 | Prod config & secrets | Completed | ✅ Verified 2026-07-19 | n/a | — |
| 25p | Quality gates (partial) | Completed | ✅ (partial scope) | n/a | full W7 bar |
| 3 | Backend modularization | Completed | ✅ Verified 2026-07-19 | 14 populated modules | — |
| 4 | Frontend architecture refactor | Completed | ✅ Verified 2026-07-19 | 5-line entry; 2,884-line guarded shell | — |
| 5 | Premium design system | Completed | ✅ Verified 2026-07-19 | token/state/theme/density system | W7 owns exhaustive product QA |
| 6 | Simplified navigation | Completed | ✅ Verified 2026-07-19 | built | — |
| 7 | bSmart Today | Completed | 🟠 ~35% | dashboards built | act/snooze/dismiss flows |
| 8 | Smart Inbox | Completed | 🟠 ~35% | notifications built | act/convert/snooze flows |
| 9 | Connect Messaging | Completed | 🔴 ~10% | Messenger absent | full Messenger domain (W6) |
| 10 | Work-item experience | Completed | 🟠 ~20% | core built | premium redesign + right panel |
| 11 | Project command center | Completed | 🟠 ~25% | projects built | dedicated command surface |
| 12 | DevSync intelligence | Completed | 🟠 ~25% | dev workspace built | raw event ingestion + flow |
| 13 | Universal AI Command | Not started | ⚪ 0% | ~75% (Cap P + AI plane) | NL command across app |
| 14 | Answer Engine | Not started | ⚪ 0% | ~40% (KB answer exists) | RAG answer surface |
| 15 | Canvas / AI artifacts | Not started | ⚪ 0% | ~25% | generative canvas |
| 16 | Knowledge & Doc Workspace | Not started | ⚪ 0% | ~95% (deepest) | premium knowledge flows |
| 17 | Service Desk & Resolution | Not started | ⚪ 0% | ~90% | outcome-focused reframe |
| 18 | SLA / Compliance / Evidence | Not started | ⚪ 0% | ~90% | governance posture surface |
| 19 | Automation Builder + Agents | Not started | ⚪ 0% | ~80% | builder UX + agent flows |
| 20 | Reports / Dashboards / BQL / Leadership | Not started | ⚪ 0% | ~90% | inline BQL + query boards (W6) |
| 21 | Integrations / Migration / APIs | Not started | ⚪ 0% | ~70% | migration tooling + API surface |
| 22 | People Graph / Skills / Stakeholders | Not started | ⚪ 0% | ~30% (skills/graph absent) | people graph + skills (W5) |
| 23 | Onboarding / Templates / Adoption | Not started | ⚪ 0% | ~35% | team-first onboarding (W5/W6) |
| 24 | Mobile / PWA / Offline / Realtime | Not started | ⚪ 0% | ~80% | smoothness + reflow + native (W9) |
| 26 | Product Analytics / Feedback | Not started | ⚪ 0% | ~30% | analytics + engagement hooks |
| 27 | Developer Experience / Agent-Ready | Not started | ⚪ 0% | ~55% | DX + modular-monolith APIs |

---

## 4. W1 — Governance & security closure checklist (risk-first, Phase 1)

| Item | Status | DoD |
|------|-------:|-----|
| #243 central Hibernate tenant filter on all ~150 entities | ✅ Verified (2026-06-21 — PRs #415, #426, #431, #432, #436) | `@Filter` on 136 entities (114 direct + 22 transitive subquery); central binding at the RBAC choke point behind `tenant.filter.binding.enabled` (default off, canary-first); findById/PK ownership re-checks; `TenantFilterCoverageTest` + `CrossTenantPkLoadAccessTest` + cross-tenant ITs. *Deferred:* Slice E CONTRACT removal of the redundant per-query predicates — kept as defence-in-depth until the binding soaks. |
| Field-level security **enforcement** (response filtering per-field/role) | ✅ Verified (2026-06-21 — PRs #416, #427, #430) | read redaction at `WorkItemReadService` + write guard + BQL HIDDEN-field exclusion (inference leak closed) + resolver tests + `manage_permissions` guard + FK index (V116). *Deferred by Deepak 2026-06-21:* Slice 4 (seed demo visibility rules / admin rule UI) + Slice 5 (core-column FLS — new data-model mechanism, design-first). |
| PII vault + crypto-shredding (tokenize User PII, key-per-subject) | ✅ Verified (2026-06-21 — PRs #418–#423; V110–V114) | user/customer/stakeholder identity vault, email blind index, denorm tokenization, tenant-declared PII custom fields, name-free notifications, machine-enforced no-raw-PII-in-events; erase = crypto-shred. *Deferred:* the CONTRACT column-drop of superseded raw columns. |
| BYOK / KMS (`AwsKmsProvider`) | ✅ Verified (2026-06-21 — PR #424) | real AWS KMS envelope encryption (per-subject DEK wrapping), LocalStack-validated; BYOK-ready provider replaces the throwing stub. |
| WebAuthn attestation + origin binding | ✅ Verified (2026-06-21 — PRs #438–#441, WA1–WA4) | real FIDO2 via webauthn4j 0.31.7: attestation + clientData(type/origin/challenge) + rpIdHash verified, counter-regression clone detection, `navigator.credentials` frontend, legacy signed-nonce path removed (V119). *Deferred:* the `public_key_pem` CONTRACT column-drop. |
| Distributed rate limiting + JWT revocation | ✅ Verified (2026-06-21 — PRs #429, #433, #434, #435) | token-version revocation incl. customer-portal parity (V115) + logout/jti blocklist (V117) + DB-backed cross-instance window store behind `app.rate-limit.distributed` (default off; V118) + write-endpoint limits. *Deferred:* Redis/ElastiCache-backed store → the AWS infra EPIC (W8). |
| SOC2 / ISO 27001 control evidence reconciled to code | ✅ Verified (2026-06-21 — PR #436) | `docs/compliance/CONTROL-MATRIX.md` maps each SOC2 CC / ISO Annex A control → implementing code → the test/guardrail that proves it. |

> **W1 status (2026-06-21): Phase 1 COMPLETE.** All seven rows verified and merged to remote `main`
> across PRs **#415–#441** (see `epics/W1-PHASE1-COMPLETION-PLAN.md` and the `EPIC-P1-*` docs for the
> per-slice verification detail). Flyway high-water: **V119**.
>
> **Explicitly deferred sub-items (by design, tracked — not open gaps):**
> - **#243 Slice E** — CONTRACT removal of the redundant per-query tenant predicates (defence-in-depth
>   until `tenant.filter.binding.enabled` soaks in canary).
> - **FLS Slice 4** (seed visibility rules / admin rule UI) + **FLS Slice 5** (core-column FLS) —
>   deferred by Deepak, 2026-06-21.
> - **PII vault** — CONTRACT drop of superseded raw columns.
> - **WebAuthn** — `webauthn_credentials.public_key_pem` CONTRACT column-drop.
> - **Redis-backed distributed rate limit** — deferred to the AWS infra EPIC (W8); the DB-backed store
>   covers horizontal scale until then.
>
> **Default-off flags awaiting canary enablement:** `tenant.filter.binding.enabled` (central tenant-filter
> binding; per-query predicates remain the enforcing layer until flipped) and `app.rate-limit.distributed`
> (DB-backed shared rate-limit store).

## 5. W2 — Architecture refactor checklist (Phase 2)

| Item | Evidence today (2026-07-19) | DoD |
|------|----------------|-----|
| Split flat `com.bcits.works` into domain modules | ✅ 14 modules populated; flat root reduced 291→72 source files; ArchUnit cycle/kernel/non-vacuity/root-budget gates | enforced module boundaries (ArchUnit), classes moved |
| Decompose `AppShell.jsx` | ✅ 4,628→2,884; providers, auth, public routes, shortcuts, `RouteOutlet`, feature state, workspace membership, navigation, overlays, and realtime extracted; architecture ceiling 3,000 | router + providers + overlays + feature-state extracted |
| God classes: `KpiService` 716, `BqlCompiler` 650, `ArticleController` 630, `WorkItemCommandService` 559 | ✅ **all four split & merged** — PRs #446 (Article), #447 (Kpi), #448 (Bql Parser/Emitter), #449 (WorkItemFieldCopier) | each within size/responsibility budget |
| FE monoliths: `locales.js` 4,426, `BlockEditor.jsx` 2,176, `knowledge-view.jsx` 1,828 | ✅ `locales.js` code-split by language (PR #451); `BlockEditor` + 6 knowledge overlays lazy (PR #452, initial JS −13.6%); production build and bundle gate enforce the boundary | code-split; lazy-loaded |
| Adopt `AsyncBoundary`; retire hand-rolled states | ✅ common boundary used across primary list/table, console, PM, Compliance, Service, marketplace and support surfaces | all primary async surfaces use it |
| Token and structure debt | ✅ raw hex tokenized; legacy override removed; all view-structure rules are errors | zero literals; legacy block removed |

The EPIC 1–5 closeout evidence is recorded in
`docs/implementation/epics/EPICS-01-05-CODE-VERIFICATION.md` and enforced by
`scripts/epics-01-05-completion.mjs`.

## 6. W6 — V1.6 overlay checklist (Phase 4 foundation, then continuous)

| Item | Status | Maps to EPIC |
|------|-------:|--------------|
| Framework engine (Scrum/Kanban/Waterfall/Lean/DSDM/XP) | ⚪ 0% (0 files) | 6/10/23 |
| 5 business user types (Individual/Team Lead/Management/Admin/Owner) | ⚪ 0% (only RBAC tiers) | 1/6/22 |
| Admin/Owner operating-model configurability | ⚪ 0% | 6/22 |
| Team-key display IDs (e.g. `PLAT-42`) | ⚪ 0% | 10/22/23 |
| Inline BQL filters + dynamic query boards | ⚪ 0% | 20/10 |
| **bSmart Messenger** (work-context, separate from support chat) + message→artifact | 🔴 ~10% (draft helper) | 9/13/14 |
| Profile / preference center | ⚪ 0% | 22 |
| Brand-placement system (shell/onboarding/portal/reports/exports/email/PWA) | ⚪ 0% | 5/22 |
| Premium microcopy / next-best-action / guided states | 🟠 partial | 5 + continuous |
| AI work coach + executive brief (fallback + policy) | ⚪ 0% (0 files) | 13/14/15/20 |
| Performance / observability / pagination / caching / virtualization / indexes | 🟠 partial | 24/25/27 |

## 7. W7 — Quality / test / NFR bar (continuous + Phase 6 closure)

| Item | Today | DoD |
|------|------|-----|
| JaCoCo scope + floor | 0.60 line, **excludes controllers/services/repos** | include them; raise floor |
| Frontend coverage threshold | none | enforced vitest threshold |
| E2E suite (Playwright) | 1 spec / 3 tests | real journeys across modes |
| Load testing vs P50/P95/P99 | none (micro-guards only) | k6/Gatling in CI on hot paths |
| Accessibility breadth | ~40% (Insights only) | axe on all surfaces + manual SR/KBD/RTL passes |
| i18n adoption | ~8% wired (catalogue 100%) | externalize ~80% remaining + native-speaker review |

## 8. W8 / W9 — Infra & now-in-scope superseded items (Phases 5–7)

| Item | Status | EPIC / notes |
|------|-------:|--------------|
| AWS target topology (ECS/RDS/ElastiCache/S3/CloudFront/Secrets/ECR) | ⚪ 0% | new infra EPIC; Deepak checkpoint |
| Terraform IaC | ⚪ 0% | new infra EPIC |
| OpenTelemetry → CloudWatch/Grafana/Prometheus | ⚪ 0% | observability EPIC |
| Message broker (Kafka/RabbitMQ/SQS) | ⚪ 0% | event-backbone EPIC; reverses ADR-0001 in-process default |
| SAML / OAuth2 login SSO | ⚪ 0% | identity EPIC; reverses ledger |
| Native iOS (Swift) + Android (Kotlin) | ⚪ 0% | separate platform repos; reverses ledger (PWA-only) |
| jOOQ typed-query layer | ⚪ 0% | persistence EPIC; reverses ledger (JPA-only) |

---

## 9. Phase plan (execution order)

| Phase | Goal | Workstreams | Exit criteria |
|-------|------|-------------|---------------|
| **0** | Truth & coverage spine | W0 | docs reconciled; this ledger live; SOURCE-OF-TRUTH reversal recorded |
| **1** | Governance & security closure (risk-first) | W1 | #243 + field-security + PII vault verified; no fragile isolation |
| **2** | Structural refactors (unblock) | W2 | real module split + AppShell decomposition; god classes within budget |
| **3** | Consolidate EPICs 3–12 to full scope | W3 | each EPIC meets its full plan + DoD |
| **4** | V1.6 foundational reframe | W6 core | frameworks, user types, operating model, team keys, brand, states |
| **5** | EPICs 13–27 (elevation then new builds) + SSO/native/jOOQ | W4, W5, W9 | each a full gated EPIC |
| **6** | Quality / NFR / E2E / a11y / i18n closure | W7 | gates meaningful; budgets proven; coverage complete |
| **7** | Infra target-state + broker + OTel | W8 | AWS/Terraform/OTel/broker live; deploy verified |
| **8** | End-to-end certification & release | all | SOC2/ISO evidence; full-system verify; tagged release |

Per-EPIC quality, security, a11y, and i18n are **not** deferred to Phase 6 — they are part of every
EPIC's DoD. Phase 6 is the dedicated closure sweep for anything systemic.

---

## 10. How completion is driven (the engine)

1. **This ledger is law** — every row flips to ✅ only when its DoD is met and adversarially verified.
2. **Per-EPIC gated loop (RB-05)**: Orient → Plan → Build → Verify → PR → CI-green → squash-merge →
   confirm on remote `main` → completion note → ledger update. One scope at a time.
3. **Multi-agent orchestration per EPIC**: parallel discovery → plan → parallel build in isolated
   worktrees → adversarial verification → synthesis.
4. **Verification depth**: compile → unit → Testcontainers → fresh-DB boot → E2E → load → tenant/RBAC
   → manual a11y. Behavior proven in the running app.
5. **Anti-overclaim guard**: independent reviewer + spec→code→test coverage matrix on every "done."
6. **Durable resume**: `ROADMAP-STATE.md` for cross-session continuity; trust code/GitHub over stale state.
7. **Human gates**: protected-`main` merges, tags, deploys, and any data-model/security/tenant/RBAC
   decision require Deepak's sign-off.

---

## 11. Change log
- 2026-06-20 — Phase 0: ledger created; scope set to maximal (incl. superseded items); EPIC 3–12
  verified status recorded; doc reconciliation (SECURITY.md, ROADMAP-STATE.md, ORCHESTRATOR §6,
  SOURCE-OF-TRUTH) in progress.
- 2026-07-02 — W1 reconciliation: Phase 1 / W1 completed and merged 2026-06-21 (PRs #415–#441;
  Flyway high-water V119) but this ledger still showed pre-execution statuses. §4 rows flipped to
  ✅ Verified with per-row merged-PR notes; explicitly deferred sub-items and the two default-off
  flags (`tenant.filter.binding.enabled`, `app.rate-limit.distributed`) recorded; §2 W1 row updated.
